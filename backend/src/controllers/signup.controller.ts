import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';
import * as signupService from '../services/signup.service.js';
import * as eventService from '../services/event.service.js';
import * as userService from '../services/user.service.js';
import { Role, SignupStatus } from '@prisma/client';
import { normalizeQrToken } from '../utils/qr.utils.js';

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

const actionSchema = z.object({
  note: z.string().max(250).optional(),
});

const isEventManagerRole = (role?: Role) => role === Role.CAREGIVER || role === Role.STAFF;

const sanitizeSignupEvent = <T extends { event?: unknown }>(signup: T) => {
  if (!signup.event || typeof signup.event !== 'object') return signup;
  const { checkInToken, ...event } = signup.event as Record<string, unknown>;
  return {
    ...signup,
    event,
  };
};

const sanitizeEvent = (event: Record<string, unknown>) => {
  const { checkInToken, ...rest } = event;
  return rest;
};

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

    const sanitizedSignup = sanitizeSignupEvent(signup);
    const statusMessage =
      signup.status === SignupStatus.PENDING
        ? 'Signup submitted and pending approval'
        : signup.status === SignupStatus.WAITLISTED
        ? 'Added to the waitlist'
        : 'Successfully signed up for event';

    res.status(201).json({
      success: true,
      data: { signup: sanitizedSignup },
      message: statusMessage,
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
    // Only caregivers/staff can use this endpoint
    if (!isEventManagerRole(req.dbUser?.role)) {
      res.status(403).json({
        success: false,
        error: 'Only caregivers or staff can sign up students',
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

    const sanitizedSignup = sanitizeSignupEvent(signup);
    const statusMessage =
      signup.status === SignupStatus.PENDING
        ? 'Student signup submitted and pending approval'
        : signup.status === SignupStatus.WAITLISTED
        ? 'Student added to the waitlist'
        : 'Student successfully signed up for event';

    res.status(201).json({
      success: true,
      data: { signup: sanitizedSignup },
      message: statusMessage,
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
    // Only caregivers/staff can use this endpoint
    if (!isEventManagerRole(req.dbUser?.role)) {
      res.status(403).json({
        success: false,
        error: 'Only caregivers or staff can bulk sign up students',
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
    const isSelf = signup.userId === req.user?.id;
    const isAssistant = signup.signedUpById === req.user?.id;
    const isStaff = req.dbUser?.role === Role.STAFF;
    const isCreator = await eventService.isEventCreator(signup.eventId, req.user!.id);
    const isLinkedCaregiver =
      req.dbUser?.role === Role.CAREGIVER
        ? await userService.isCaregiverForStudent(req.user!.id, signup.userId)
        : false;

    const canView = isSelf || isAssistant || isStaff || isCreator || isLinkedCaregiver;

    if (!canView) {
      res.status(403).json({
        success: false,
        error: 'You do not have permission to view this signup',
      });
      return;
    }

    res.json({
      success: true,
      data: { signup: sanitizeSignupEvent(signup) },
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

    const sanitized = signups.map((signup) => sanitizeSignupEvent(signup));

    res.json({
      success: true,
      data: { signups: sanitized },
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

    const normalizedToken = normalizeQrToken(token);
    const event = await eventService.getEventByQrToken(normalizedToken);

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

    const sanitizedSignup = sanitizeSignupEvent(signup);
    const statusMessage =
      signup.status === SignupStatus.PENDING
        ? `Signup pending approval for "${event.title}"`
        : signup.status === SignupStatus.WAITLISTED
        ? `Added to the waitlist for "${event.title}"`
        : `Successfully signed up for "${event.title}"`;

    res.status(201).json({
      success: true,
      data: { signup: sanitizedSignup, event: sanitizeEvent(event as Record<string, unknown>) },
      message: statusMessage,
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

/**
 * Approve a signup
 * POST /api/signups/:id/approve
 */
export const approveSignup = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!isEventManagerRole(req.dbUser?.role)) {
      res.status(403).json({
        success: false,
        error: 'Only staff or caregivers can approve signups',
      });
      return;
    }

    const { id } = req.params;
    const signup = await signupService.getSignupById(id);

    if (!signup) {
      res.status(404).json({
        success: false,
        error: 'Signup not found',
      });
      return;
    }

    const isCreator = await eventService.isEventCreator(signup.eventId, req.user!.id);

    if (!isCreator && req.dbUser?.role !== Role.STAFF) {
      res.status(403).json({
        success: false,
        error: 'Only the event creator can approve signups',
      });
      return;
    }

    const updated = await signupService.approveSignup(id, req.user!.id);

    res.json({
      success: true,
      data: { signup: updated },
      message: 'Signup approved successfully',
    });
  } catch (error) {
    console.error('Approve signup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to approve signup';
    res.status(400).json({
      success: false,
      error: errorMessage,
    });
  }
};

/**
 * Decline a signup
 * POST /api/signups/:id/decline
 */
export const declineSignup = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!isEventManagerRole(req.dbUser?.role)) {
      res.status(403).json({
        success: false,
        error: 'Only staff or caregivers can decline signups',
      });
      return;
    }

    const { id } = req.params;
    const validation = actionSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: validation.error.errors[0].message,
      });
      return;
    }

    const signup = await signupService.getSignupById(id);

    if (!signup) {
      res.status(404).json({
        success: false,
        error: 'Signup not found',
      });
      return;
    }

    const isCreator = await eventService.isEventCreator(signup.eventId, req.user!.id);

    if (!isCreator && req.dbUser?.role !== Role.STAFF) {
      res.status(403).json({
        success: false,
        error: 'Only the event creator can decline signups',
      });
      return;
    }

    const updated = await signupService.declineSignup(id, validation.data.note);

    res.json({
      success: true,
      data: { signup: updated },
      message: 'Signup declined',
    });
  } catch (error) {
    console.error('Decline signup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to decline signup';
    res.status(400).json({
      success: false,
      error: errorMessage,
    });
  }
};

/**
 * Check in a signup
 * POST /api/signups/:id/check-in
 */
export const checkInSignup = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!isEventManagerRole(req.dbUser?.role)) {
      res.status(403).json({
        success: false,
        error: 'Only staff or caregivers can check in attendees',
      });
      return;
    }

    const { id } = req.params;
    const signup = await signupService.getSignupById(id);

    if (!signup) {
      res.status(404).json({
        success: false,
        error: 'Signup not found',
      });
      return;
    }

    const isCreator = await eventService.isEventCreator(signup.eventId, req.user!.id);

    if (!isCreator && req.dbUser?.role !== Role.STAFF) {
      res.status(403).json({
        success: false,
        error: 'Only the event creator can check in attendees',
      });
      return;
    }

    const updated = await signupService.checkInSignup(id);

    res.json({
      success: true,
      data: { signup: updated },
      message: 'Attendance checked in',
    });
  } catch (error) {
    console.error('Check-in signup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to check in';
    res.status(400).json({
      success: false,
      error: errorMessage,
    });
  }
};

/**
 * Check in via event QR token (self check-in)
 * POST /api/signups/check-in/qr/:token
 */
export const qrCheckIn = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { token } = req.params;
    const normalizedToken = normalizeQrToken(token);
    const event = await eventService.getEventByCheckInToken(normalizedToken);

    if (!event) {
      res.status(404).json({
        success: false,
        error: 'Event not found',
      });
      return;
    }

    const signup = await signupService.checkInByEventToken(event.id, req.user!.id);

    res.json({
      success: true,
      data: { signup, eventId: event.id },
      message: 'Checked in successfully',
    });
  } catch (error) {
    console.error('QR check-in error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to check in';
    res.status(400).json({
      success: false,
      error: errorMessage,
    });
  }
};
