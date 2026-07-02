import { NextResponse } from "next/server";
import { RestaurantRepository } from "@/repositories/restaurant.repository";

export async function GET() {
  try {
    const restaurants = await RestaurantRepository.getAll();

    return NextResponse.json({
      success: true,
      restaurants,
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