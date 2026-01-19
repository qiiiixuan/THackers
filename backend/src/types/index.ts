import { Request } from 'express';
import { User, Gender, CaregiverType } from '@prisma/client';

// Authenticated user info from Supabase
export interface AuthUser {
  id: string;
  email: string;
  role?: string;
}

// Extended Express Request with authenticated user
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  dbUser?: User;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination params
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// Signup request body
export interface SignupRequestBody {
  eventId: string;
}

// Caregiver signup request body
export interface CaregiverSignupRequestBody {
  eventId: string;
  studentId: string;
}

// Signup approval/check-in body
export interface SignupActionRequestBody {
  note?: string;
}

// Event filter params
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
