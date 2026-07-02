import { NextResponse } from "next/server";
import { ServiceRequestService } from "@/services/service-request.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const request = await ServiceRequestService.updateStatus(
      body.id,
      body.status
    );

    return NextResponse.json({
      success: true,
      request,
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