"use client";

import { useAuth } from "@/contexts/AuthContext";
import { getRestaurant, isSuperAdmin } from "@/utils/permissions";
import { useEffect, useState } from "react";

export default function UsersPage() {
  const { profile, loading: authLoading } = useAuth();

  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [halls, setHalls] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

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

  async function loadUsers(restaurantId: string) {
    const res = await fetch(`/api/users/list?restaurant_id=${restaurantId}`);
    const data = await res.json();
    if (!res.ok) return alert(data.error);
    setUsers(data.users || []);
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

    setFullName("");
    setEmail("");
    setPassword("");
    setSelectedTableIds([]);

    await loadUsers(restaurantId);
    alert("Ofisiant yaradıldı.");
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
      loadUsers(restaurant.id);
    }
  }, [authLoading, profile]);

  useEffect(() => {
    setSelectedHallId("");
    setSelectedTableIds([]);
    setTables([]);
    setUsers([]);

    if (selectedRestaurantId) {
      loadHalls(selectedRestaurantId);
      loadUsers(selectedRestaurantId);
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
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">İstifadəçilər</h1>
        <p className="text-slate-500 mt-1">
          Ofisiant yaradın və hansı masalara baxacağını seçin.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 xl:col-span-1">
          <h2 className="text-xl font-bold text-slate-900 mb-5">
            Yeni ofisiant
          </h2>

          <div className="space-y-4">
            {superAdmin ? (
              <select
                className="w-full border border-slate-300 rounded-xl p-3 bg-white text-slate-800"
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
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 text-slate-800">
                <b>Restoran:</b> {restaurant?.name}
              </div>
            )}

            <select
              className="w-full border border-slate-300 rounded-xl p-3 bg-white text-slate-800"
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
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <div className="font-semibold text-slate-900 mb-3">
                  Masalar
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {tables.map((table) => (
                    <button
                      key={table.id}
                      type="button"
                      onClick={() => toggleTable(table.id)}
                      className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                        selectedTableIds.includes(table.id)
                          ? "bg-black text-white border-black"
                          : "bg-white text-slate-700 border-slate-300"
                      }`}
                    >
                      Masa {table.table_number}
                    </button>
                  ))}
                </div>

                {tables.length === 0 && (
                  <p className="text-sm text-slate-500">Bu zalda masa yoxdur.</p>
                )}
              </div>
            )}

            <input
              className="w-full border border-slate-300 rounded-xl p-3"
              placeholder="Ofisiant adı"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            <input
              className="w-full border border-slate-300 rounded-xl p-3"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className="w-full border border-slate-300 rounded-xl p-3"
              placeholder="Şifrə"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              onClick={createUser}
              disabled={loading}
              className="w-full bg-black text-white rounded-xl py-3 font-semibold disabled:opacity-50"
            >
              {loading ? "Yaradılır..." : "Ofisiant yarat"}
            </button>
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                Ofisiantlar
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                Restorana aid yaradılmış ofisiantlar və bağlı masalar.
              </p>
            </div>

            <div className="divide-y divide-slate-200">
              {users.map((userRole) => {
                const user = userRole.profiles;
                const assignments = userRole.waiter_table_assignments || [];

                return (
                  <div key={userRole.user_id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">
                          {user?.full_name}
                        </h3>

                        <p className="text-sm text-slate-500">
                          ID: {userRole.user_id}
                        </p>
                      </div>

                      <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                        WAITER
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {assignments.map((a: any) => (
                        <span
                          key={a.table_id}
                          className="bg-slate-100 border border-slate-200 text-slate-700 rounded-full px-3 py-1 text-sm"
                        >
                          {a.restaurant_tables?.halls?.name || "-"} / Masa{" "}
                          {a.restaurant_tables?.table_number || "-"}
                        </span>
                      ))}

                      {assignments.length === 0 && (
                        <span className="text-slate-400 text-sm">
                          Masa təyin edilməyib.
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {users.length === 0 && (
                <div className="p-6 text-slate-500">
                  Hələ ofisiant yaradılmayıb.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}