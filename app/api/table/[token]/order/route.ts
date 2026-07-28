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

type RequestItem = {
  menuItemId?: unknown;
  quantity?: unknown;
  note?: unknown;
};

type RequestBody = {
  items?: unknown;
  customerNote?: unknown;
};

type CustomerSessionRow = {
  id: string;
  dining_session_id: string;
  is_active: boolean;
};

const CUSTOMER_SESSION_COOKIE =
  "customer_session";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
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
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    /*
     * 1. Bu browserin customer_session cookie-si
     * mütləq olmalıdır.
     */
    const customerSessionToken =
      request.cookies.get(
        CUSTOMER_SESSION_COOKIE,
      )?.value ?? null;

    if (!customerSessionToken) {
      return NextResponse.json(
        {
          error:
            "Müştəri sessiyası tapılmadı. QR kodu yenidən oxudun.",
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
     * 2. QR token vasitəsilə masanı tapırıq.
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
        "Customer order table lookup error:",
        tableError,
      );

      return NextResponse.json(
        {
          error:
            "Masa məlumatı yoxlanıla bilmədi.",
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
     * 3. Masanın cari OPEN dining_session-ını
     * tapırıq.
     */
    const {
      data: diningSession,
      error: diningSessionError,
    } = await supabaseAdmin
      .from("dining_sessions")
      .select("id, status")
      .eq("table_id", table.id)
      .eq("status", "OPEN")
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (diningSessionError) {
      console.error(
        "Customer order dining session error:",
        diningSessionError,
      );

      return NextResponse.json(
        {
          error:
            "Masanın aktiv hesabı yoxlanıla bilmədi.",
        },
        {
          status: 500,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    if (!diningSession) {
      return NextResponse.json(
        {
          error:
            "Masa hazırda açıq deyil. Zəhmət olmasa ofisianta müraciət edin.",
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
     * 4. Cookie-dəki customer_session-ı tapırıq.
     */
    const {
      data: customerSession,
      error: customerSessionError,
    } = await supabaseAdmin
      .from("customer_sessions")
      .select(
        `
          id,
          dining_session_id,
          is_active
        `,
      )
      .eq(
        "session_token",
        customerSessionToken,
      )
      .maybeSingle();

    if (customerSessionError) {
      console.error(
        "Customer order customer session error:",
        customerSessionError,
      );

      return NextResponse.json(
        {
          error:
            "Müştəri sessiyası yoxlanıla bilmədi.",
        },
        {
          status: 500,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    /*
     * Köhnə telefon burada bloklanır:
     *
     * - customer_session yoxdur;
     * - deaktivdir;
     * - yaxud əvvəlki dining_session-a aiddir.
     */
    if (
      !customerSession ||
      !customerSession.is_active ||
      customerSession.dining_session_id !==
        diningSession.id
    ) {
      return NextResponse.json(
        {
          error:
            "Bu telefonun əvvəlki masa sessiyası başa çatıb. Yeni sifariş göndərmək mümkün deyil.",
          sessionExpired: true,
        },
        {
          status: 403,
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate",
          },
        },
      );
    }

    /*
     * 5. Request body yoxlanılır.
     */
    const body = (await request
      .json()
      .catch(() => null)) as
      | RequestBody
      | null;

    if (!body || !Array.isArray(body.items)) {
      return NextResponse.json(
        {
          error:
            "Sifariş məlumatları düzgün deyil.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    if (
      body.items.length === 0 ||
      body.items.length > 100
    ) {
      return NextResponse.json(
        {
          error:
            "Səbət boşdur və ya məhsul sayı çoxdur.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const normalizedItems: Array<{
      menuItemId: string;
      quantity: number;
      note: string | null;
    }> = [];

    for (
      const rawItem of body.items as RequestItem[]
    ) {
      const menuItemId =
        typeof rawItem.menuItemId === "string"
          ? rawItem.menuItemId.trim()
          : "";

      const quantity = Number(
        rawItem.quantity,
      );

      const note =
        typeof rawItem.note === "string"
          ? rawItem.note
              .trim()
              .slice(0, 300)
          : "";

      if (!UUID_PATTERN.test(menuItemId)) {
        return NextResponse.json(
          {
            error:
              "Məhsullardan birinin ID məlumatı düzgün deyil.",
          },
          {
            status: 400,
            headers: {
              "Cache-Control": "no-store",
            },
          },
        );
      }

      if (
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 99
      ) {
        return NextResponse.json(
          {
            error:
              "Məhsul sayı 1 ilə 99 arasında olmalıdır.",
          },
          {
            status: 400,
            headers: {
              "Cache-Control": "no-store",
            },
          },
        );
      }

      normalizedItems.push({
        menuItemId,
        quantity,
        note: note || null,
      });
    }

    const customerNote =
      typeof body.customerNote === "string"
        ? body.customerNote
            .trim()
            .slice(0, 500)
        : "";

    /*
     * 6. customer_session cari dining_session-a
     * uyğun gəldikdən sonra RPC çağırılır.
     */
    const {
      data,
      error,
    } = await supabaseAdmin.rpc(
      "create_customer_order",
      {
        p_qr_token: normalizedToken,
        p_items: normalizedItems,
        p_customer_note:
          customerNote || null,
      },
    );

    if (error) {
      console.error(
        "Create customer order RPC error:",
        error,
      );

      return NextResponse.json(
        {
          error:
            error.message ||
            "Sifariş yaradılmadı.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const result = data?.[0];

    if (!result) {
      return NextResponse.json(
        {
          error:
            "Sifariş nəticəsi tapılmadı.",
        },
        {
          status: 500,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    /*
     * Aktiv sessiyanın son istifadə vaxtını
     * yeniləyirik.
     */
    const {
      error: lastSeenError,
    } = await supabaseAdmin
      .from("customer_sessions")
      .update({
        last_seen_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        (
          customerSession as CustomerSessionRow
        ).id,
      );

    if (lastSeenError) {
      console.error(
        "Customer order last_seen update error:",
        lastSeenError,
      );
    }

    return NextResponse.json(
      {
        success: true,
        sessionId: result.session_id,
        orderId: result.order_id,
        subtotal: Number(
          result.subtotal,
        ),
        serviceFeeAmount: Number(
          result.service_fee_amount,
        ),
        total: Number(result.total),
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "Customer order route error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Sifariş göndərilərkən gözlənilməz xəta baş verdi.",
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