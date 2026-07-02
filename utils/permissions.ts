import { CurrentUserProfile } from "@/types/auth";

export function isSuperAdmin(profile: CurrentUserProfile | null) {
  return !!profile?.user_roles?.some((r) => r.roles.name === "SUPER_ADMIN");
}

export function isRestaurantAdmin(profile: CurrentUserProfile | null) {
  return !!profile?.user_roles?.some(
    (r) => r.roles.name === "RESTAURANT_ADMIN"
  );
}

export function isWaiter(profile: CurrentUserProfile | null) {
  return !!profile?.user_roles?.some((r) => r.roles.name === "WAITER");
}

export function getRestaurant(profile: CurrentUserProfile | null) {
  if (!profile) return null;

  return (
    profile.user_roles.find((role) => role.restaurants)?.restaurants ?? null
  );
}