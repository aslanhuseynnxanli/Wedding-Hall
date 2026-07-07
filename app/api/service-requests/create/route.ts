import { NextResponse } from "next/server";
import { ServiceRequestService } from "@/services/service-request.service";
import { NotificationService } from "@/services/notification.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const request = await ServiceRequestService.create(body);

    try {
      await NotificationService.sendToWaitersByTable({
        restaurantId: request.restaurant_id,
        tableId: request.table_id,
        title: "Yeni istək",
        body: `${request.request_type}`,
      });
    } catch (notificationError) {
      console.error("Notification error:", notificationError);
    }

    return NextResponse.json({
      success: true,
      request,
    });
  } catch (error) {
    console.error("Service request create error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 }
    );
  }
}