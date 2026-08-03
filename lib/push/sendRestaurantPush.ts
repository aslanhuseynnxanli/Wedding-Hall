import { supabaseAdmin } from "@/lib/supabaseAdmin";

const EXPO_PUSH_URL =
  "https://exp.host/--/api/v2/push/send";

const ANDROID_CHANNEL_ID =
  "restaurant-orders-sound-v2";

const NOTIFICATION_SOUND =
  "restaurant_order.wav";

const EXPO_BATCH_SIZE = 100;

type RestaurantRoleRow = {
  user_id: string;
  roles:
    | { name?: string | null }
    | Array<{ name?: string | null }>
    | null;
};

type ExpoPushTicket = {
  status?: "ok" | "error";
  id?: string;
  message?: string;
  details?: {
    error?: string;
  };
};

type ExpoPushResponse = {
  data?: ExpoPushTicket[];
  errors?: Array<{
    code?: string;
    message?: string;
  }>;
};

type SendNewOrderNotificationInput = {
  restaurantId: string;
  tableId: string;
  orderId: string;
  itemCount: number;
};

function normalizeRoleName(value: string) {
  return value
    .trim()
    .toLocaleUpperCase("az-AZ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Ə/g, "E")
    .replace(/İ/g, "I")
    .replace(/İ/g, "I")
    .replace(/I/g, "I")
    .replace(/Ş/g, "S")
    .replace(/Ç/g, "C")
    .replace(/Ğ/g, "G")
    .replace(/Ö/g, "O")
    .replace(/Ü/g, "U")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getRoleName(row: RestaurantRoleRow) {
  if (Array.isArray(row.roles)) {
    return row.roles[0]?.name ?? "";
  }

  return row.roles?.name ?? "";
}

function isWaiterRole(roleName: string) {
  const role = normalizeRoleName(roleName);

  return (
    role.includes("WAITER") ||
    role.includes("OFISIANT") ||
    role.includes("GARSON") ||
    role === "SERVER"
  );
}

function isKitchenRole(roleName: string) {
  const role = normalizeRoleName(roleName);

  return (
    role.includes("KITCHEN") ||
    role.includes("METBEX") ||
    role.includes("ASPAZ") ||
    role.includes("CHEF") ||
    role.includes("COOK")
  );
}

function isExpoPushToken(token: string) {
  return (
    token.startsWith("ExpoPushToken[") ||
    token.startsWith("ExponentPushToken[")
  );
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

async function getRecipientUserIds(
  restaurantId: string,
  tableId: string,
) {
  const [assignmentResult, roleResult] =
    await Promise.all([
      supabaseAdmin
        .from("waiter_table_assignments")
        .select("waiter_id")
        .eq("restaurant_id", restaurantId)
        .eq("table_id", tableId),

      supabaseAdmin
        .from("user_roles")
        .select(
          `
            user_id,
            roles (
              name
            )
          `,
        )
        .eq("restaurant_id", restaurantId),
    ]);

  if (assignmentResult.error) {
    console.error(
      "Waiter assignment lookup error:",
      assignmentResult.error,
    );
  }

  if (roleResult.error) {
    console.error(
      "Restaurant role lookup error:",
      roleResult.error,
    );
  }

  const assignedWaiterIds = new Set(
    (assignmentResult.data ?? [])
      .map((row) => row.waiter_id)
      .filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0,
      ),
  );

  const waiterRoleUserIds = new Set<string>();
  const kitchenUserIds = new Set<string>();

  for (const rawRow of roleResult.data ?? []) {
    const row = rawRow as unknown as RestaurantRoleRow;
    const roleName = getRoleName(row);

    if (!row.user_id || !roleName) continue;

    if (isWaiterRole(roleName)) {
      waiterRoleUserIds.add(row.user_id);
    }

    if (isKitchenRole(roleName)) {
      kitchenUserIds.add(row.user_id);
    }
  }

  const waiterRecipients =
    assignedWaiterIds.size > 0
      ? assignedWaiterIds
      : waiterRoleUserIds;

  return Array.from(
    new Set([
      ...waiterRecipients,
      ...kitchenUserIds,
    ]),
  );
}

async function deactivateInvalidTokens(
  tokens: string[],
) {
  if (!tokens.length) return;

  const { error } = await supabaseAdmin
    .from("device_push_tokens")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .in("expo_push_token", tokens);

  if (error) {
    console.error(
      "Invalid push token deactivation error:",
      error,
    );
  }
}

async function sendPushBatch(
  tokens: string[],
  input: SendNewOrderNotificationInput,
) {
  const messages = tokens.map((token) => ({
    to: token,
    title: "Yeni sifariş",
    body:
      input.itemCount > 1
        ? `${input.itemCount} məhsuldan ibarət yeni sifariş daxil oldu.`
        : "Yeni müştəri sifarişi daxil oldu.",
    sound: NOTIFICATION_SOUND,
    channelId: ANDROID_CHANNEL_ID,
    priority: "high" as const,
    data: {
      type: "NEW_CUSTOMER_ORDER",
      restaurantId: input.restaurantId,
      tableId: input.tableId,
      orderId: input.orderId,
    },
  }));

  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "Accept-Encoding": "gzip, deflate",
    },
    body: JSON.stringify(messages),
  });

  const payload = (await response
    .json()
    .catch(() => null)) as ExpoPushResponse | null;

  if (!response.ok) {
    throw new Error(
      payload?.errors?.[0]?.message ??
        `Expo push request failed: ${response.status}`,
    );
  }

  const invalidTokens: string[] = [];

  (payload?.data ?? []).forEach((ticket, index) => {
    if (ticket.status !== "error") return;

    console.error("Expo push ticket error:", {
      token: tokens[index],
      message: ticket.message,
      details: ticket.details,
    });

    if (
      ticket.details?.error ===
      "DeviceNotRegistered"
    ) {
      invalidTokens.push(tokens[index]);
    }
  });

  await deactivateInvalidTokens(invalidTokens);
}

export async function sendNewOrderNotification(
  input: SendNewOrderNotificationInput,
) {
  const userIds = await getRecipientUserIds(
    input.restaurantId,
    input.tableId,
  );

  if (!userIds.length) {
    console.warn(
      "New order push skipped: recipient user not found.",
      input,
    );

    return {
      recipientCount: 0,
      tokenCount: 0,
    };
  }

  const { data: tokenRows, error: tokenError } =
    await supabaseAdmin
      .from("device_push_tokens")
      .select("expo_push_token")
      .in("user_id", userIds)
      .eq("is_active", true);

  if (tokenError) {
    throw tokenError;
  }

  const tokens = Array.from(
    new Set(
      (tokenRows ?? [])
        .map((row) => row.expo_push_token)
        .filter(
          (token): token is string =>
            typeof token === "string" &&
            isExpoPushToken(token),
        ),
    ),
  );

  if (!tokens.length) {
    console.warn(
      "New order push skipped: active device token not found.",
      {
        ...input,
        userIds,
      },
    );

    return {
      recipientCount: userIds.length,
      tokenCount: 0,
    };
  }

  for (const tokenBatch of chunkArray(
    tokens,
    EXPO_BATCH_SIZE,
  )) {
    await sendPushBatch(tokenBatch, input);
  }

  return {
    recipientCount: userIds.length,
    tokenCount: tokens.length,
  };
}
type SendKitchenReadyNotificationInput = {
  restaurantId: string;
  tableId: string;
  orderId: string;
  itemId: string;
  itemName: string;
  waiterId?: string | null;
};

async function getWaiterRecipientUserIds(
  restaurantId: string,
  tableId: string,
  waiterId?: string | null,
) {
  const recipientUserIds = new Set<string>();

  /*
   * Sifarişdə birbaşa waiter_id varsa,
   * birinci onu əlavə edirik.
   */
  if (
    typeof waiterId === "string" &&
    waiterId.trim().length > 0
  ) {
    recipientUserIds.add(waiterId);
  }

  /*
   * Masa üçün təyin edilmiş ofisiantı tapırıq.
   */
  const {
    data: assignmentRows,
    error: assignmentError,
  } = await supabaseAdmin
    .from("waiter_table_assignments")
    .select("waiter_id")
    .eq("restaurant_id", restaurantId)
    .eq("table_id", tableId);

  if (assignmentError) {
    console.error(
      "Kitchen ready waiter assignment lookup error:",
      assignmentError,
    );
  }

  for (const row of assignmentRows ?? []) {
    if (
      typeof row.waiter_id === "string" &&
      row.waiter_id.length > 0
    ) {
      recipientUserIds.add(row.waiter_id);
    }
  }

  /*
   * Birbaşa ofisiant tapılmasa, restoranın
   * ofisiant rolundakı istifadəçilərini götürürük.
   */
  if (recipientUserIds.size === 0) {
    const {
      data: roleRows,
      error: roleError,
    } = await supabaseAdmin
      .from("user_roles")
      .select(`
        user_id,
        roles (
          name
        )
      `)
      .eq("restaurant_id", restaurantId);

    if (roleError) {
      console.error(
        "Kitchen ready waiter role lookup error:",
        roleError,
      );
    }

    for (const rawRow of roleRows ?? []) {
      const row =
        rawRow as unknown as RestaurantRoleRow;

      const roleName = getRoleName(row);

      if (
        row.user_id &&
        roleName &&
        isWaiterRole(roleName)
      ) {
        recipientUserIds.add(row.user_id);
      }
    }
  }

  return Array.from(recipientUserIds);
}

async function sendKitchenReadyBatch(
  tokens: string[],
  input: SendKitchenReadyNotificationInput,
) {
  const messages = tokens.map((token) => ({
    to: token,
    title: "Sifariş hazırdır",
    body: `${input.itemName} hazırdır. Masaya təqdim edə bilərsiniz.`,
    sound: NOTIFICATION_SOUND,
    channelId: ANDROID_CHANNEL_ID,
    priority: "high" as const,
    data: {
      type: "KITCHEN_ITEM_READY",
      restaurantId: input.restaurantId,
      tableId: input.tableId,
      orderId: input.orderId,
      itemId: input.itemId,
    },
  }));

  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "Accept-Encoding": "gzip, deflate",
    },
    body: JSON.stringify(messages),
  });

  const payload = (await response
    .json()
    .catch(() => null)) as ExpoPushResponse | null;

  if (!response.ok) {
    throw new Error(
      payload?.errors?.[0]?.message ??
        `Expo push request failed: ${response.status}`,
    );
  }

  const invalidTokens: string[] = [];

  (payload?.data ?? []).forEach(
    (ticket, index) => {
      if (ticket.status !== "error") {
        return;
      }

      console.error(
        "Kitchen ready Expo push ticket error:",
        {
          token: tokens[index],
          message: ticket.message,
          details: ticket.details,
        },
      );

      if (
        ticket.details?.error ===
        "DeviceNotRegistered"
      ) {
        invalidTokens.push(tokens[index]);
      }
    },
  );

  await deactivateInvalidTokens(invalidTokens);
}

export async function sendKitchenReadyNotification(
  input: SendKitchenReadyNotificationInput,
) {
  const userIds =
    await getWaiterRecipientUserIds(
      input.restaurantId,
      input.tableId,
      input.waiterId,
    );

  if (!userIds.length) {
    console.warn(
      "Kitchen ready push skipped: waiter not found.",
      input,
    );

    return {
      recipientCount: 0,
      tokenCount: 0,
    };
  }

  const {
    data: tokenRows,
    error: tokenError,
  } = await supabaseAdmin
    .from("device_push_tokens")
    .select("expo_push_token")
    .in("user_id", userIds)
    .eq("is_active", true);

  if (tokenError) {
    throw tokenError;
  }

  const tokens = Array.from(
    new Set(
      (tokenRows ?? [])
        .map((row) => row.expo_push_token)
        .filter(
          (token): token is string =>
            typeof token === "string" &&
            isExpoPushToken(token),
        ),
    ),
  );

  if (!tokens.length) {
    console.warn(
      "Kitchen ready push skipped: waiter token not found.",
      {
        ...input,
        userIds,
      },
    );

    return {
      recipientCount: userIds.length,
      tokenCount: 0,
    };
  }

  for (const tokenBatch of chunkArray(
    tokens,
    EXPO_BATCH_SIZE,
  )) {
    await sendKitchenReadyBatch(
      tokenBatch,
      input,
    );
  }

  return {
    recipientCount: userIds.length,
    tokenCount: tokens.length,
  };
}
