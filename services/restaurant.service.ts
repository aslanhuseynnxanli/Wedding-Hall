import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { RestaurantRepository } from "@/repositories/restaurant.repository";
import { CreateRestaurantWithAdminInput } from "@/types/user";

export class RestaurantService {
  static async createRestaurantWithAdmin(input: CreateRestaurantWithAdminInput) {
    const restaurant = await RestaurantRepository.create({
      name: input.restaurantName,
      slug: input.slug,
    });

    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: input.adminEmail,
        password: input.adminPassword,
        email_confirm: true,
      });

    if (authError || !authUser.user) {
      throw new Error(authError?.message || "Admin user yaradıla bilmədi.");
    }

    const userId = authUser.user.id;

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: userId,
      full_name: input.adminName,
    });

    if (profileError) {
      throw new Error(profileError.message);
    }

    const { data: role, error: roleError } = await supabaseAdmin
      .from("roles")
      .select("id")
      .eq("name", "RESTAURANT_ADMIN")
      .single();

    if (roleError || !role) {
      throw new Error("RESTAURANT_ADMIN rolu tapılmadı.");
    }

    const { error: userRoleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        restaurant_id: restaurant.id,
        role_id: role.id,
      });

    if (userRoleError) {
      throw new Error(userRoleError.message);
    }

    return restaurant;
  }
}