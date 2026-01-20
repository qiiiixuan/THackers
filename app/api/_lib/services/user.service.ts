import {
  CaregiverProfile,
  Role,
  SignupStatus,
  StudentProfile,
  User,
} from "@prisma/client";
import { prisma } from "../prisma";
import { generateQrToken } from "../qr";
import type { CaregiverProfileInput, StudentProfileInput } from "../types";

export interface UpdateUserInput {
  name?: string;
  studentProfile?: StudentProfileInput;
  caregiverProfile?: CaregiverProfileInput;
}

export interface UserWithRelations extends User {
  studentProfile?: StudentProfile | null;
  caregiverProfile?: CaregiverProfile | null;
  students?: {
    id: string;
    name: string;
    email: string;
    qrToken: string;
    relationship?: string | null;
    consentGivenAt?: Date | null;
  }[];
  caregivers?: {
    id: string;
    name: string;
    email: string;
    relationship?: string | null;
    consentGivenAt?: Date | null;
  }[];
}

export const getUserById = async (
  id: string,
  includeRelations = false
): Promise<UserWithRelations | null> => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: includeRelations
      ? {
          studentProfile: true,
          caregiverProfile: true,
          caregiverLinks: {
            select: {
              student: { select: { id: true, name: true, email: true, qrToken: true } },
              relationship: true,
              consentGivenAt: true,
            },
          },
          studentLinks: {
            select: {
              caregiver: { select: { id: true, name: true, email: true } },
              relationship: true,
              consentGivenAt: true,
            },
          },
        }
      : undefined,
  });

  if (!user || !includeRelations) return user;

  const { caregiverLinks, studentLinks, ...rest } = user;

  return {
    ...rest,
    students: caregiverLinks.map((link) => ({
      ...link.student,
      relationship: link.relationship,
      consentGivenAt: link.consentGivenAt,
    })),
    caregivers: studentLinks.map((link) => ({
      ...link.caregiver,
      relationship: link.relationship,
      consentGivenAt: link.consentGivenAt,
    })),
  };
};

export const getUserByQrToken = async (
  qrToken: string
): Promise<UserWithRelations | null> => {
  const user = await prisma.user.findUnique({
    where: { qrToken },
    include: {
      studentProfile: true,
      caregiverProfile: true,
      studentLinks: {
        select: {
          caregiver: { select: { id: true, name: true, email: true } },
          relationship: true,
          consentGivenAt: true,
        },
      },
      eventSignups: {
        include: {
          event: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!user) return null;

  const { studentLinks, ...rest } = user;

  return {
    ...rest,
    caregivers: studentLinks.map((link) => ({
      ...link.caregiver,
      relationship: link.relationship,
      consentGivenAt: link.consentGivenAt,
    })),
  };
};

export const updateUser = async (
  id: string,
  data: UpdateUserInput
): Promise<User | null> => {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) return null;

  return prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id },
      data: {
        name: data.name,
      },
    });

    if (data.studentProfile && user.role === Role.STUDENT) {
      await tx.studentProfile.upsert({
        where: { userId: id },
        create: { ...data.studentProfile, userId: id },
        update: data.studentProfile,
      });
    }

    if (data.caregiverProfile && user.role !== Role.STUDENT) {
      await tx.caregiverProfile.upsert({
        where: { userId: id },
        create: { ...data.caregiverProfile, userId: id },
        update: data.caregiverProfile,
      });
    }

    return updatedUser;
  });
};

export const getUserEvents = async (
  userId: string,
  options?: {
    upcoming?: boolean;
    past?: boolean;
  }
) => {
  const now = new Date();
  const whereClause: {
    userId: string;
    status?: { notIn: SignupStatus[] };
    event?: { startTime?: { gte?: Date; lt?: Date } };
  } = {
    userId,
    status: { notIn: [SignupStatus.CANCELLED, SignupStatus.DECLINED] },
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
        startTime: "asc",
      },
    },
  });

  return signups.map((signup) => ({
    ...signup.event,
    signupId: signup.id,
    signedUpAt: signup.createdAt,
    signupStatus: signup.status,
    signedUpBy: signup.signedUpBy,
  }));
};

export const getCaregiverStudents = async (caregiverId: string) => {
  const links = await prisma.caregiverStudent.findMany({
    where: {
      caregiverId,
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          qrToken: true,
          createdAt: true,
          studentProfile: true,
        },
      },
    },
    orderBy: {
      student: {
        name: "asc",
      },
    },
  });

  return links.map((link) => ({
    ...link.student,
    relationship: link.relationship,
    consentGivenAt: link.consentGivenAt,
  }));
};

export const regenerateQrToken = async (userId: string): Promise<string> => {
  const newToken = generateQrToken();

  await prisma.user.update({
    where: { id: userId },
    data: { qrToken: newToken },
  });

  return newToken;
};

export const assignStudentToCaregiver = async (
  studentId: string,
  caregiverId: string,
  relationship?: string
): Promise<void> => {
  const [student, caregiver] = await Promise.all([
    prisma.user.findUnique({ where: { id: studentId } }),
    prisma.user.findUnique({ where: { id: caregiverId } }),
  ]);

  if (!student || student.role !== Role.STUDENT) {
    throw new Error("Invalid student ID");
  }

  if (!caregiver || caregiver.role === Role.STUDENT) {
    throw new Error("Invalid caregiver ID");
  }

  await prisma.caregiverStudent.upsert({
    where: {
      caregiverId_studentId: {
        caregiverId,
        studentId,
      },
    },
    create: {
      caregiverId,
      studentId,
      relationship,
      consentGivenAt: new Date(),
    },
    update: {
      relationship,
      consentGivenAt: new Date(),
    },
  });
};

export const isCaregiverForStudent = async (
  caregiverId: string,
  studentId: string
): Promise<boolean> => {
  const link = await prisma.caregiverStudent.findUnique({
    where: {
      caregiverId_studentId: {
        caregiverId,
        studentId,
      },
    },
  });

  return !!link;
};
