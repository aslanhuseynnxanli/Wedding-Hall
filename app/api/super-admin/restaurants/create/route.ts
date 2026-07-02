import { NextResponse } from "next/server";
import { RestaurantService } from "@/services/restaurant.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const restaurant = await RestaurantService.createRestaurantWithAdmin(body);

    return NextResponse.json({
      success: true,
      restaurant,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 400,
      }
    );
  }
}