import { HallRepository } from "@/repositories/hall.repository";
import { Hall } from "@/types/hall";

export class HallService {
  static async createHall(data: {
    restaurant_id: string;
    name: string;
  }): Promise<Hall> {
    return await HallRepository.create(data);
  }

  static async getRestaurantHalls(
    restaurantId: string
  ): Promise<Hall[]> {
    return await HallRepository.getByRestaurant(restaurantId);
  }
}