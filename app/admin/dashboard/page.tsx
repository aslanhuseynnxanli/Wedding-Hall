"use client";

import { useAuth } from "@/contexts/AuthContext";
import {
  getRestaurant,
  isRestaurantAdmin,
  isSuperAdmin,
} from "@/utils/permissions";

export default function DashboardPage() {
  const { profile, loading } = useAuth();

  if (loading) return <div className="p-8">Yüklənir...</div>;
  if (!profile) return <div className="p-8">Profil tapılmadı.</div>;

  if (isSuperAdmin(profile)) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-4">
          Super Admin Dashboard
        </h1>

        <p>Xoş gəlmisiniz, {profile.full_name}</p>
      </div>
    );
  }

  if (isRestaurantAdmin(profile)) {
    const restaurant = getRestaurant(profile);

    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-4">
          Restoran Dashboard
        </h1>

        <p>
          <b>{restaurant?.name}</b>
        </p>

        <p>Xoş gəlmisiniz, {profile.full_name}</p>
      </div>
    );
  }

  return <div className="p-8">İcazəniz yoxdur.</div>;
}