import { prisma } from '../utils/prisma.js';
import { User, Role } from '@prisma/client';
import { generateQrToken } from '../utils/qr.utils.js';

export interface UpdateUserInput {
  name?: string;
  caregiverId?: string | null;
}

export interface UserWithRelations extends User {
  caregiver?: {
    id: string;
    name: string;
    email: string;
  } | null;
  students?: {
    id: string;
    name: string;
    email: string;
    qrToken: string;
  }[];
}

/**
 * Get user by ID with optional relations
 */
export const getUserById = async (
  id: string,
  includeRelations = false
): Promise<UserWithRelations | null> => {
  return prisma.user.findUnique({
    where: { id },
    include: includeRelations
      ? {
          caregiver: {
            select: { id: true, name: true, email: true },
          },
          students: {
            select: { id: true, name: true, email: true, qrToken: true },
          },
        }
      : undefined,
  });
};

/**
 * Get user by QR token (used when caregiver scans student QR)
 */
export const getUserByQrToken = async (
  qrToken: string
): Promise<UserWithRelations | null> => {
  return prisma.user.findUnique({
    where: { qrToken },
    include: {
      caregiver: {
        select: { id: true, name: true, email: true },
      },
      eventSignups: {
        include: {
          event: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });
};

/**
 * Update user profile
 */
export const updateUser = async (
  id: string,
  data: UpdateUserInput
): Promise<User | null> => {
  // If updating caregiverId, verify the caregiver exists and has correct role
  if (data.caregiverId) {
    const caregiver = await prisma.user.findUnique({
      where: { id: data.caregiverId },
    });

    if (!caregiver || caregiver.role !== Role.CAREGIVER) {
      throw new Error('Invalid caregiver ID');
    }
  }

  return prisma.user.update({
    where: { id },
    data,
  });
};

/**
 * Get events a user has signed up for
 */
export const getUserEvents = async (
  userId: string,
  options?: {
    upcoming?: boolean;
    past?: boolean;
  }
) => {
  const now = new Date();
  const whereClause: { userId: string; event?: { startTime?: { gte?: Date; lt?: Date } } } = {
    userId,
  };

  if (options?.upcoming) {
    whereClause.event = { startTime: { gte: now } };
  } else if (options?.past) {
    whereClause.event = { startTime: { lt: now } };
  }

  const signups = await prisma.eventSignup.findMany({
    where: whereClause,
    include: {
      event: true,
      signedUpBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: {
      event: {
        startTime: 'asc',
      },
    },
  });

  return signups.map((signup) => ({
    ...signup.event,
    signupId: signup.id,
    signedUpAt: signup.createdAt,
    signedUpBy: signup.signedUpBy,
  }));
};

/**
 * Get students managed by a caregiver
 */
export const getCaregiverStudents = async (caregiverId: string) => {
  return prisma.user.findMany({
    where: {
      caregiverId,
      role: Role.STUDENT,
    },
    select: {
      id: true,
      name: true,
      email: true,
      qrToken: true,
      createdAt: true,
    },
    orderBy: {
      name: 'asc',
    },
  });
};

/**
 * Regenerate QR token for a user
 */
export const regenerateQrToken = async (userId: string): Promise<string> => {
  const newToken = generateQrToken();
  
  await prisma.user.update({
    where: { id: userId },
    data: { qrToken: newToken },
  });

  return newToken;
};

/**
 * Assign a student to a caregiver
 */
export const assignStudentToCaregiver = async (
  studentId: string,
  caregiverId: string
): Promise<User> => {
  // Verify roles
  const [student, caregiver] = await Promise.all([
    prisma.user.findUnique({ where: { id: studentId } }),
    prisma.user.findUnique({ where: { id: caregiverId } }),
  ]);

  if (!student || student.role !== Role.STUDENT) {
    throw new Error('Invalid student ID');
  }

  if (!caregiver || caregiver.role !== Role.CAREGIVER) {
    throw new Error('Invalid caregiver ID');
  }

  return prisma.user.update({
    where: { id: studentId },
    data: { caregiverId },
  });
};
