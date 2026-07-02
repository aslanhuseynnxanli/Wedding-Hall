import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { RestaurantTable } from "@/types/table";

export class TableRepository {
  static async create(data: {
    restaurant_id: string;
    hall_id: string;
    table_number: string;
    qr_token: string;
  }): Promise<RestaurantTable> {
    const { data: table, error } = await supabaseAdmin
      .from("restaurant_tables")
      .insert(data)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    return table;
  }

  static async getByHall(hallId: string): Promise<RestaurantTable[]> {
    const { data, error } = await supabaseAdmin
      .from("restaurant_tables")
      .select("*")
      .eq("hall_id", hallId)
      .order("created_at");

    if (error) throw new Error(error.message);

    return data;
  }
  static async getByToken(token: string) {
  const { data, error } = await supabaseAdmin
    .from("restaurant_tables")
    .select(`
      *,
      halls (
        id,
        name
      ),
      restaurants (
        id,
        name,
        slug
      )
    `)
    .eq("qr_token", token)
    .single();

  if (error) throw new Error(error.message);

  return data;
}
}