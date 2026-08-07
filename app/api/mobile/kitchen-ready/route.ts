import {
  sendKitchenReadyNotification,
} from "@/lib/push/sendRestaurantPush";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  NextRequest,
  NextResponse,
} from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestBody = {
  itemId?: unknown;
};

type RoleRow = {
  user_id: string;
  roles:
    | {
        name?: string | null;
      }
    | Array<{
        name?: string | null;
      }>
    | null;
};

type OrderItemStatus =
  | "NEW"
  | "PREPARING"
  | "READY"
  | "SERVED"
  | "CANCELLED";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeRoleName(value: string) {
  return value
    .trim()
    .toLocaleUpperCase("az-AZ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Ə/g, "E")
    .replace(/İ/g, "I")
    .replace(/Ş/g, "S")
    .replace(/Ç/g, "C")
    .replace(/Ğ/g, "G")
    .replace(/Ö/g, "O")
    .replace(/Ü/g, "U")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getRoleName(row: RoleRow) {
  if (Array.isArray(row.roles)) {
    return row.roles[0]?.name ?? "";
  }

  return row.roles?.name ?? "";
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

function getBearerToken(request: NextRequest) {
  const authorization =
    request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const [scheme, token] =
    authorization.trim().split(/\s+/);

  if (
    scheme?.toLowerCase() !== "bearer" ||
    !token
  ) {
    return null;
  }

  return token;
}

async function syncOrderStatus(orderId: string) {
  const {
    data: itemRows,
    error: itemRowsError,
  } = await supabaseAdmin
    .from("order_items")
    .select("status")
    .eq("order_id", orderId);

  if (itemRowsError) {
    console.error(
      "Kitchen ready order status lookup error:",
      itemRowsError,
    );

    return;
  }

  const statuses = (itemRows ?? []).map(
    (row) => row.status as OrderItemStatus,
  );

  const activeStatuses = statuses.filter(
    (status) => status !== "CANCELLED",
  );

  let nextStatus = "NEW";
  let completedAt: string | null = null;

  if (activeStatuses.length === 0) {
    nextStatus = "CANCELLED";
  } else if (
    activeStatuses.every(
      (status) => status === "SERVED",
    )
  ) {
    nextStatus = "COMPLETED";
    completedAt = new Date().toISOString();
  } else if (
    activeStatuses.every(
      (status) =>
        status === "READY" ||
        status === "SERVED",
    )
  ) {
    nextStatus = "READY";
  } else if (
    activeStatuses.some(
      (status) => status === "READY",
    )
  ) {
    nextStatus = "PARTIALLY_READY";
  } else if (
    activeStatuses.some(
      (status) => status === "PREPARING",
    )
  ) {
    nextStatus = "IN_PROGRESS";
  }

  const updatePayload: {
    status: string;
    updated_at: string;
    completed_at?: string | null;
  } = {
    status: nextStatus,
    updated_at: new Date().toISOString(),
  };

  if (nextStatus === "COMPLETED") {
    updatePayload.completed_at = completedAt;
  }

  const { error: orderUpdateError } =
    await supabaseAdmin
      .from("orders")
      .update(updatePayload)
      .eq("id", orderId);

  if (orderUpdateError) {
    console.error(
      "Kitchen ready parent order update error:",
      orderUpdateError,
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    const body = (await request
      .json()
      .catch(() => null)) as RequestBody | null;

    const itemId =
      typeof body?.itemId === "string"
        ? body.itemId.trim()
        : "";

    if (
      !itemId ||
      !UUID_PATTERN.test(itemId)
    ) {
      return NextResponse.json(
        {
          error:
            "Məhsul ID məlumatı düzgün deyil.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const accessToken =
      getBearerToken(request);

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "Giriş sessiyası tapılmadı.",
        },
        {
          status: 401,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const {
      data: authData,
      error: authError,
    } = await supabaseAdmin.auth.getUser(
      accessToken,
    );

    if (
      authError ||
      !authData.user
    ) {
      console.error(
        "Kitchen ready authentication error:",
        authError,
      );

      return NextResponse.json(
        {
          error:
            "Giriş sessiyası etibarsızdır.",
        },
        {
          status: 401,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const {
      data: item,
      error: itemError,
    } = await supabaseAdmin
      .from("order_items")
      .select(`
        id,
        order_id,
        restaurant_id,
        item_name,
        preparation_area,
        status
      `)
      .eq("id", itemId)
      .maybeSingle();

    if (itemError) {
      console.error(
        "Kitchen ready item lookup error:",
        itemError,
      );

      return NextResponse.json(
        {
          error:
            "Məhsul məlumatı oxunmadı.",
        },
        {
          status: 500,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    if (!item) {
      return NextResponse.json(
        {
          error:
            "Sifariş məhsulu tapılmadı.",
        },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    if (
      item.preparation_area !== "KITCHEN"
    ) {
      return NextResponse.json(
        {
          error:
            "Bu məhsul mətbəxə aid deyil.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const {
      data: userRoleRows,
      error: userRoleError,
    } = await supabaseAdmin
      .from("user_roles")
      .select(`
        user_id,
        roles (
          name
        )
      `)
      .eq(
        "user_id",
        authData.user.id,
      )
      .eq(
        "restaurant_id",
        item.restaurant_id,
      );

    if (userRoleError) {
      console.error(
        "Kitchen ready role lookup error:",
        userRoleError,
      );

      return NextResponse.json(
        {
          error:
            "İstifadəçi rolu yoxlanılmadı.",
        },
        {
          status: 500,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const hasKitchenRole = (
      userRoleRows ?? []
    ).some((rawRow) => {
      const row =
        rawRow as unknown as RoleRow;

      return isKitchenRole(
        getRoleName(row),
      );
    });

    if (!hasKitchenRole) {
      return NextResponse.json(
        {
          error:
            "Bu əməliyyat üçün mətbəx icazəniz yoxdur.",
        },
        {
          status: 403,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    if (item.status === "READY") {
      return NextResponse.json(
        {
          success: true,
          alreadyReady: true,
          itemId: item.id,
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    if (
      item.status === "SERVED" ||
      item.status === "CANCELLED"
    ) {
      return NextResponse.json(
        {
          error:
            "Bu məhsulun statusu artıq dəyişdirilə bilməz.",
        },
        {
          status: 409,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const {
      data: order,
      error: orderError,
    } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        restaurant_id,
        table_id,
        waiter_id
      `)
      .eq("id", item.order_id)
      .maybeSingle();

    if (orderError) {
      console.error(
        "Kitchen ready order lookup error:",
        orderError,
      );

      return NextResponse.json(
        {
          error:
            "Sifariş məlumatı oxunmadı.",
        },
        {
          status: 500,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    if (!order) {
      return NextResponse.json(
        {
          error:
            "Sifariş tapılmadı.",
        },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const now =
      new Date().toISOString();

    const {
      data: updatedItem,
      error: updateError,
    } = await supabaseAdmin
      .from("order_items")
      .update({
        status: "READY",
        ready_at: now,
        updated_at: now,
      })
      .eq("id", item.id)
      .in(
        "status",
        ["NEW", "PREPARING"],
      )
      .select(`
        id,
        order_id,
        restaurant_id,
        item_name,
        status,
        ready_at
      `)
      .maybeSingle();

    if (updateError) {
      console.error(
        "Kitchen ready item update error:",
        updateError,
      );

      return NextResponse.json(
        {
          error:
            "Məhsul hazır kimi qeyd edilmədi.",
        },
        {
          status: 500,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    if (!updatedItem) {
      return NextResponse.json(
        {
          error:
            "Məhsulun statusu artıq dəyişdirilib.",
        },
        {
          status: 409,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    await syncOrderStatus(
      updatedItem.order_id,
    );

    let pushResult: {
      recipientCount: number;
      tokenCount: number;
    } | null = null;

    try {
      pushResult =
        await sendKitchenReadyNotification({
          restaurantId:
            order.restaurant_id,
          tableId:
            order.table_id,
          orderId:
            order.id,
          itemId:
            updatedItem.id,
          itemName:
            updatedItem.item_name,
          waiterId:
            order.waiter_id ?? null,
        });
    } catch (pushError) {
      console.error(
        "Kitchen ready push error:",
        pushError,
      );
    }

    return NextResponse.json(
      {
        success: true,
        item: updatedItem,
        push: pushResult,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "Kitchen ready route error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Məhsul hazır edilərkən gözlənilməz xəta baş verdi.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}