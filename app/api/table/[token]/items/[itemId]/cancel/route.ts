import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{
    token: string;
    itemId: string;
  }>;
}

type OrderItemRow = {
  id: string;
  order_id: string;
  quantity: number;
  price: number | string;
  status: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ACTIVE_SESSION_STATUSES = [
  "OPEN",
  "BILL_REQUESTED",
  "BILL_READY",
  "BILL_DELIVERED",
];

export async function PATCH(
  _request: Request,
  { params }: RouteContext,
) {
  try {
    const { token, itemId } = await params;

    const normalizedToken = token?.trim();
    const normalizedItemId = itemId?.trim();

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

    if (
      !normalizedItemId ||
      !UUID_PATTERN.test(normalizedItemId)
    ) {
      return NextResponse.json(
        {
          error: "Məhsul ID məlumatı düzgün deyil.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * 1. QR token ilə aktiv masanı tapırıq.
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
        "Cancel item table lookup error:",
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
     * 2. Masanın aktiv hesabını tapırıq.
     */
    const {
      data: session,
      error: sessionError,
    } = await supabaseAdmin
      .from("dining_sessions")
      .select(
        `
          id,
          table_id,
          status,
          service_fee_percent,
          subtotal,
          service_fee_amount,
          total
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
        "Cancel item session lookup error:",
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

    if (!session) {
      return NextResponse.json(
        {
          error:
            "Bu masa üçün açıq hesab tapılmadı.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Hesab istənildikdən sonra müştəri məhsul
     * ləğv edə bilməz.
     */
    if (session.status !== "OPEN") {
      return NextResponse.json(
        {
          error:
            "Hesab istənildiyi üçün məhsul artıq ləğv edilə bilməz.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * 3. Session-a aid sifarişləri tapırıq.
     */
    const {
      data: orders,
      error: ordersError,
    } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("session_id", session.id);

    if (ordersError) {
      console.error(
        "Cancel item orders lookup error:",
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

    const orderIds = (orders ?? []).map(
      (order) => order.id,
    );

    if (orderIds.length === 0) {
      return NextResponse.json(
        {
          error:
            "Bu hesabda sifariş tapılmadı.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * 4. Ləğv ediləcək məhsulu tapırıq.
     *
     * .in("order_id", orderIds) yoxlaması sayəsində
     * başqa masanın məhsulu ləğv edilə bilməz.
     */
    const {
      data: orderItem,
      error: orderItemError,
    } = await supabaseAdmin
      .from("order_items")
      .select(
        `
          id,
          order_id,
          item_name,
          quantity,
          price,
          status,
          cancelled_at
        `,
      )
      .eq("id", normalizedItemId)
      .in("order_id", orderIds)
      .maybeSingle();

    if (orderItemError) {
      console.error(
        "Cancel item lookup error:",
        orderItemError,
      );

      return NextResponse.json(
        {
          error:
            "Sifariş məhsulu oxunmadı.",
        },
        {
          status: 500,
        },
      );
    }

    if (!orderItem) {
      return NextResponse.json(
        {
          error:
            "Məhsul tapılmadı və ya bu masaya aid deyil.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Müştəri yalnız NEW statusunda olan
     * məhsulu ləğv edə bilər.
     */
    if (orderItem.status === "CANCELLED") {
      return NextResponse.json(
        {
          error:
            "Bu məhsul artıq ləğv edilib.",
        },
        {
          status: 409,
        },
      );
    }

    if (orderItem.status !== "NEW") {
      return NextResponse.json(
        {
          error:
            "Məhsul artıq hazırlanmağa başladığı üçün ləğv edilə bilməz.",
        },
        {
          status: 409,
        },
      );
    }

    const cancelledAt =
      new Date().toISOString();

    /*
     * 5. Məhsulu ləğv edirik.
     *
     * Burada status şərtini yenidən yazırıq.
     * İki istifadəçi eyni anda əməliyyat etsə belə,
     * yalnız NEW olan məhsul dəyişəcək.
     */
    const {
      data: cancelledItem,
      error: cancelError,
    } = await supabaseAdmin
      .from("order_items")
      .update({
        status: "CANCELLED",
        cancelled_at: cancelledAt,
      })
      .eq("id", orderItem.id)
      .eq("status", "NEW")
      .select(
        `
          id,
          order_id,
          item_name,
          quantity,
          price,
          status,
          cancelled_at
        `,
      )
      .maybeSingle();

    if (cancelError) {
      console.error(
        "Cancel item update error:",
        cancelError,
      );

      return NextResponse.json(
        {
          error:
            "Məhsul ləğv edilə bilmədi.",
        },
        {
          status: 500,
        },
      );
    }

    if (!cancelledItem) {
      return NextResponse.json(
        {
          error:
            "Məhsulun vəziyyəti dəyişib. Hesabı yeniləyib təkrar yoxlayın.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * 6. Session daxilindəki bütün məhsulları
     * yenidən oxuyub hesabı hesablayırıq.
     */
    const {
      data: allItemsData,
      error: allItemsError,
    } = await supabaseAdmin
      .from("order_items")
      .select(
        `
          id,
          order_id,
          quantity,
          price,
          status
        `,
      )
      .in("order_id", orderIds);

    if (allItemsError) {
      console.error(
        "Cancel item recalculation lookup error:",
        allItemsError,
      );

      return NextResponse.json(
        {
          error:
            "Məhsul ləğv edildi, amma hesab yenilənmədi.",
          itemCancelled: true,
        },
        {
          status: 500,
        },
      );
    }

    const allItems =
      (allItemsData ?? []) as OrderItemRow[];

    const subtotal = allItems
      .filter(
        (item) =>
          item.status !== "CANCELLED",
      )
      .reduce((sum, item) => {
        const price = Number(item.price);
        const quantity = Number(
          item.quantity,
        );

        if (
          !Number.isFinite(price) ||
          !Number.isFinite(quantity)
        ) {
          return sum;
        }

        return sum + price * quantity;
      }, 0);

    const serviceFeePercent = Number(
      session.service_fee_percent ?? 0,
    );

    const serviceFeeAmount =
      subtotal *
      (serviceFeePercent / 100);

    const total =
      subtotal + serviceFeeAmount;

    /*
     * Pul dəyərlərində uzun onluq yaranmasın.
     */
    const roundedSubtotal =
      Math.round(subtotal * 100) / 100;

    const roundedServiceFeeAmount =
      Math.round(serviceFeeAmount * 100) /
      100;

    const roundedTotal =
      Math.round(total * 100) / 100;

    /*
     * 7. Dining session hesabını yeniləyirik.
     */
    const {
      error: sessionUpdateError,
    } = await supabaseAdmin
      .from("dining_sessions")
      .update({
        subtotal: roundedSubtotal,
        service_fee_amount:
          roundedServiceFeeAmount,
        total: roundedTotal,
        updated_at: cancelledAt,
      })
      .eq("id", session.id)
      .eq("status", "OPEN");

    if (sessionUpdateError) {
      console.error(
        "Cancel item session update error:",
        sessionUpdateError,
      );

      return NextResponse.json(
        {
          error:
            "Məhsul ləğv edildi, amma yekun hesab yenilənmədi.",
          itemCancelled: true,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Məhsul uğurla ləğv edildi.",
        item: {
          id: cancelledItem.id,
          name: cancelledItem.item_name,
          status:
            cancelledItem.status,
          cancelledAt:
            cancelledItem.cancelled_at,
        },
        summary: {
          subtotal: roundedSubtotal,
          serviceFeePercent,
          serviceFeeAmount:
            roundedServiceFeeAmount,
          total: roundedTotal,
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
      "Customer cancel item route error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Məhsul ləğv edilərkən gözlənilməz xəta baş verdi.",
      },
      {
        status: 500,
      },
    );
  }
}