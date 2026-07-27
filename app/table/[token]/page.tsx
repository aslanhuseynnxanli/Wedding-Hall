import CustomerMenu from "@/components/CustomerMenu";
import ServiceButtons from "@/components/ServiceButtons";
import { MenuService } from "@/services/menu.service";
import { TableService } from "@/services/table.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Props {
  params: Promise<{
    token: string;
  }>;
}

function getSingleRelation<T>(
  value: T | T[] | null | undefined,
): T | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

type RestaurantRelation = {
  id: string;
  name: string;
  slug: string;
  service_fee_percent: number | string | null;
  address?: string | null;
};

type HallRelation = {
  id: string;
  name: string;
};

export default async function TablePage({
  params,
}: Props) {
  const { token } = await params;

  try {
    const table =
      await TableService.getTableByToken(token);

    const restaurant =
      getSingleRelation<RestaurantRelation>(
        table.restaurants,
      );

    const hall =
      getSingleRelation<HallRelation>(
        table.halls,
      );

    if (!restaurant) {
      throw new Error(
        "Restoran məlumatı tapılmadı.",
      );
    }

    if (!hall) {
      throw new Error(
        "Zal məlumatı tapılmadı.",
      );
    }

    const menu =
      await MenuService.getCustomerMenu(
        table.restaurant_id,
      );

    return (
      <main className="min-h-screen bg-neutral-50">
        <div className="mx-auto max-w-lg">
          <CustomerMenu
            token={token}
            table={{
              id: String(table.id),
              name: String(
                table.table_number,
              ),
            }}
            hall={{
              id: String(hall.id),
              name: hall.name,
            }}
            restaurant={{
              id: String(restaurant.id),
              name: restaurant.name,
              address:
                restaurant.address ?? null,
            }}
            categories={menu}
          />

          <section className="relative z-10 mx-4 -mt-24 mb-36 rounded-[28px] border border-neutral-200 bg-white p-5 shadow-lg">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-400">
                Masa xidməti
              </p>

              <h2 className="mt-2 text-xl font-black text-neutral-950">
                Sizə necə kömək edək?
              </h2>

              <p className="mt-2 text-sm leading-6 text-neutral-500">
                Ofisiant çağırmaq, su və ya
                hesab istəmək üçün aşağıdakı
                düymələrdən istifadə edin.
              </p>
            </div>

            <ServiceButtons
              restaurantId={
                table.restaurant_id
              }
              hallId={table.hall_id}
              tableId={table.id}
            />
          </section>
        </div>
      </main>
    );
  } catch (error) {
    console.error(
      "Table page error:",
      error,
    );

    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100 p-5">
        <div className="w-full max-w-md rounded-[30px] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-2xl font-black text-red-600">
            !
          </div>

          <h1 className="mt-5 text-2xl font-black text-neutral-950">
            Masa tapılmadı
          </h1>

          <p className="mt-2 text-sm leading-6 text-neutral-500">
            QR kod etibarsızdır və ya masa
            hazırda aktiv deyil.
          </p>
        </div>
      </main>
    );
  }
}