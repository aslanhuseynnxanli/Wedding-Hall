import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{
    token: string;
  }>;
}

type PaymentMethod =
  | "CASH"
  | "CARD"
  | "OTHER";

interface BillRequestBody {
  paymentMethod?: PaymentMethod;
}

type OrderRow = {
  id: string;
};

type PendingItemRow = {
  id: string;
  order_id: string;
  status: string;
};

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
    const normalizedToken = token?.trim();

    if (!normalizedToken) {
      return NextResponse.json(
        {
          error: "QR token tapılmadı.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const body = (await request
      .json()
      .catch(() => null)) as
      | BillRequestBody
      | null;

    const paymentMethod =
      body?.paymentMethod;

    if (
      !paymentMethod ||
      !ALLOWED_PAYMENT_METHODS.includes(
        paymentMethod,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Ödəniş üsulunu düzgün seçin.",
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
     * 1. QR token vasitəsilə masanı tapırıq.
     */
    const {
      data: table,
      error: tableError,
    } = await supabaseAdmin
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
          error:
            "Masa məlumatı oxunmadı.",
        },
        {
          status: 500,
          headers: {
            "Cache-Control": "no-store",
          },
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
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    /*
     * 2. Masanın hazırkı açıq hesabını tapırıq.
     */
    const {
      data: session,
      error: sessionError,
    } = await supabaseAdmin
      .from("dining_sessions")
      .select(
        `
          id,
          status
        `,
      )
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
          error:
            "Masanın aktiv hesabı oxunmadı.",
        },
        {
          status: 500,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    if (!session) {
      return NextResponse.json(
        {
          error:
            "Masa üçün açıq hesab tapılmadı.",
        },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    /*
     * 3. Aktiv dining_session-a aid orders
     * qeydlərini tapırıq.
     */
    const {
      data: ordersData,
      error: ordersError,
    } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("session_id", session.id);

    if (ordersError) {
      console.error(
        "Bill request orders error:",
        ordersError,
      );

      return NextResponse.json(
        {
          error:
            "Sifarişlər oxunmadı.",
        },
        {
          status: 500,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const orders =
      (ordersData ?? []) as OrderRow[];

    if (orders.length === 0) {
      return NextResponse.json(
        {
          error:
            "Hesab istəmək üçün ən azı bir sifariş olmalıdır.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const orderIds = orders.map(
      (order) => order.id,
    );

    /*
     * 4. Məhsulları dining_session_id ilə deyil,
     * order_id vasitəsilə yoxlayırıq.
     */
    const {
      data: pendingItemsData,
      error: pendingItemsError,
    } = await supabaseAdmin
      .from("order_items")
      .select(
        `
          id,
          order_id,
          status
        `,
      )
      .in("order_id", orderIds)
      .not(
        "status",
        "in",
        '("SERVED","CANCELLED")',
      )
      .limit(1);

    if (pendingItemsError) {
      console.error(
        "Bill request pending items error:",
        pendingItemsError,
      );

      return NextResponse.json(
        {
          error:
            "Sifarişlərin vəziyyəti yoxlanıla bilmədi.",
        },
        {
          status: 500,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const pendingItems =
      (pendingItemsData ??
        []) as PendingItemRow[];

    if (pendingItems.length > 0) {
      return NextResponse.json(
        {
          error:
            "Bütün sifarişlər təqdim edilmədən hesab istənilə bilməz.",
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
     * 5. Bütün məhsullar SERVED və ya CANCELLED
     * olduqda hesab istənilir.
     */
    const now = new Date().toISOString();

    const {
      data: updatedSession,
      error: updateError,
    } = await supabaseAdmin
      .from("dining_sessions")
      .update({
        status: "BILL_REQUESTED",
        payment_method: paymentMethod,
        bill_requested_at: now,
        updated_at: now,
      })
      .eq("id", session.id)
      .eq("status", "OPEN")
      .select(
        `
          id,
          status,
          payment_method,
          bill_requested_at
        `,
      )
      .maybeSingle();

    if (updateError) {
      console.error(
        "Bill request update error:",
        updateError,
      );

      return NextResponse.json(
        {
          error:
            "Hesab istənilə bilmədi.",
        },
        {
          status: 500,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    if (!updatedSession) {
      return NextResponse.json(
        {
          error:
            "Hesabın vəziyyəti artıq dəyişib. Səhifəni yeniləyib təkrar yoxlayın.",
        },
        {
          status: 409,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    return NextResponse.json(
      {
        success: true,
        status: updatedSession.status,
        paymentMethod:
          updatedSession.payment_method,
        billRequestedAt:
          updatedSession.bill_requested_at,
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
      "Bill request unexpected error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Hesab istənilərkən gözlənilməz xəta baş verdi.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}