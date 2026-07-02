import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Restaurant } from "@/types/restaurant";

export class RestaurantRepository {
  static async create(data: {
    name: string;
    slug: string;
  }): Promise<Restaurant> {
    const { data: restaurant, error } = await supabaseAdmin
      .from("restaurants")
      .insert(data)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    return restaurant;
  }

  static async getAll(): Promise<Restaurant[]> {
    const { data, error } = await supabaseAdmin
      .from("restaurants")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return data;
  }

  static async getById(id: string): Promise<Restaurant | null> {
    const { data, error } = await supabaseAdmin
      .from("restaurants")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;

    return data;
  }

  static async update(
    id: string,
    data: Partial<Restaurant>
  ): Promise<Restaurant> {
    const { data: restaurant, error } = await supabaseAdmin
      .from("restaurants")
      .update(data)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    return restaurant;
  }

  static async delete(id: string) {
    const { error } = await supabaseAdmin
      .from("restaurants")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);
  }
}