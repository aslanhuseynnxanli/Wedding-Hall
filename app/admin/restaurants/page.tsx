"use client";

import { useEffect, useState } from "react";

export default function RestaurantsPage() {
  const [restaurantName, setRestaurantName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [restaurants, setRestaurants] = useState<any[]>([]);

  async function loadRestaurants() {
    const res = await fetch("/api/super-admin/restaurants/list");
    const data = await res.json();

    if (!res.ok) {
      alert(data.error);
      return;
    }

    setRestaurants(data.restaurants);
  }

  async function createRestaurant() {
    setLoading(true);

    const res = await fetch("/api/super-admin/restaurants/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        restaurantName,
        slug,
        adminName,
        adminEmail,
        adminPassword,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      alert(data.error);
      return;
    }

    alert("Restoran və admin yaradıldı.");

    setRestaurantName("");
    setSlug("");
    setAdminName("");
    setAdminEmail("");
    setAdminPassword("");

    loadRestaurants();
  }

  useEffect(() => {
    loadRestaurants();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Restoran yarat</h1>

      <div className="bg-white rounded-xl shadow p-6 max-w-xl space-y-4">
        <input
          className="w-full border rounded-lg p-3"
          placeholder="Restoran adı"
          value={restaurantName}
          onChange={(e) => setRestaurantName(e.target.value)}
        />

        <input
          className="w-full border rounded-lg p-3"
          placeholder="Slug məsələn: royal"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />

        <hr />

        <input
          className="w-full border rounded-lg p-3"
          placeholder="Admin adı"
          value={adminName}
          onChange={(e) => setAdminName(e.target.value)}
        />

        <input
          className="w-full border rounded-lg p-3"
          placeholder="Admin email"
          type="email"
          value={adminEmail}
          onChange={(e) => setAdminEmail(e.target.value)}
        />

        <input
          className="w-full border rounded-lg p-3"
          placeholder="Admin şifrə"
          type="password"
          value={adminPassword}
          onChange={(e) => setAdminPassword(e.target.value)}
        />

        <button
          onClick={createRestaurant}
          disabled={loading}
          className="bg-black text-white px-5 py-3 rounded-lg disabled:opacity-50"
        >
          {loading ? "Yaradılır..." : "Restoran və admin yarat"}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow mt-8 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-4">Restoran</th>
              <th className="p-4">Slug</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>

          <tbody>
            {restaurants.map((restaurant) => (
              <tr key={restaurant.id} className="border-t">
                <td className="p-4">{restaurant.name}</td>
                <td className="p-4">{restaurant.slug}</td>
                <td className="p-4">
                  {restaurant.is_active ? "Aktiv" : "Passiv"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}