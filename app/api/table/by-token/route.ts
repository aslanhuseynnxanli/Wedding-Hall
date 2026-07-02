import { NextResponse } from "next/server";
import { TableService } from "@/services/table.service";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "token tələb olunur" },
        { status: 400 }
      );
    }

    const table = await TableService.getTableByToken(token);

    return NextResponse.json({
      success: true,
      table,
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