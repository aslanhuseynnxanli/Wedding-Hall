import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { fullName, email, password, restaurantId, roleName, tableIds } = body;

    if (!fullName || !email || !password || !restaurantId || !roleName) {
      return NextResponse.json(
        { error: "Bütün xanalar doldurulmalıdır." },
        { status: 400 }
      );
    }

    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError || !authUser.user) {
      return NextResponse.json(
        { error: authError?.message || "User yaradıla bilmədi." },
        { status: 400 }
      );
    }

    const userId = authUser.user.id;

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: userId,
      full_name: fullName,
    });

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    const { data: role, error: roleError } = await supabaseAdmin
      .from("roles")
      .select("id")
      .eq("name", roleName)
      .single();

    if (roleError || !role) {
      return NextResponse.json({ error: "Rol tapılmadı." }, { status: 400 });
    }

    const { error: userRoleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      restaurant_id: restaurantId,
      role_id: role.id,
    });

    if (userRoleError) {
      return NextResponse.json({ error: userRoleError.message }, { status: 400 });
    }

    if (roleName === "WAITER" && Array.isArray(tableIds) && tableIds.length > 0) {
      const { data: tables, error: tablesError } = await supabaseAdmin
        .from("restaurant_tables")
        .select("id, hall_id")
        .eq("restaurant_id", restaurantId)
        .in("id", tableIds);

      if (tablesError) {
        return NextResponse.json({ error: tablesError.message }, { status: 400 });
      }

      const assignments = (tables || []).map((table) => ({
        restaurant_id: restaurantId,
        waiter_id: userId,
        hall_id: table.hall_id,
        table_id: table.id,
      }));

      if (assignments.length > 0) {
        const { error: assignmentError } = await supabaseAdmin
          .from("waiter_table_assignments")
          .insert(assignments);

        if (assignmentError) {
          return NextResponse.json(
            { error: assignmentError.message },
            { status: 400 }
          );
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server xətası." }, { status: 500 });
  }
}