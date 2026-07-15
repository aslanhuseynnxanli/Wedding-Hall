import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type MenuCategoryRow = {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type MenuItemRow = {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number | string;
  image_url: string | null;
  preparation_area: "KITCHEN" | "WAITER";
  is_active: boolean;
  created_at: string;
};

export class MenuRepository {
  static async getActiveCategories(
    restaurantId: string,
  ): Promise<MenuCategoryRow[]> {
    const { data, error } = await supabaseAdmin
      .from("categories")
      .select(`
        id,
        restaurant_id,
        name,
        sort_order,
        is_active,
        created_at
      `)
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .order("sort_order", {
        ascending: true,
      })
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as MenuCategoryRow[];
  }

  static async getActiveItems(
    restaurantId: string,
  ): Promise<MenuItemRow[]> {
    const { data, error } = await supabaseAdmin
      .from("menu_items")
      .select(`
        id,
        restaurant_id,
        category_id,
        name,
        description,
        price,
        image_url,
        preparation_area,
        is_active,
        created_at
      `)
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .not("category_id", "is", null)
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as MenuItemRow[];
  }
}