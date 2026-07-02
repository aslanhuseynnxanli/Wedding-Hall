export type ServiceRequestStatus =
  | "NEW"
  | "ACCEPTED"
  | "COMPLETED"
  | "CANCELLED";

export interface ServiceRequest {
  id: string;
  restaurant_id: string;
  hall_id: string;
  table_id: string;
  request_type: string;
  note: string | null;
  status: ServiceRequestStatus;
  created_at: string;
  updated_at: string;
}