import { firebaseMessaging } from "@/lib/firebaseAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export class NotificationService {
  static async sendToWaitersByTable(data: {
    restaurantId: string;
    tableId: string;
    title: string;
    body: string;
  }) {
    const { data: assignments, error: assignmentError } = await supabaseAdmin
      .from("waiter_table_assignments")
      .select("waiter_id")
      .eq("restaurant_id", data.restaurantId)
      .eq("table_id", data.tableId);

    if (assignmentError) {
      throw new Error(assignmentError.message);
    }

    const waiterIds = (assignments || []).map((x) => x.waiter_id);

    if (waiterIds.length === 0) return;

    const { data: tokens, error: tokenError } = await supabaseAdmin
      .from("fcm_tokens")
      .select("token")
      .eq("restaurant_id", data.restaurantId)
      .in("user_id", waiterIds);

    if (tokenError) {
      throw new Error(tokenError.message);
    }

    const tokenList = (tokens || []).map((x) => x.token);

    if (tokenList.length === 0) return;

    await firebaseMessaging.sendEachForMulticast({
      tokens: tokenList,
      notification: {
        title: data.title,
        body: data.body,
      },
      webpush: {
        notification: {
          icon: "/icon.png",
        },
        fcmOptions: {
          link: "/admin/service-requests",
        },
      },
    });
  }
}