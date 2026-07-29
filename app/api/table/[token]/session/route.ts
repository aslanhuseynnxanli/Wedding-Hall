import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
    NextRequest,
    NextResponse,
} from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
    params: Promise<{
        token: string;
    }>;
}

type OrderRow = {
    id: string;
    status: string;
    customer_note: string | null;
    submitted_at: string | null;
    created_at: string;
};

type OrderItemRow = {
    id: string;
    order_id: string;
    menu_item_id: string | null;
    item_name: string;
    quantity: number;
    price: number | string;
    note: string | null;
    preparation_area: string;
    status: string;
    created_at: string;
    started_at: string | null;
    ready_at: string | null;
    served_at: string | null;
    cancelled_at: string | null;
};

type CustomerSessionRow = {
    id: string;
    session_token: string;
    dining_session_id: string;
    is_active: boolean;
};

const CUSTOMER_SESSION_COOKIE =
    "customer_session";

const ACTIVE_SESSION_STATUSES = [
    "OPEN",
    "BILL_REQUESTED",
    "BILL_READY",
    "BILL_DELIVERED",
];

function canCancelItem(status: string) {
    return status === "NEW";
}

const DEFAULT_CUSTOMER_ORDER_RADIUS_METERS = 30;
const EARTH_RADIUS_METERS = 6_371_000;

function parseCoordinate(
    value: string | null,
    minimum: number,
    maximum: number,
) {
    if (value === null || value.trim() === "") {
        return null;
    }

    const parsedValue = Number(value);

    if (
        !Number.isFinite(parsedValue) ||
        parsedValue < minimum ||
        parsedValue > maximum
    ) {
        return null;
    }

    return parsedValue;
}

function toRadians(value: number) {
    return (value * Math.PI) / 180;
}

function calculateDistanceMeters(
    firstLatitude: number,
    firstLongitude: number,
    secondLatitude: number,
    secondLongitude: number,
) {
    const latitudeDifference = toRadians(
        secondLatitude - firstLatitude,
    );

    const longitudeDifference = toRadians(
        secondLongitude - firstLongitude,
    );

    const firstLatitudeRadians =
        toRadians(firstLatitude);

    const secondLatitudeRadians =
        toRadians(secondLatitude);

    const haversineValue =
        Math.sin(latitudeDifference / 2) ** 2 +
        Math.cos(firstLatitudeRadians) *
            Math.cos(secondLatitudeRadians) *
            Math.sin(longitudeDifference / 2) ** 2;

    const centralAngle =
        2 *
        Math.atan2(
            Math.sqrt(haversineValue),
            Math.sqrt(1 - haversineValue),
        );

    return EARTH_RADIUS_METERS * centralAngle;
}

export async function GET(
    request: NextRequest,
    { params }: RouteContext,
) {
    try {
        const { token } = await params;
        const normalizedToken = token?.trim();

        if (!normalizedToken) {
            return NextResponse.json(
                {
                    error: "QR token tapılmadı.",
                },
                {
                    status: 400,
                },
            );
        }

        /*
         * 1. QR token vasitəsilə masanı tapırıq.
         */
        const {
            data: table,
            error: tableError,
        } = await supabaseAdmin
            .from("restaurant_tables")
            .select(
                `
          id,
          restaurant_id,
          hall_id,
          table_number,
          is_active
        `,
            )
            .eq("qr_token", normalizedToken)
            .eq("is_active", true)
            .maybeSingle();

        if (tableError) {
            console.error(
                "Customer session table error:",
                tableError,
            );

            return NextResponse.json(
                {
                    error: "Masa məlumatı oxunmadı.",
                },
                {
                    status: 500,
                },
            );
        }

        if (!table) {
            return NextResponse.json(
                {
                    error:
                        "Masa tapılmadı və ya aktiv deyil.",
                },
                {
                    status: 404,
                },
            );
        }

        /*
         * 2. Müştərinin koordinatlarını yoxlayırıq.
         */
        const customerLatitude = parseCoordinate(
            request.nextUrl.searchParams.get("lat"),
            -90,
            90,
        );

        const customerLongitude = parseCoordinate(
            request.nextUrl.searchParams.get("lng"),
            -180,
            180,
        );

        if (
            customerLatitude === null ||
            customerLongitude === null
        ) {
            return NextResponse.json(
                {
                    error:
                        "Menyunu açmaq üçün məkan məlumatınızı paylaşmalısınız.",
                    code: "LOCATION_REQUIRED",
                },
                {
                    status: 400,
                    headers: {
                        "Cache-Control": "no-store",
                    },
                },
            );
        }

        /*
         * 3. Restoranın koordinatlarını və icazə verilən
         * sifariş radiusunu oxuyuruq.
         */
        const {
            data: restaurant,
            error: restaurantError,
        } = await supabaseAdmin
            .from("restaurants")
            .select(
                `
          id,
          latitude,
          longitude,
          customer_order_radius_meters
        `,
            )
            .eq("id", table.restaurant_id)
            .maybeSingle();

        if (restaurantError) {
            console.error(
                "Customer restaurant location error:",
                restaurantError,
            );

            return NextResponse.json(
                {
                    error:
                        "Restoranın məkan məlumatı oxunmadı.",
                },
                {
                    status: 500,
                    headers: {
                        "Cache-Control": "no-store",
                    },
                },
            );
        }

        if (!restaurant) {
            return NextResponse.json(
                {
                    error: "Restoran tapılmadı.",
                },
                {
                    status: 404,
                    headers: {
                        "Cache-Control": "no-store",
                    },
                },
            );
        }

        const restaurantLatitude = Number(
            restaurant.latitude,
        );

        const restaurantLongitude = Number(
            restaurant.longitude,
        );

        if (
            !Number.isFinite(restaurantLatitude) ||
            !Number.isFinite(restaurantLongitude)
        ) {
            return NextResponse.json(
                {
                    error:
                        "Restoranın məkan məlumatı hələ qurulmayıb.",
                    code: "RESTAURANT_LOCATION_NOT_CONFIGURED",
                },
                {
                    status: 503,
                    headers: {
                        "Cache-Control": "no-store",
                    },
                },
            );
        }

        const configuredRadius = Number(
            restaurant.customer_order_radius_meters,
        );

        const allowedRadiusMeters =
            Number.isFinite(configuredRadius) &&
            configuredRadius > 0
                ? configuredRadius
                : DEFAULT_CUSTOMER_ORDER_RADIUS_METERS;

        const distanceMeters =
            calculateDistanceMeters(
                customerLatitude,
                customerLongitude,
                restaurantLatitude,
                restaurantLongitude,
            );

        if (distanceMeters > allowedRadiusMeters) {
            return NextResponse.json(
                {
                    error:
                        "Siz restoranın sifariş zonasından kənardasınız. Restorana yaxınlaşın və yenidən yoxlayın.",
                    code: "OUTSIDE_ORDER_RADIUS",
                    distanceMeters: Math.round(
                        distanceMeters,
                    ),
                    allowedRadiusMeters:
                        Math.round(
                            allowedRadiusMeters,
                        ),
                },
                {
                    status: 403,
                    headers: {
                        "Cache-Control": "no-store",
                    },
                },
            );
        }

        /*
         * 4. Masanın aktiv hesabını tapırıq.
         */
        const {
            data: session,
            error: sessionError,
        } = await supabaseAdmin
            .from("dining_sessions")
            .select(
                `
          id,
          restaurant_id,
          hall_id,
          table_id,
          status,
          service_fee_percent,
          subtotal,
          service_fee_amount,
          total,
          bill_requested_at,
          bill_ready_at,
          bill_delivered_at,
          created_at,
          updated_at
        `,
            )
            .eq("table_id", table.id)
            .in("status", ACTIVE_SESSION_STATUSES)
            .order("created_at", {
                ascending: false,
            })
            .limit(1)
            .maybeSingle();

        if (sessionError) {
            console.error(
                "Customer dining session lookup error:",
                sessionError,
            );

            return NextResponse.json(
                {
                    error:
                        "Masanın açıq hesabı oxunmadı.",
                },
                {
                    status: 500,
                },
            );
        }

        /*
         * Aktiv hesab yoxdursa boş nəticə qaytarırıq
         * və köhnə customer_session cookie-sini silirik.
         */
        if (!session) {
            const response = NextResponse.json(
                {
                    hasActiveSession: false,

                    table: {
                        id: table.id,
                        number: String(
                            table.table_number,
                        ),
                    },

                    session: null,
                    orders: [],

                    summary: {
                        subtotal: 0,
                        serviceFeePercent: 0,
                        serviceFeeAmount: 0,
                        total: 0,
                    },
                },
                {
                    status: 200,
                    headers: {
                        "Cache-Control":
                            "no-store, no-cache, must-revalidate",
                    },
                },
            );



            return response;
        }

        /*
         * 3. Browser cookie-sini yoxlayırıq.
         */
        const existingSessionToken =
            request.cookies.get(
                CUSTOMER_SESSION_COOKIE,
            )?.value ?? null;

        let customerSession:
            | CustomerSessionRow
            | null = null;

        let newCustomerSessionToken:
            | string
            | null = null;

        let sessionExpired = false;

        /*
         * Cookie varsa DB-də axtarırıq.
         */
        if (existingSessionToken) {
            const {
                data: existingCustomerSession,
                error: existingCustomerSessionError,
            } = await supabaseAdmin
                .from("customer_sessions")
                .select(
                    `
            id,
            session_token,
            dining_session_id,
            is_active
          `,
                )
                .eq(
                    "session_token",
                    existingSessionToken,
                )
                .maybeSingle();

            if (existingCustomerSessionError) {
                console.error(
                    "Customer browser session lookup error:",
                    existingCustomerSessionError,
                );

                return NextResponse.json(
                    {
                        error:
                            "Müştəri sessiyası yoxlanılmadı.",
                    },
                    {
                        status: 500,
                    },
                );
            }

            /*
             * Cookie hazırkı dining_session-a aiddirsə,
             * mövcud customer_session istifadə olunur.
             */
            if (
                existingCustomerSession &&
                existingCustomerSession.is_active &&
                existingCustomerSession
                    .dining_session_id === session.id
            ) {
                customerSession =
                    existingCustomerSession as CustomerSessionRow;

                const {
                    error: lastSeenUpdateError,
                } = await supabaseAdmin
                    .from("customer_sessions")
                    .update({
                        last_seen_at:
                            new Date().toISOString(),
                    })
                    .eq("id", customerSession.id);

                if (lastSeenUpdateError) {
                    console.error(
                        "Customer session last_seen update error:",
                        lastSeenUpdateError,
                    );
                }
            }
            else if (existingCustomerSession) {

                if (existingCustomerSession.is_active) {

                    const {
                        error: deactivateError,
                    } = await supabaseAdmin
                        .from("customer_sessions")
                        .update({
                            is_active: false,
                        })
                        .eq("id", existingCustomerSession.id);

                    if (deactivateError) {
                        console.error(
                            "Old customer session deactivate error:",
                            deactivateError,
                        );
                    }
                }

                sessionExpired = true;
            }
        }

        /*
         * Mövcud cookie keçərli deyilsə və ya cookie
         * ümumiyyətlə yoxdursa, hazırkı aktiv hesab
         * üçün yeni customer_session yaradılır.
         */
        if (sessionExpired) {
            const response = NextResponse.json(
                {
                    error: "Sessiya bitib.",
                },
                {
                    status: 403,
                },
            );



            return response;
        }
        if (!customerSession) {
            const userAgent =
                request.headers.get("user-agent");

            const forwardedFor =
                request.headers.get(
                    "x-forwarded-for",
                );

            const ipAddress =
                forwardedFor
                    ?.split(",")[0]
                    ?.trim() || null;

            const {
                data: createdCustomerSession,
                error: createCustomerSessionError,
            } = await supabaseAdmin
                .from("customer_sessions")
                .insert({
                    dining_session_id: session.id,
                    is_active: true,
                    last_seen_at:
                        new Date().toISOString(),
                    user_agent: userAgent,
                    ip_address: ipAddress,
                })
                .select(
                    `
            id,
            session_token,
            dining_session_id,
            is_active
          `,
                )
                .single();

            if (
                createCustomerSessionError ||
                !createdCustomerSession
            ) {
                console.error(
                    "Customer browser session create error:",
                    createCustomerSessionError,
                );

                return NextResponse.json(
                    {
                        error:
                            "Müştəri sessiyası yaradılmadı.",
                    },
                    {
                        status: 500,
                    },
                );
            }

            customerSession =
                createdCustomerSession as CustomerSessionRow;

            newCustomerSessionToken =
                customerSession.session_token;
        }

        /*
         * 4. Aktiv dining_session-a aid sifarişlər.
         */
        const {
            data: ordersData,
            error: ordersError,
        } = await supabaseAdmin
            .from("orders")
            .select(
                `
          id,
          status,
          customer_note,
          submitted_at,
          created_at
        `,
            )
            .eq("session_id", session.id)
            .order("created_at", {
                ascending: true,
            });

        if (ordersError) {
            console.error(
                "Customer session orders error:",
                ordersError,
            );

            return NextResponse.json(
                {
                    error: "Sifarişlər oxunmadı.",
                },
                {
                    status: 500,
                },
            );
        }

        const orders =
            (ordersData ?? []) as OrderRow[];

        const orderIds = orders.map(
            (order) => order.id,
        );

        let items: OrderItemRow[] = [];

        /*
         * 5. Sifariş məhsullarını oxuyuruq.
         */
        if (orderIds.length > 0) {
            const {
                data: itemsData,
                error: itemsError,
            } = await supabaseAdmin
                .from("order_items")
                .select(
                    `
            id,
            order_id,
            menu_item_id,
            item_name,
            quantity,
            price,
            note,
            preparation_area,
            status,
            created_at,
            started_at,
            ready_at,
            served_at,
            cancelled_at
          `,
                )
                .in("order_id", orderIds)
                .order("created_at", {
                    ascending: true,
                });

            if (itemsError) {
                console.error(
                    "Customer session items error:",
                    itemsError,
                );

                return NextResponse.json(
                    {
                        error:
                            "Sifariş məhsulları oxunmadı.",
                    },
                    {
                        status: 500,
                    },
                );
            }

            items =
                (itemsData ?? []) as OrderItemRow[];
        }

        /*
         * 6. Məhsulları sifarişlər üzrə qruplaşdırırıq.
         */
        const responseOrders = orders.map(
            (order) => {
                const orderItems = items
                    .filter(
                        (item) =>
                            item.order_id === order.id,
                    )
                    .map((item) => {
                        const price = Number(item.price);
                        const quantity = Number(
                            item.quantity,
                        );

                        return {
                            id: item.id,
                            menuItemId:
                                item.menu_item_id,
                            name: item.item_name,
                            quantity,
                            unitPrice: price,
                            lineTotal:
                                price * quantity,
                            note: item.note,
                            preparationArea:
                                item.preparation_area,
                            status: item.status,
                            canCancel: canCancelItem(
                                item.status,
                            ),
                            createdAt: item.created_at,
                            startedAt: item.started_at,
                            readyAt: item.ready_at,
                            servedAt: item.served_at,
                            cancelledAt:
                                item.cancelled_at,
                        };
                    });

                return {
                    id: order.id,
                    status: order.status,
                    customerNote:
                        order.customer_note,
                    submittedAt:
                        order.submitted_at,
                    createdAt: order.created_at,
                    items: orderItems,
                };
            },
        );

        const response = NextResponse.json(
            {
                hasActiveSession: true,

                table: {
                    id: table.id,
                    number: String(
                        table.table_number,
                    ),
                },

                session: {
                    id: session.id,
                    status: session.status,
                    createdAt: session.created_at,
                    updatedAt: session.updated_at,
                    billRequestedAt:
                        session.bill_requested_at,
                    billReadyAt:
                        session.bill_ready_at,
                    billDeliveredAt:
                        session.bill_delivered_at,
                },

                orders: responseOrders,

                summary: {
                    subtotal: Number(
                        session.subtotal,
                    ),
                    serviceFeePercent: Number(
                        session.service_fee_percent,
                    ),
                    serviceFeeAmount: Number(
                        session.service_fee_amount,
                    ),
                    total: Number(session.total),
                },
            },
            {
                status: 200,
                headers: {
                    "Cache-Control":
                        "no-store, no-cache, must-revalidate",
                },
            },
        );

        /*
         * Yeni customer_session yaranıbsa,
         * cookie-ni yenisi ilə əvəz edirik.
         */
        if (newCustomerSessionToken) {
            response.cookies.set({
                name: CUSTOMER_SESSION_COOKIE,
                value: newCustomerSessionToken,
                httpOnly: true,
                secure:
                    process.env.NODE_ENV ===
                    "production",
                sameSite: "lax",
                path: "/",
                maxAge: 60 * 60 * 24 * 30,
            });
        }

        return response;
    } catch (error) {
        console.error(
            "Customer session route error:",
            error,
        );

        return NextResponse.json(
            {
                error:
                    "Açıq hesab oxunarkən gözlənilməz xəta baş verdi.",
            },
            {
                status: 500,
            },
        );
    }
}
