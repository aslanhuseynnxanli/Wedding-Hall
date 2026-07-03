import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { userId, restaurantId, token } = await req.json();

    if (!userId || !restaurantId || !token) {
      return NextResponse.json(
        { error: "Məlumatlar tam deyil." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("fcm_tokens").upsert(
      {
        user_id: userId,
        restaurant_id: restaurantId,
        token,
      },
      { onConflict: "token" }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server xətası." }, { status: 500 });
  }
}