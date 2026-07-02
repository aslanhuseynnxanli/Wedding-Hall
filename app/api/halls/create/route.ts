import { NextResponse } from "next/server";
import { HallService } from "@/services/hall.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const hall = await HallService.createHall(body);

    return NextResponse.json({
      success: true,
      hall,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 400,
      }
    );
  }
}