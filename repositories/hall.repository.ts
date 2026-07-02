import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Hall } from "@/types/hall";

export class HallRepository {
  static async create(data: {
    restaurant_id: string;
    name: string;
  }): Promise<Hall> {
    const { data: hall, error } = await supabaseAdmin
      .from("halls")
      .insert(data)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    return hall;
  }

  static async getByRestaurant(
    restaurantId: string
  ): Promise<Hall[]> {
    const { data, error } = await supabaseAdmin
      .from("halls")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at");

    if (error) throw new Error(error.message);

    return data;
  }
}