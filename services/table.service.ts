import { TableRepository } from "@/repositories/table.repository";
import { RestaurantTable } from "@/types/table";
import crypto from "crypto";

export class TableService {
  static async createTable(data: {
    restaurant_id: string;
    hall_id: string;
    table_number: string;
  }): Promise<RestaurantTable> {
    const qrToken = crypto.randomBytes(16).toString("hex");

    return await TableRepository.create({
      restaurant_id: data.restaurant_id,
      hall_id: data.hall_id,
      table_number: data.table_number,
      qr_token: qrToken,
    });
  }
  static async getTableByToken(token: string) {
  return await TableRepository.getByToken(token);
}

  static async getHallTables(hallId: string): Promise<RestaurantTable[]> {
    return await TableRepository.getByHall(hallId);
  }
}