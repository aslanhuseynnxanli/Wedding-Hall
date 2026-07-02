import { ServiceRequestRepository } from "@/repositories/service-request.repository";

export class ServiceRequestService {
  static async create(data: {
    restaurant_id: string;
    hall_id: string;
    table_id: string;
    request_type: string;
    note?: string;
  }) {
    return await ServiceRequestRepository.create(data);
  }

  static async getRestaurantRequests(restaurantId: string, waiterId?: string) {
    if (waiterId) {
      return await ServiceRequestRepository.getByWaiter(restaurantId, waiterId);
    }

    return await ServiceRequestRepository.getByRestaurant(restaurantId);
  }

  static async updateStatus(
    id: string,
    status: "NEW" | "ACCEPTED" | "COMPLETED" | "CANCELLED"
  ) {
    return await ServiceRequestRepository.updateStatus(id, status);
  }
}