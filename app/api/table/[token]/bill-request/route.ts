import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{
    token: string;
  }>;
}

export async function POST(
  _request: Request,
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

    const { data: table, error: tableError } =
      await supabaseAdmin
        .from("restaurant_tables")
        .select("id")
        .eq("qr_token", normalizedToken)
        .eq("is_active", true)
        .maybeSingle();

    if (tableError) {
      console.error(tableError);

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
      console.error(sessionError);

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
          error:
            "Aktiv hesab tapılmadı.",
        },
        {
          status: 404,
        },
      );
    }

    const now = new Date().toISOString();

    const { error: updateError } =
      await supabaseAdmin
        .from("dining_sessions")
        .update({
          status: "BILL_REQUESTED",
          bill_requested_at: now,
          updated_at: now,
        })
        .eq("id", session.id)
        .eq("status", "OPEN");

    if (updateError) {
      console.error(updateError);

      return NextResponse.json(
        {
          error:
            "Hesab istənilə bilmədi.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      success: true,
      status: "BILL_REQUESTED",
      billRequestedAt: now,
    });
  } catch (e) {
    console.error(e);

    return NextResponse.json(
      {
        error:
          "Gözlənilməz xəta baş verdi.",
      },
      {
        status: 500,
      },
    );
  }
}