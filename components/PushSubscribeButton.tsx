"use client";

import { useAuth } from "@/contexts/AuthContext";
import { urlBase64ToUint8Array } from "@/utils/push";

type Props = {
  restaurantId: string;
};

export default function PushSubscribeButton({ restaurantId }: Props) {
  const { profile } = useAuth();

  async function enablePush() {
    if (!profile?.id || !restaurantId) {
      alert("Profil və ya restoran tapılmadı.");
      return;
    }

    if (!("serviceWorker" in navigator)) {
      alert("Bu brauzer push notification dəstəkləmir.");
      return;
    }

    if (!("PushManager" in window)) {
      alert("Bu cihaz push notification dəstəkləmir.");
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      alert("Bildiriş icazəsi verilmədi.");
      return;
    }

    const registration = await navigator.serviceWorker.register("/sw.js");

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      ),
    });

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: profile.id,
        restaurantId,
        subscription,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error);
      return;
    }

    alert("Bildirişlər aktiv edildi.");
  }

  return (
    <button
      onClick={enablePush}
      className="bg-black text-white px-4 py-2 rounded-lg font-semibold"
    >
      Bildirişləri aktiv et
    </button>
  );
}