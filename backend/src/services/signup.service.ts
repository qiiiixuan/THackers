import { prisma } from '../utils/prisma.js';
import { EventSignup, Role } from '@prisma/client';

export interface CreateSignupInput {
  userId: string;
  eventId: string;
  signedUpById?: string;
}

/**
 * Check if a user is already signed up for an event
 */
export const isUserSignedUp = async (
  userId: string,
  eventId: string
): Promise<boolean> => {
  const signup = await prisma.eventSignup.findUnique({
    where: {
      userId_eventId: {
        userId,
        eventId,
      },
    },
  });

  return !!signup;
};

/**
 * Sign up a user for an event (self-signup)
 */
export const createSignup = async (
  input: CreateSignupInput
): Promise<EventSignup> => {
  const { userId, eventId, signedUpById } = input;

  // Check if event exists and hasn't ended
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new Error('Event not found');
  }

  if (new Date() > event.endTime) {
    throw new Error('Cannot sign up for a past event');
  }

  // Check if already signed up
  const existingSignup = await isUserSignedUp(userId, eventId);
  if (existingSignup) {
    throw new Error('User is already signed up for this event');
  }

  return prisma.eventSignup.create({
    data: {
      userId,
      eventId,
      signedUpById: signedUpById || null,
    },
    include: {
      event: true,
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });
};

/**
 * Caregiver signs up a student for an event
 */
export const caregiverSignup = async (
  studentId: string,
  eventId: string,
  caregiverId: string
): Promise<EventSignup> => {
  // Verify the caregiver has permission to sign up this student
  const [student, caregiver] = await Promise.all([
    prisma.user.findUnique({ where: { id: studentId } }),
    prisma.user.findUnique({ where: { id: caregiverId } }),
  ]);

  if (!caregiver || caregiver.role !== Role.CAREGIVER) {
    throw new Error('Only caregivers can perform this action');
  }

  if (!student || student.role !== Role.STUDENT) {
    throw new Error('Invalid student ID');
  }

  // Check if caregiver is assigned to this student (optional - can be removed for more flexible access)
  // if (student.caregiverId !== caregiverId) {
  //   throw new Error('You are not assigned to this student');
  // }

  return createSignup({
    userId: studentId,
    eventId,
    signedUpById: caregiverId,
  });
};

/**
 * Cancel a signup
 */
export const cancelSignup = async (
  signupId: string,
  userId: string
): Promise<void> => {
  const signup = await prisma.eventSignup.findUnique({
    where: { id: signupId },
    include: {
      user: true,
      event: true,
    },
  });

  if (!signup) {
    throw new Error('Signup not found');
  }

  // Check if the user has permission to cancel
  // User can cancel their own signup, or caregiver can cancel their student's signup
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const canCancel =
    signup.userId === userId || // Own signup
    signup.signedUpById === userId || // Caregiver who signed them up
    (user.role === Role.CAREGIVER && signup.user.caregiverId === userId); // Assigned caregiver

  if (!canCancel) {
    throw new Error('You do not have permission to cancel this signup');
  }

  await prisma.eventSignup.delete({
    where: { id: signupId },
  });
};

/**
 * Get signup by ID
 */
export const getSignupById = async (signupId: string) => {
  return prisma.eventSignup.findUnique({
    where: { id: signupId },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
      event: true,
      signedUpBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });
};

/**
 * Get all signups for a user
 */
export const getUserSignups = async (userId: string) => {
  return prisma.eventSignup.findMany({
    where: { userId },
    include: {
      event: true,
      signedUpBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: {
      event: { startTime: 'asc' },
    },
  });
};

/**
 * Bulk signup students for an event (for caregivers)
 */
export const bulkSignup = async (
  studentIds: string[],
  eventId: string,
  caregiverId: string
): Promise<{ success: string[]; failed: { id: string; error: string }[] }> => {
  const results = {
    success: [] as string[],
    failed: [] as { id: string; error: string }[],
  };

  for (const studentId of studentIds) {
    try {
      await caregiverSignup(studentId, eventId, caregiverId);
      results.success.push(studentId);
    } catch (error) {
      results.failed.push({
        id: studentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
};
