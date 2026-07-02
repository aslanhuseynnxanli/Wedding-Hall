"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getRestaurant, isSuperAdmin } from "@/utils/permissions";
import { generateQrDataUrl } from "@/utils/qr";

export default function TablesPage() {
  const { profile, loading: authLoading } = useAuth();

  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [halls, setHalls] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});

  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [selectedHallId, setSelectedHallId] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const restaurant = getRestaurant(profile);
  const superAdmin = isSuperAdmin(profile);

  function getTableUrl(token: string) {
    return `${window.location.origin}/table/${token}`;
  }

  async function buildQrImages(tableList: any[]) {
    const result: Record<string, string> = {};

    for (const table of tableList) {
      result[table.id] = await generateQrDataUrl(getTableUrl(table.qr_token));
    }

    setQrImages(result);
  }

  async function loadRestaurants() {
    const res = await fetch("/api/super-admin/restaurants/list");
    const data = await res.json();
    if (!res.ok) return alert(data.error);
    setRestaurants(data.restaurants || []);
  }

  async function loadHalls(restaurantId: string) {
    const res = await fetch(`/api/halls/list?restaurant_id=${restaurantId}`);
    const data = await res.json();
    if (!res.ok) return alert(data.error);
    setHalls(data.halls || []);
  }

  async function loadTables(hallId: string) {
    const res = await fetch(`/api/tables/list?hall_id=${hallId}`);
    const data = await res.json();
    if (!res.ok) return alert(data.error);

    const tableList = data.tables || [];
    setTables(tableList);
    buildQrImages(tableList);
  }

  async function createTable() {
    if (!selectedRestaurantId || !selectedHallId || !tableNumber) {
      alert("Zal və masa nömrəsi seçilməlidir.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/tables/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        restaurant_id: selectedRestaurantId,
        hall_id: selectedHallId,
        table_number: tableNumber,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) return alert(data.error);

    setTableNumber("");
    loadTables(selectedHallId);
  }

  useEffect(() => {
    if (authLoading) return;

    if (superAdmin) {
      loadRestaurants();
      return;
    }

    if (restaurant?.id) {
      setSelectedRestaurantId(restaurant.id);
      loadHalls(restaurant.id);
    }
  }, [authLoading, profile]);

  useEffect(() => {
    setSelectedHallId("");
    setTables([]);
    setQrImages({});

    if (selectedRestaurantId) {
      loadHalls(selectedRestaurantId);
    } else {
      setHalls([]);
    }
  }, [selectedRestaurantId]);

  useEffect(() => {
    setTables([]);
    setQrImages({});

    if (selectedHallId) {
      loadTables(selectedHallId);
    }
  }, [selectedHallId]);

  if (authLoading) return <div className="p-8">Yüklənir...</div>;
  if (!profile) return <div className="p-8">Profil tapılmadı.</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Masalar və QR kodlar</h1>

      <div className="bg-white rounded-xl shadow p-6 max-w-xl space-y-4">
        {superAdmin && (
          <select
            className="w-full border rounded-lg p-3"
            value={selectedRestaurantId}
            onChange={(e) => setSelectedRestaurantId(e.target.value)}
          >
            <option value="">Restoran seç</option>
            {restaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>
                {restaurant.name}
              </option>
            ))}
          </select>
        )}

        {!superAdmin && restaurant && (
          <div className="border rounded-lg p-3 bg-gray-50">
            <b>Restoran:</b> {restaurant.name}
          </div>
        )}

        <select
          className="w-full border rounded-lg p-3"
          value={selectedHallId}
          onChange={(e) => setSelectedHallId(e.target.value)}
          disabled={!selectedRestaurantId}
        >
          <option value="">Zal seç</option>
          {halls.map((hall) => (
            <option key={hall.id} value={hall.id}>
              {hall.name}
            </option>
          ))}
        </select>

        <input
          className="w-full border rounded-lg p-3"
          placeholder="Masa nömrəsi"
          value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
        />

        <button
          onClick={createTable}
          disabled={loading}
          className="bg-black text-white px-5 py-3 rounded-lg disabled:opacity-50"
        >
          {loading ? "Yaradılır..." : "Masa yarat"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {tables.map((table) => (
          <div key={table.id} className="bg-white rounded-xl shadow p-5">
            <h2 className="text-xl font-bold mb-3">Masa {table.table_number}</h2>

            {qrImages[table.id] && (
              <img
                src={qrImages[table.id]}
                alt={`Masa ${table.table_number} QR`}
                className="w-40 h-40 mb-3"
              />
            )}

            <p className="text-xs font-mono break-all text-gray-600">
              {typeof window !== "undefined" ? getTableUrl(table.qr_token) : ""}
            </p>

            <a
              href={qrImages[table.id]}
              download={`masa-${table.table_number}-qr.png`}
              className="inline-block mt-4 bg-black text-white px-4 py-2 rounded-lg text-sm"
            >
              QR yüklə
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}