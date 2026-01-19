import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';
import * as userService from '../services/user.service.js';
import { Role } from '@prisma/client';
import { normalizeQrToken } from '../utils/qr.utils.js';

// Validation schemas
const genderEnum = z.enum(['FEMALE', 'MALE', 'OTHER', 'PREFER_NOT_TO_SAY']);
const caregiverTypeEnum = z.enum(['MEDICAL', 'TEACHER', 'STAFF', 'FAMILY', 'OTHER']);

const studentProfileSchema = z.object({
  gender: genderEnum.optional(),
  nationalId: z.string().min(4).optional(),
  nokName: z.string().min(1).optional(),
  nokContact: z.string().min(5).optional(),
  disabilityType: z.string().min(1).optional(),
  supportNeeds: z.string().min(1).optional(),
});

const caregiverProfileSchema = z.object({
  contactNumber: z.string().min(5).optional(),
  caregiverType: caregiverTypeEnum.optional(),
  organization: z.string().min(1).optional(),
  jobTitle: z.string().min(1).optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  studentProfile: studentProfileSchema.optional(),
  caregiverProfile: caregiverProfileSchema.optional(),
});

type StudentProfilePayload = z.infer<typeof studentProfileSchema>;

const maskSensitiveStudentProfile = (
  profile: StudentProfilePayload | null | undefined
) => {
  if (!profile) return profile;

  return {
    ...profile,
    nationalId: profile.nationalId ? `****${profile.nationalId.slice(-4)}` : null,
    nokContact: profile.nokContact ? `****${profile.nokContact.slice(-4)}` : null,
  };
};

/**
 * Get user by ID
 * GET /api/users/:id
 */
export const getUserById = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await userService.getUserById(id, true);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Only allow users to see their own profile or caregivers to see their students
    const isSelf = req.user?.id === id;
    const isStaff = req.dbUser?.role === Role.STAFF;
    const isLinkedCaregiver =
      req.dbUser?.role === Role.CAREGIVER
        ? await userService.isCaregiverForStudent(req.user!.id, id)
        : false;

    const canAccess = isSelf || isStaff || isLinkedCaregiver;

    if (!canAccess) {
      res.status(403).json({
        success: false,
        error: 'You do not have permission to view this profile',
      });
      return;
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
    });
  }
};

/**
 * Get user by QR token (for caregiver scanning student QR)
 * GET /api/users/qr/:token
 */
export const getUserByQrToken = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { token } = req.params;
    const normalizedToken = normalizeQrToken(token);

    // Only caregivers/staff can look up users by QR token
    if (req.dbUser?.role !== Role.CAREGIVER && req.dbUser?.role !== Role.STAFF) {
      res.status(403).json({
        success: false,
        error: 'Only caregivers or staff can scan student QR codes',
      });
      return;
    }

    const user = await userService.getUserByQrToken(normalizedToken);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Student not found',
      });
      return;
    }

    // Only return student profiles
    if (user.role !== Role.STUDENT) {
      res.status(400).json({
        success: false,
        error: 'This QR code does not belong to a student',
      });
      return;
    }

    const isStaff = req.dbUser?.role === Role.STAFF;
    const isLinkedCaregiver =
      req.dbUser?.role === Role.CAREGIVER
        ? await userService.isCaregiverForStudent(req.user!.id, user.id)
        : false;

    const sanitizedSignups =
      user.eventSignups?.map((signup) => {
        if (!signup.event) return signup;
        const { checkInToken, ...event } = signup.event as Record<string, unknown>;
        return {
          ...signup,
          event,
        };
      }) || [];

    const baseUser = {
      ...user,
      eventSignups: sanitizedSignups,
    };

    const sanitizedUser =
      !isLinkedCaregiver && !isStaff
        ? {
            ...baseUser,
            studentProfile: maskSensitiveStudentProfile(user.studentProfile),
            eventSignups: [],
            caregivers: [],
          }
        : baseUser;

    res.json({
      success: true,
      data: { user: sanitizedUser, linked: isLinkedCaregiver },
    });
  } catch (error) {
    console.error('Get user by QR token error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
    });
  }
};

/**
 * Update user profile
 * PATCH /api/users/:id
 */
export const updateUser = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;

    // Only allow users to update their own profile
    if (req.user?.id !== id) {
      res.status(403).json({
        success: false,
        error: 'You can only update your own profile',
      });
      return;
    }

    const validation = updateUserSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: validation.error.errors[0].message,
      });
      return;
    }

    const user = await userService.updateUser(id, validation.data);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { user },
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user',
    });
  }
};

/**
 * Get events a user has signed up for
 * GET /api/users/:id/events
 */
export const getUserEvents = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;
    const { filter } = req.query;

    // Only allow users to see their own events or caregivers to see their students' events
    const targetUser = await userService.getUserById(id);

    if (!targetUser) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    const isSelf = req.user?.id === id;
    const isStaff = req.dbUser?.role === Role.STAFF;
    const isLinkedCaregiver =
      req.dbUser?.role === Role.CAREGIVER
        ? await userService.isCaregiverForStudent(req.user!.id, id)
        : false;

    const canAccess = isSelf || isStaff || isLinkedCaregiver;

    if (!canAccess) {
      res.status(403).json({
        success: false,
        error: 'You do not have permission to view these events',
      });
      return;
    }

    const options = {
      upcoming: filter === 'upcoming',
      past: filter === 'past',
    };

    const events = await userService.getUserEvents(id, options);
    const sanitizedEvents = events.map((event) => {
      const { checkInToken, ...rest } = event as Record<string, unknown>;
      return rest;
    });

    res.json({
      success: true,
      data: { events: sanitizedEvents },
    });
  } catch (error) {
    console.error('Get user events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user events',
    });
  }
};

/**
 * Get students managed by the authenticated caregiver
 * GET /api/users/my-students
 */
export const getMyStudents = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (req.dbUser?.role !== Role.CAREGIVER) {
      res.status(403).json({
        success: false,
        error: 'Only caregivers can access this endpoint',
      });
      return;
    }

    const students = await userService.getCaregiverStudents(req.user!.id);

    res.json({
      success: true,
      data: { students },
    });
  } catch (error) {
    console.error('Get my students error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get students',
    });
  }
};

/**
 * Regenerate QR token for the authenticated user
 * POST /api/users/regenerate-qr
 */
export const regenerateQr = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const newToken = await userService.regenerateQrToken(req.user!.id);

    res.json({
      success: true,
      data: { qrToken: newToken },
      message: 'QR token regenerated successfully',
    });
  } catch (error) {
    console.error('Regenerate QR error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to regenerate QR token',
    });
  }
};

/**
 * Assign a student to the authenticated caregiver
 * POST /api/users/assign-student
 */
export const assignStudent = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (req.dbUser?.role !== Role.CAREGIVER) {
      res.status(403).json({
        success: false,
        error: 'Only caregivers can assign students',
      });
      return;
    }

    const { studentId, relationship } = req.body;

    if (!studentId) {
      res.status(400).json({
        success: false,
        error: 'Student ID is required',
      });
      return;
    }

    await userService.assignStudentToCaregiver(studentId, req.user!.id, relationship);

    res.json({
      success: true,
      message: 'Student assigned successfully',
    });
  } catch (error) {
    console.error('Assign student error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assign student',
    });
  }
};
