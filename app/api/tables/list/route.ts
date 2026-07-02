import { NextResponse } from "next/server";
import { TableService } from "@/services/table.service";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const hallId = searchParams.get("hall_id");

    if (!hallId) {
      return NextResponse.json(
        { error: "hall_id tələb olunur." },
        { status: 400 }
      );
    }

    const tables = await TableService.getHallTables(hallId);

    return NextResponse.json({
      success: true,
      tables,
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