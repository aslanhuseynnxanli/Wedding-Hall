import { NextResponse } from "next/server";
import { TableService } from "@/services/table.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const table = await TableService.createTable(body);

    return NextResponse.json({
      success: true,
      table,
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