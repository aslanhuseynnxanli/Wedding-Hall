export type UserRoleName =
  | "SUPER_ADMIN"
  | "RESTAURANT_ADMIN"
  | "WAITER"
  | "MANAGER"
  | "KITCHEN"
  | "CASHIER";

export interface CurrentUserRestaurant {
  id: string;
  name: string;
  slug: string;
}

export interface CurrentUserRole {
  restaurant_id: string | null;
  roles: {
    name: UserRoleName;
  };
  restaurants: CurrentUserRestaurant | null;
}

export interface CurrentUserProfile {
  id: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  user_roles: CurrentUserRole[];
}