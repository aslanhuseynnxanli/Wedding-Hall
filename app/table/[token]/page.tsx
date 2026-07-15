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
  service_fee_percent:
    | number
    | string
    | null;
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
      await TableService.getTableByToken(
        token,
      );

    const restaurant =
      getSingleRelation<RestaurantRelation>(
        table.restaurants,
      );

    const hall =
      getSingleRelation<HallRelation>(
        table.halls,
      );

    if (!restaurant || !hall) {
      throw new Error(
        "Restoran və ya zal məlumatı tapılmadı.",
      );
    }

    const menu =
      await MenuService.getCustomerMenu(
        table.restaurant_id,
      );

    const serviceFeePercent = Number(
      restaurant.service_fee_percent ?? 0,
    );

    return (
      <main className="min-h-screen bg-gray-100 pb-28">
        <div className="mx-auto max-w-xl px-4 py-5 sm:px-6 sm:py-8">
          <header className="overflow-hidden rounded-[2rem] bg-gray-950 p-6 text-white shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                  Xoş gəlmisiniz
                </p>

                <h1 className="mt-2 truncate text-3xl font-black">
                  {restaurant.name}
                </h1>

                <p className="mt-2 text-sm font-semibold text-gray-300">
                  {hall.name}
                </p>
              </div>

              <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-3xl bg-white text-gray-950">
                <span className="text-xs font-bold text-gray-500">
                  Masa
                </span>

                <span className="mt-1 text-3xl font-black">
                  {table.table_number}
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-gray-200">
                QR masa xidməti
              </span>

              {serviceFeePercent > 0 ? (
                <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-gray-200">
                  Servis haqqı:
                  {" "}
                  {serviceFeePercent}%
                </span>
              ) : null}
            </div>
          </header>

          <section className="mt-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Masa xidməti
              </p>

              <h2 className="mt-1 text-xl font-black text-gray-950">
                Sizə necə kömək edək?
              </h2>

              <p className="mt-2 text-sm leading-5 text-gray-500">
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

          <section className="mt-7">
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Restoran menyusu
              </p>

              <h2 className="mt-1 text-3xl font-black text-gray-950">
                Menyu
              </h2>

              <p className="mt-2 text-sm leading-5 text-gray-500">
                Məhsulları seçin, səbətə əlavə
                edin və sifarişi təsdiqləyin.
              </p>
            </div>

            <CustomerMenu
              token={token}
              categories={menu}
              serviceFeePercent={
                serviceFeePercent
              }
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
      <main className="flex min-h-screen items-center justify-center bg-gray-100 p-5">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-2xl font-black text-red-600">
            !
          </div>

          <h1 className="mt-5 text-2xl font-black text-gray-950">
            Masa tapılmadı
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            QR kod etibarsızdır və ya masa
            hazırda aktiv deyil.
          </p>
        </div>
      </main>
    );
  }
}