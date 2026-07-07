import { NextResponse } from "next/server";
import { ServiceRequestService } from "@/services/service-request.service";

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

    const logs = await ServiceRequestService.getRestaurantLogs(restaurantId);

    return NextResponse.json({
      success: true,
      logs,
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