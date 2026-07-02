"use client";

import { useState } from "react";

const services = [
  "🔔 Ofisiant çağır",
  "💧 Su",
  "☕ Çay",
  "🧊 Buz",
  "🍽️ Boşqab",
  "🥄 Qaşıq / Çəngəl",
  "🧻 Salfet",
  "🧹 Masanı yığışdır",
];

type Props = {
  restaurantId: string;
  hallId: string;
  tableId: string;
};

export default function ServiceButtons({
  restaurantId,
  hallId,
  tableId,
}: Props) {
  const [loadingService, setLoadingService] = useState("");

  async function sendRequest(service: string) {
    setLoadingService(service);

    const res = await fetch("/api/service-requests/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        restaurant_id: restaurantId,
        hall_id: hallId,
        table_id: tableId,
        request_type: service,
      }),
    });

    const data = await res.json();
    setLoadingService("");

    if (!res.ok) {
      alert(data.error);
      return;
    }

    alert("İstəyiniz göndərildi.");
  }

  return (
    <div className="grid grid-cols-2 gap-4 mt-8">
      {services.map((service) => (
        <button
          key={service}
          onClick={() => sendRequest(service)}
          disabled={loadingService === service}
          className="border rounded-xl p-5 text-lg hover:bg-gray-100 transition disabled:opacity-50"
        >
          {loadingService === service ? "Göndərilir..." : service}
        </button>
      ))}
    </div>
  );
}