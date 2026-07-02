"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getRestaurant, isSuperAdmin } from "@/utils/permissions";

export default function HallsPage() {
  const { profile, loading: authLoading } = useAuth();

  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [hallName, setHallName] = useState("");
  const [halls, setHalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const restaurant = getRestaurant(profile);
  const superAdmin = isSuperAdmin(profile);

  async function loadRestaurants() {
    const res = await fetch("/api/super-admin/restaurants/list");
    const data = await res.json();

    if (!res.ok) {
      alert(data.error);
      return;
    }

    setRestaurants(data.restaurants || []);
  }

  async function loadHalls(restaurantId: string) {
    if (!restaurantId) return;

    const res = await fetch(`/api/halls/list?restaurant_id=${restaurantId}`);
    const data = await res.json();

    if (!res.ok) {
      alert(data.error);
      return;
    }

    setHalls(data.halls || []);
  }

  async function createHall() {
    if (!selectedRestaurantId || !hallName) {
      alert("Zal adı yazılmalıdır.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/halls/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        restaurant_id: selectedRestaurantId,
        name: hallName,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      alert(data.error);
      return;
    }

    setHallName("");
    loadHalls(selectedRestaurantId);
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
    if (selectedRestaurantId) {
      loadHalls(selectedRestaurantId);
    } else {
      setHalls([]);
    }
  }, [selectedRestaurantId]);

  if (authLoading) {
    return <div className="p-8">Yüklənir...</div>;
  }

  if (!profile) {
    return <div className="p-8">Profil tapılmadı.</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Zallar</h1>

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

        <input
          className="w-full border rounded-lg p-3"
          placeholder="Zal adı"
          value={hallName}
          onChange={(e) => setHallName(e.target.value)}
        />

        <button
          onClick={createHall}
          disabled={loading}
          className="bg-black text-white px-5 py-3 rounded-lg disabled:opacity-50"
        >
          {loading ? "Yaradılır..." : "Zal yarat"}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow mt-8 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-4">Zal adı</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>

          <tbody>
            {halls.map((hall) => (
              <tr key={hall.id} className="border-t">
                <td className="p-4">{hall.name}</td>
                <td className="p-4">{hall.is_active ? "Aktiv" : "Passiv"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}