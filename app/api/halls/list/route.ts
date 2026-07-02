import { NextResponse } from "next/server";
import { HallService } from "@/services/hall.service";

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

    const halls = await HallService.getRestaurantHalls(restaurantId);

    return NextResponse.json({
      success: true,
      halls,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 }
    );
  }
}