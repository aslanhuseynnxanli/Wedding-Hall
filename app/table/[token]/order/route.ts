import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

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

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const { token } = await params;

    if (!token?.trim()) {
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
      .catch(() => null)) as RequestBody | null;

    if (!body || !Array.isArray(body.items)) {
      return NextResponse.json(
        {
          error: "Sifariş məlumatları düzgün deyil.",
        },
        {
          status: 400,
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
        },
      );
    }

    const normalizedItems = [];

    for (const rawItem of body.items as RequestItem[]) {
      const menuItemId =
        typeof rawItem.menuItemId === "string"
          ? rawItem.menuItemId.trim()
          : "";

      const quantity = Number(rawItem.quantity);

      const note =
        typeof rawItem.note === "string"
          ? rawItem.note.trim().slice(0, 300)
          : "";

      if (!UUID_PATTERN.test(menuItemId)) {
        return NextResponse.json(
          {
            error:
              "Məhsullardan birinin ID məlumatı düzgün deyil.",
          },
          {
            status: 400,
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
        ? body.customerNote.trim().slice(0, 500)
        : "";

    const { data, error } = await supabaseAdmin.rpc(
      "create_customer_order",
      {
        p_qr_token: token,
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
        },
      );
    }

    return NextResponse.json(
      {
        success: true,
        sessionId: result.session_id,
        orderId: result.order_id,
        subtotal: Number(result.subtotal),
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
      },
    );
  }
}