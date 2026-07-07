"use client";

import { useAuth } from "@/contexts/AuthContext";
import { getRestaurant, isSuperAdmin } from "@/utils/permissions";
import { useEffect, useMemo, useState } from "react";

export default function RequestLogsPage() {
  const { profile, loading: authLoading } = useAuth();

  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [openWaiter, setOpenWaiter] = useState<string | null>(null);

  const superAdmin = isSuperAdmin(profile);
  const restaurant = getRestaurant(profile);

  const groupedLogs = useMemo(() => {
    const groups: Record<string, any[]> = {};

    logs.forEach((log) => {
      const waiterName =
        log.completed_profile?.full_name ||
        log.accepted_profile?.full_name ||
        "Naməlum";

      if (!groups[waiterName]) groups[waiterName] = [];
      groups[waiterName].push(log);
    });

    return groups;
  }, [logs]);

  async function loadRestaurants() {
    const res = await fetch("/api/super-admin/restaurants/list");
    const data = await res.json();

    if (!res.ok) return alert(data.error);

    setRestaurants(data.restaurants || []);
  }

  async function loadLogs(restaurantId: string) {
    if (!restaurantId) return;

    const res = await fetch(
      `/api/service-requests/logs?restaurant_id=${restaurantId}`
    );

    const data = await res.json();

    if (!res.ok) return alert(data.error);

    setLogs(data.logs || []);
  }

  useEffect(() => {
    if (authLoading) return;

    if (superAdmin) {
      loadRestaurants();
      return;
    }

    if (restaurant?.id) {
      setSelectedRestaurantId(restaurant.id);
      loadLogs(restaurant.id);
    }
  }, [authLoading, profile]);

  useEffect(() => {
    if (selectedRestaurantId) {
      loadLogs(selectedRestaurantId);
    } else {
      setLogs([]);
    }
  }, [selectedRestaurantId]);

  if (authLoading) return <div className="p-8">Yüklənir...</div>;

  return (
    <div className="p-8 bg-slate-100 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Request Logs</h1>
        <p className="text-slate-500 mt-1">
          Tamamlanmış istəklər ofisiantlara görə qruplaşdırılıb.
        </p>
      </div>

      {superAdmin ? (
        <select
          className="border border-slate-300 rounded-xl p-3 mb-8 bg-white text-slate-800 shadow-sm"
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
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-8 shadow-sm text-slate-800">
          <b>Restoran:</b> {restaurant?.name}
        </div>
      )}

      {logs.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-slate-500">
          Hələ tamamlanmış istək yoxdur.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Object.entries(groupedLogs).map(([waiterName, waiterLogs]) => {
          const isOpen = openWaiter === waiterName;

          return (
            <div
              key={waiterName}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
            >
              <button
                onClick={() => setOpenWaiter(isOpen ? null : waiterName)}
                className="w-full text-left p-5 hover:bg-slate-50 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {waiterName}
                    </h2>

                    <p className="text-slate-500 mt-1">
                      Görülən iş:{" "}
                      <span className="font-semibold text-slate-800">
                        {waiterLogs.length}
                      </span>
                    </p>
                  </div>

                  <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center text-xl">
                    {isOpen ? "−" : "+"}
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-slate-200 p-5 space-y-4 bg-slate-50">
                  {waiterLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-slate-900 text-lg">
                          {log.request_type}
                        </h3>

                        <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">
                          Tamamlandı
                        </span>
                      </div>

                      <div className="space-y-1 text-sm text-slate-700">
                        <p>
                          <b>Zal:</b> {log.halls?.name || "-"}
                        </p>

                        <p>
                          <b>Masa:</b>{" "}
                          {log.restaurant_tables?.table_number || "-"}
                        </p>

                        <p>
                          <b>Qəbul vaxtı:</b>{" "}
                          {log.accepted_at
                            ? new Date(log.accepted_at).toLocaleString()
                            : "-"}
                        </p>

                        <p>
                          <b>Tamamlanma vaxtı:</b>{" "}
                          {log.completed_at
                            ? new Date(log.completed_at).toLocaleString()
                            : "-"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}