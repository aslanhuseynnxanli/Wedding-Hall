"use client";

import PushSubscribeButton from "@/components/PushSubscribeButton";
import { useAuth } from "@/contexts/AuthContext";
import { getRestaurant, isSuperAdmin } from "@/utils/permissions";
import { useEffect, useMemo, useRef, useState } from "react";

export default function ServiceRequestsPage() {
  const { profile, loading: authLoading } = useAuth();

  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [requests, setRequests] = useState<any[]>([]);

  const previousCount = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const superAdmin = isSuperAdmin(profile);
  const restaurant = getRestaurant(profile);

  const newCount = useMemo(
    () => requests.filter((x) => x.status === "NEW").length,
    [requests]
  );

  async function loadRestaurants() {
    const res = await fetch("/api/super-admin/restaurants/list");
    const data = await res.json();

    if (!res.ok) return alert(data.error);

    setRestaurants(data.restaurants || []);
  }

  async function loadRequests() {
    if (!selectedRestaurantId) return;

    const waiterRole = profile?.user_roles?.find(
      (role) => role.roles.name === "WAITER"
    );

    const waiterQuery = waiterRole ? `&waiter_id=${profile?.id}` : "";

    const res = await fetch(
      `/api/service-requests/list?restaurant_id=${selectedRestaurantId}${waiterQuery}`
    );

    const data = await res.json();

    if (!res.ok) return alert(data.error);

    const list = data.requests || [];
    const newRequests = list.filter((x: any) => x.status === "NEW").length;

    if (previousCount.current !== 0 && newRequests > previousCount.current) {
      audioRef.current?.play().catch(() => { });
    }

    previousCount.current = newRequests;
    setRequests(list);
  }

  async function changeStatus(id: string, status: string) {
    const res = await fetch("/api/service-requests/update-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id,
        status,
        userId: profile?.id,
      }),
    });

    const data = await res.json();

    if (!res.ok) return alert(data.error);

    loadRequests();
  }

  useEffect(() => {
    if (authLoading) return;

    if (superAdmin) {
      loadRestaurants();
      return;
    }

    if (restaurant?.id) {
      setSelectedRestaurantId(restaurant.id);
    }
  }, [authLoading, profile]);

  useEffect(() => {
    loadRequests();

    const timer = setInterval(loadRequests, 5000);

    return () => clearInterval(timer);
  }, [selectedRestaurantId]);

  if (authLoading) return <div className="p-8">Yüklənir...</div>;

  return (
    <>
      <audio ref={audioRef} src="/sound.mp3" preload="auto" />

      <div className="p-8 bg-gray-100 min-h-screen">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Service Requests</h1>

          <div className="flex items-center gap-3">
            {selectedRestaurantId && (
              <PushSubscribeButton restaurantId={selectedRestaurantId} />
            )}

            <div className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold">
              Yeni: {newCount}
            </div>
          </div>
        </div>

        {superAdmin ? (
          <select
            className="border rounded-lg p-3 mb-8 bg-white"
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
          <div className="bg-white border rounded-lg p-3 mb-8">
            <b>Restoran:</b> {restaurant?.name}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {requests.map((request) => (
            <div
              key={request.id}
              className={`rounded-xl shadow-lg p-5 text-white ${request.status === "NEW"
                  ? "bg-red-500"
                  : request.status === "ACCEPTED"
                    ? "bg-yellow-500"
                    : "bg-green-600"
                }`}
            >
              <div className="flex justify-between items-start">
                <h2 className="font-bold text-2xl">{request.request_type}</h2>

                <div className="text-3xl">
                  {request.status === "NEW" && "🔴"}
                  {request.status === "ACCEPTED" && "🟡"}
                  {request.status === "COMPLETED" && "🟢"}
                </div>
              </div>

              <div className="mt-5 space-y-2 text-lg">
                <p>
                  <b>Zal:</b> {request.halls?.name || "-"}
                </p>

                <p>
                  <b>Masa:</b> {request.restaurant_tables?.table_number || "-"}
                </p>

                <p className="text-sm opacity-90">
                  {new Date(request.created_at).toLocaleString()}
                </p>
              </div>

              <div className="mt-6 flex gap-3">
                {request.status === "NEW" && (
                  <button
                    onClick={() => changeStatus(request.id, "ACCEPTED")}
                    className="bg-white text-black px-4 py-2 rounded-lg font-semibold"
                  >
                    Qəbul et
                  </button>
                )}

                {request.status === "ACCEPTED" && (
                  <button
                    onClick={() => changeStatus(request.id, "COMPLETED")}
                    className="bg-white text-black px-4 py-2 rounded-lg font-semibold"
                  >
                    Tamamlandı
                  </button>
                )}

                {request.status === "COMPLETED" && (
                  <div className="bg-white text-green-700 px-4 py-2 rounded-lg font-bold">
                    ✔ Tamamlandı
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}