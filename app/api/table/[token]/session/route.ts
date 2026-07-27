import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

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

const ACTIVE_SESSION_STATUSES = [
  "OPEN",
  "BILL_REQUESTED",
  "BILL_READY",
  "BILL_DELIVERED",
];

function canCancelItem(status: string) {
  return status === "NEW";
}

export async function GET(
  _request: Request,
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
     * 2. Masanın hazırda aktiv olan hesabını tapırıq.
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
        "Customer session lookup error:",
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
     * Aktiv hesab yoxdursa, boş nəticə qaytarırıq.
     * Yeni sifariş veriləndə create_customer_order
     * avtomatik olaraq yeni session yaradacaq.
     */
    if (!session) {
      return NextResponse.json(
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
            "Cache-Control": "no-store",
          },
        },
      );
    }

    /*
     * 3. Bu session-a aid bütün sifarişləri oxuyuruq.
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
     * 4. Sifarişlərin məhsullarını oxuyuruq.
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
     * 5. Məhsulları sifarişlər üzrə qruplaşdırırıq.
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

    return NextResponse.json(
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
          "Cache-Control": "no-store",
        },
      },
    );
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