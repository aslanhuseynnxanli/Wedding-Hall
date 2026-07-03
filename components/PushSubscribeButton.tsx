"use client";

import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseMessaging } from "@/lib/firebase";
import { getToken } from "firebase/messaging";

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

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      alert("Bildiriş icazəsi verilmədi.");
      return;
    }

    const messaging = await getFirebaseMessaging();

    if (!messaging) {
      alert("Bu cihaz bildirişləri dəstəkləmir.");
      return;
    }

    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );

    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      alert("FCM token alınmadı.");
      return;
    }

    const res = await fetch("/api/fcm/save-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: profile.id,
        restaurantId,
        token,
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