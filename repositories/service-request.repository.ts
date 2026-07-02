import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ServiceRequest } from "@/types/service-request";

export class ServiceRequestRepository {
  static async create(data: {
    restaurant_id: string;
    hall_id: string;
    table_id: string;
    request_type: string;
    note?: string;
  }): Promise<ServiceRequest> {
    const { data: request, error } = await supabaseAdmin
      .from("service_requests")
      .insert(data)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    return request;
  }

  static async getByRestaurant(restaurantId: string) {
    const { data, error } = await supabaseAdmin
      .from("service_requests")
      .select(`
        *,
        halls (
          id,
          name
        ),
        restaurant_tables (
          id,
          table_number
        )
      `)
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return data;
  }

  static async getByWaiter(restaurantId: string, waiterId: string) {
    const { data: assignments, error: assignmentError } = await supabaseAdmin
      .from("waiter_table_assignments")
      .select("table_id")
      .eq("restaurant_id", restaurantId)
      .eq("waiter_id", waiterId);

    if (assignmentError) throw new Error(assignmentError.message);

    const tableIds = (assignments || []).map((x) => x.table_id);

    if (tableIds.length === 0) return [];

    const { data, error } = await supabaseAdmin
      .from("service_requests")
      .select(`
        *,
        halls (
          id,
          name
        ),
        restaurant_tables (
          id,
          table_number
        )
      `)
      .eq("restaurant_id", restaurantId)
      .in("table_id", tableIds)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return data;
  }

  static async updateStatus(
    id: string,
    status: "NEW" | "ACCEPTED" | "COMPLETED" | "CANCELLED"
  ) {
    const { data, error } = await supabaseAdmin
      .from("service_requests")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    return data;
  }
}