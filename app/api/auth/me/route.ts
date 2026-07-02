import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId tələb olunur." },
        { status: 400 }
      );
    }

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select(`
        id,
        full_name,
        phone,
        is_active,
        user_roles (
          restaurant_id,
          roles (
            name
          ),
          restaurants (
            id,
            name,
            slug
          )
        )
      `)
      .eq("id", userId)
      .single();

    if (error || !profile) {
      return NextResponse.json(
        { error: "Profil tapılmadı." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch {
    return NextResponse.json(
      { error: "Server xətası." },
      { status: 500 }
    );
  }
}