import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
    params: Promise<{
        token: string;
    }>;
}

type PaymentMethod = "CASH" | "CARD" | "OTHER";

interface BillRequestBody {
    paymentMethod?: PaymentMethod;
}

const ALLOWED_PAYMENT_METHODS: PaymentMethod[] = [
    "CASH",
    "CARD",
    "OTHER",
];

export async function POST(
    request: Request,
    { params }: RouteContext,
) {
    try {
        const { token } = await params;
        const normalizedToken = token.trim();

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

        const body = (await request
            .json()
            .catch(() => null)) as BillRequestBody | null;

        const paymentMethod = body?.paymentMethod;

        if (
            !paymentMethod ||
            !ALLOWED_PAYMENT_METHODS.includes(paymentMethod)
        ) {
            return NextResponse.json(
                {
                    error:
                        "Ödəniş üsulunu düzgün seçin: CASH, CARD və ya OTHER.",
                },
                {
                    status: 400,
                },
            );
        }

        const { data: table, error: tableError } =
            await supabaseAdmin
                .from("restaurant_tables")
                .select("id")
                .eq("qr_token", normalizedToken)
                .eq("is_active", true)
                .maybeSingle();

        if (tableError) {
            console.error(
                "Bill request table error:",
                tableError,
            );

            return NextResponse.json(
                {
                    error: "Masa tapılmadı.",
                },
                {
                    status: 500,
                },
            );
        }

        if (!table) {
            return NextResponse.json(
                {
                    error: "Masa tapılmadı.",
                },
                {
                    status: 404,
                },
            );
        }

        const { data: session, error: sessionError } =
            await supabaseAdmin
                .from("dining_sessions")
                .select(`
                    id,
                    status
                `)
                .eq("table_id", table.id)
                .eq("status", "OPEN")
                .order("created_at", {
                    ascending: false,
                })
                .limit(1)
                .maybeSingle();

        if (sessionError) {
            console.error(
                "Bill request session error:",
                sessionError,
            );

            return NextResponse.json(
                {
                    error: "Session oxunmadı.",
                },
                {
                    status: 500,
                },
            );
        }

        if (!session) {
            return NextResponse.json(
                {
                    error: "Aktiv hesab tapılmadı.",
                },
                {
                    status: 404,
                },
            );
        }

        const now = new Date().toISOString();

        const { data: updatedSession, error: updateError } =
            await supabaseAdmin
                .from("dining_sessions")
                .update({
                    status: "BILL_REQUESTED",
                    payment_method: paymentMethod,
                    bill_requested_at: now,
                    updated_at: now,
                })
                .eq("id", session.id)
                .eq("status", "OPEN")
                .select(`
                    id,
                    status,
                    payment_method,
                    bill_requested_at
                `)
                .maybeSingle();

        if (updateError) {
            console.error(
                "Bill request update error:",
                updateError,
            );

            return NextResponse.json(
                {
                    error: "Hesab istənilə bilmədi.",
                },
                {
                    status: 500,
                },
            );
        }

        if (!updatedSession) {
            return NextResponse.json(
                {
                    error:
                        "Hesabın vəziyyəti dəyişib. Səhifəni yeniləyib təkrar yoxlayın.",
                },
                {
                    status: 409,
                },
            );
        }

        return NextResponse.json({
            success: true,
            status: updatedSession.status,
            paymentMethod:
                updatedSession.payment_method,
            billRequestedAt:
                updatedSession.bill_requested_at,
        });
    } catch (error) {
        console.error(
            "Bill request unexpected error:",
            error,
        );

        return NextResponse.json(
            {
                error: "Gözlənilməz xəta baş verdi.",
            },
            {
                status: 500,
            },
        );
    }
}