import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurant_id");

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurant_id tələb olunur." },
        { status: 400 }
      );
    }

    const { data: userRoles, error: userRolesError } = await supabaseAdmin
      .from("user_roles")
      .select(`
        user_id,
        profiles (
          id,
          full_name,
          phone,
          is_active,
          created_at
        ),
        roles (
          name
        )
      `)
      .eq("restaurant_id", restaurantId);

    if (userRolesError) {
      return NextResponse.json(
        { error: userRolesError.message },
        { status: 400 }
      );
    }

    const waiters = (userRoles || []).filter(
      (item: any) => item.roles?.name === "WAITER"
    );

    const waiterIds = waiters.map((item: any) => item.user_id);

    let assignments: any[] = [];

    if (waiterIds.length > 0) {
      const { data: assignmentData, error: assignmentError } =
        await supabaseAdmin
          .from("waiter_table_assignments")
          .select(`
            waiter_id,
            table_id,
            restaurant_tables (
              id,
              table_number,
              halls (
                id,
                name
              )
            )
          `)
          .eq("restaurant_id", restaurantId)
          .in("waiter_id", waiterIds);

      if (assignmentError) {
        return NextResponse.json(
          { error: assignmentError.message },
          { status: 400 }
        );
      }

      assignments = assignmentData || [];
    }

    const users = waiters.map((waiter: any) => ({
      ...waiter,
      waiter_table_assignments: assignments.filter(
        (assignment: any) => assignment.waiter_id === waiter.user_id
      ),
    }));

    return NextResponse.json({
      success: true,
      users,
    });
  } catch {
    return NextResponse.json(
      { error: "Server xətası." },
      { status: 500 }
    );
  }
}