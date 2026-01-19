import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';
import * as signupService from '../services/signup.service.js';
import { Role } from '@prisma/client';

// Validation schemas
const signupSchema = z.object({
  eventId: z.string().uuid('Invalid event ID'),
});

const caregiverSignupSchema = z.object({
  eventId: z.string().uuid('Invalid event ID'),
  studentId: z.string().uuid('Invalid student ID'),
});

const bulkSignupSchema = z.object({
  eventId: z.string().uuid('Invalid event ID'),
  studentIds: z.array(z.string().uuid('Invalid student ID')).min(1, 'At least one student is required'),
});

/**
 * Sign up for an event (self-signup)
 * POST /api/signups
 */
export const createSignup = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const validation = signupSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: validation.error.errors[0].message,
      });
      return;
    }

    const signup = await signupService.createSignup({
      userId: req.user!.id,
      eventId: validation.data.eventId,
    });

    res.status(201).json({
      success: true,
      data: { signup },
      message: 'Successfully signed up for event',
    });
  } catch (error) {
    console.error('Create signup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to sign up';
    res.status(400).json({
      success: false,
      error: errorMessage,
    });
  }
};

/**
 * Caregiver signs up a student for an event
 * POST /api/signups/caregiver
 */
export const caregiverSignup = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    // Only caregivers can use this endpoint
    if (req.dbUser?.role !== Role.CAREGIVER) {
      res.status(403).json({
        success: false,
        error: 'Only caregivers can sign up students',
      });
      return;
    }

    const validation = caregiverSignupSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: validation.error.errors[0].message,
      });
      return;
    }

    const signup = await signupService.caregiverSignup(
      validation.data.studentId,
      validation.data.eventId,
      req.user!.id
    );

    res.status(201).json({
      success: true,
      data: { signup },
      message: 'Student successfully signed up for event',
    });
  } catch (error) {
    console.error('Caregiver signup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to sign up student';
    res.status(400).json({
      success: false,
      error: errorMessage,
    });
  }
};

/**
 * Bulk signup students for an event (caregiver only)
 * POST /api/signups/bulk
 */
export const bulkSignup = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    // Only caregivers can use this endpoint
    if (req.dbUser?.role !== Role.CAREGIVER) {
      res.status(403).json({
        success: false,
        error: 'Only caregivers can bulk sign up students',
      });
      return;
    }

    const validation = bulkSignupSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: validation.error.errors[0].message,
      });
      return;
    }

    const results = await signupService.bulkSignup(
      validation.data.studentIds,
      validation.data.eventId,
      req.user!.id
    );

    res.status(200).json({
      success: true,
      data: results,
      message: `${results.success.length} students signed up successfully, ${results.failed.length} failed`,
    });
  } catch (error) {
    console.error('Bulk signup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process bulk signup',
    });
  }
};

/**
 * Cancel a signup
 * DELETE /api/signups/:id
 */
export const cancelSignup = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;

    await signupService.cancelSignup(id, req.user!.id);

    res.json({
      success: true,
      message: 'Signup cancelled successfully',
    });
  } catch (error) {
    console.error('Cancel signup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to cancel signup';
    res.status(400).json({
      success: false,
      error: errorMessage,
    });
  }
};

/**
 * Get signup by ID
 * GET /api/signups/:id
 */
export const getSignupById = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;

    const signup = await signupService.getSignupById(id);

    if (!signup) {
      res.status(404).json({
        success: false,
        error: 'Signup not found',
      });
      return;
    }

    // Check if user has permission to view this signup
    const canView =
      signup.userId === req.user?.id ||
      signup.signedUpById === req.user?.id ||
      (req.dbUser?.role === Role.CAREGIVER && signup.user.role === Role.STUDENT);

    if (!canView) {
      res.status(403).json({
        success: false,
        error: 'You do not have permission to view this signup',
      });
      return;
    }

    res.json({
      success: true,
      data: { signup },
    });
  } catch (error) {
    console.error('Get signup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get signup',
    });
  }
};

/**
 * Get all signups for the authenticated user
 * GET /api/signups/my
 */
export const getMySignups = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const signups = await signupService.getUserSignups(req.user!.id);

    res.json({
      success: true,
      data: { signups },
    });
  } catch (error) {
    console.error('Get my signups error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get signups',
    });
  }
};

/**
 * Quick signup via QR scan - combines getting event by token and signing up
 * POST /api/signups/qr/:token
 */
export const qrSignup = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { token } = req.params;

    // Import event service to get event by QR token
    const { getEventByQrToken } = await import('../services/event.service.js');

    const event = await getEventByQrToken(token);

    if (!event) {
      res.status(404).json({
        success: false,
        error: 'Event not found',
      });
      return;
    }

    // Create the signup
    const signup = await signupService.createSignup({
      userId: req.user!.id,
      eventId: event.id,
    });

    res.status(201).json({
      success: true,
      data: { signup, event },
      message: `Successfully signed up for "${event.title}"`,
    });
  } catch (error) {
    console.error('QR signup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to sign up';
    res.status(400).json({
      success: false,
      error: errorMessage,
    });
  }
};
