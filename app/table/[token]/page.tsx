import { TableService } from "@/services/table.service";
import ServiceButtons from "@/components/ServiceButtons";

interface Props {
  params: Promise<{
    token: string;
  }>;
}

export default async function TablePage({ params }: Props) {
  const { token } = await params;

  try {
    const table = await TableService.getTableByToken(token);

    return (
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-xl mx-auto p-8">
          <div className="bg-white rounded-xl shadow p-6">
            <h1 className="text-3xl font-bold">
              {table.restaurants.name}
            </h1>

            <p className="mt-2">{table.halls.name}</p>

            <h2 className="text-2xl mt-4 font-semibold">
              Masa {table.table_number}
            </h2>
            <ServiceButtons
  restaurantId={table.restaurant_id}
  hallId={table.hall_id}
  tableId={table.id}
/>
          </div>
        </div>
      </div>
    );
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center text-2xl">
        Masa tapılmadı
      </div>
    );
  }
}