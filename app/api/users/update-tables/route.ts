import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { waiterId, restaurantId, tableIds } = await req.json();

    if (!waiterId || !restaurantId || !Array.isArray(tableIds)) {
      return NextResponse.json(
        { error: "Məlumatlar tam deyil." },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from("waiter_table_assignments")
      .delete()
      .eq("waiter_id", waiterId)
      .eq("restaurant_id", restaurantId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 400 }
      );
    }

    if (tableIds.length > 0) {
      const { data: tables, error: tableError } = await supabaseAdmin
        .from("restaurant_tables")
        .select("id, hall_id")
        .eq("restaurant_id", restaurantId)
        .in("id", tableIds);

      if (tableError) {
        return NextResponse.json(
          { error: tableError.message },
          { status: 400 }
        );
      }

      const rows = (tables || []).map((table) => ({
        restaurant_id: restaurantId,
        waiter_id: waiterId,
        hall_id: table.hall_id,
        table_id: table.id,
      }));

      const { error: insertError } = await supabaseAdmin
        .from("waiter_table_assignments")
        .insert(rows);

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Server xətası." },
      { status: 500 }
    );
  }
}