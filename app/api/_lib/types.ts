import { CaregiverType, Gender } from "@prisma/client";

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SignupRequestBody {
  eventId: string;
}

export interface CaregiverSignupRequestBody {
  eventId: string;
  studentId: string;
}

export interface EventFilterParams extends PaginationParams {
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface StudentProfileInput {
  gender?: Gender;
  nationalId?: string;
  nokName?: string;
  nokContact?: string;
  disabilityType?: string;
  supportNeeds?: string;
}

export interface CaregiverProfileInput {
  contactNumber?: string;
  caregiverType?: CaregiverType;
  organization?: string;
  jobTitle?: string;
}
