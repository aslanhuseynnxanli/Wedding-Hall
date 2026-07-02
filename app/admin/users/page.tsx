"use client";

import { useAuth } from "@/contexts/AuthContext";
import { getRestaurant, isSuperAdmin } from "@/utils/permissions";
import { useEffect, useState } from "react";

export default function UsersPage() {
  const { profile, loading: authLoading } = useAuth();

  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [halls, setHalls] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);

  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [selectedHallId, setSelectedHallId] = useState("");
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const superAdmin = isSuperAdmin(profile);
  const restaurant = getRestaurant(profile);

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

    setTables(data.tables || []);
  }

  function toggleTable(tableId: string) {
    setSelectedTableIds((prev) =>
      prev.includes(tableId)
        ? prev.filter((id) => id !== tableId)
        : [...prev, tableId]
    );
  }

  async function createUser() {
    const restaurantId = superAdmin ? selectedRestaurantId : restaurant?.id;

    if (!restaurantId || !fullName || !email || !password) {
      alert("Bütün əsas xanalar doldurulmalıdır.");
      return;
    }

    if (selectedTableIds.length === 0) {
      alert("Ofisiant üçün ən azı 1 masa seçilməlidir.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/users/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fullName,
        email,
        password,
        restaurantId,
        roleName: "WAITER",
        tableIds: selectedTableIds,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      alert(data.error);
      return;
    }

    alert("Ofisiant yaradıldı.");

    setFullName("");
    setEmail("");
    setPassword("");
    setSelectedTableIds([]);
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
    setSelectedTableIds([]);
    setTables([]);

    if (selectedRestaurantId) {
      loadHalls(selectedRestaurantId);
    } else {
      setHalls([]);
    }
  }, [selectedRestaurantId]);

  useEffect(() => {
    setSelectedTableIds([]);
    setTables([]);

    if (selectedHallId) {
      loadTables(selectedHallId);
    }
  }, [selectedHallId]);

  if (authLoading) return <div className="p-8">Yüklənir...</div>;

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">İstifadəçilər</h1>

      <div className="bg-white rounded-xl shadow p-6 max-w-xl space-y-4">
        {superAdmin ? (
          <select
            className="w-full border rounded-lg p-3"
            value={selectedRestaurantId}
            onChange={(e) => setSelectedRestaurantId(e.target.value)}
          >
            <option value="">Restoran seç</option>

            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="border rounded-lg p-3 bg-gray-50">
            <b>Restoran:</b> {restaurant?.name}
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

        {selectedHallId && (
          <div className="border rounded-lg p-3 space-y-2">
            <div className="font-semibold">Masalar</div>

            {tables.length === 0 && (
              <div className="text-sm text-gray-500">Bu zalda masa yoxdur.</div>
            )}

            {tables.map((table) => (
              <label
                key={table.id}
                className="flex items-center gap-2 border rounded-lg p-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedTableIds.includes(table.id)}
                  onChange={() => toggleTable(table.id)}
                />

                <span>Masa {table.table_number}</span>
              </label>
            ))}
          </div>
        )}

        <input
          className="w-full border rounded-lg p-3"
          placeholder="Ofisiant adı"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <input
          className="w-full border rounded-lg p-3"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full border rounded-lg p-3"
          placeholder="Şifrə"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={createUser}
          disabled={loading}
          className="bg-black text-white px-5 py-3 rounded-lg disabled:opacity-50"
        >
          {loading ? "Yaradılır..." : "Ofisiant yarat"}
        </button>
      </div>
    </div>
  );
}