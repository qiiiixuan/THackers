import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';
import * as userService from '../services/user.service.js';
import { Role } from '@prisma/client';

// Validation schemas
const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  caregiverId: z.string().uuid().nullable().optional(),
});

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
    const canAccess =
      req.user?.id === id ||
      (req.dbUser?.role === Role.CAREGIVER && user.caregiverId === req.user?.id);

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

    // Only caregivers can look up users by QR token
    if (req.dbUser?.role !== Role.CAREGIVER) {
      res.status(403).json({
        success: false,
        error: 'Only caregivers can scan student QR codes',
      });
      return;
    }

    const user = await userService.getUserByQrToken(token);

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

    res.json({
      success: true,
      data: { user },
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

    const canAccess =
      req.user?.id === id ||
      (req.dbUser?.role === Role.CAREGIVER && targetUser.caregiverId === req.user?.id);

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

    res.json({
      success: true,
      data: { events },
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

    const { studentId } = req.body;

    if (!studentId) {
      res.status(400).json({
        success: false,
        error: 'Student ID is required',
      });
      return;
    }

    const student = await userService.assignStudentToCaregiver(
      studentId,
      req.user!.id
    );

    res.json({
      success: true,
      data: { student },
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
