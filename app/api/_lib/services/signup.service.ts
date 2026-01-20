import { EventSignup, Role, SignupStatus } from "@prisma/client";
import { prisma } from "../prisma";

export interface CreateSignupInput {
  userId: string;
  eventId: string;
  signedUpById?: string;
}

const getExistingSignup = async (
  userId: string,
  eventId: string
): Promise<EventSignup | null> => {
  return prisma.eventSignup.findUnique({
    where: {
      userId_eventId: {
        userId,
        eventId,
      },
    },
  });
};

export const createSignup = async (
  input: CreateSignupInput
): Promise<EventSignup> => {
  const { userId, eventId, signedUpById } = input;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  if (new Date() > event.endTime) {
    throw new Error("Cannot sign up for a past event");
  }

  const existingSignup = await getExistingSignup(userId, eventId);
  if (
    existingSignup &&
    existingSignup.status !== SignupStatus.CANCELLED &&
    existingSignup.status !== SignupStatus.DECLINED
  ) {
    throw new Error("User is already signed up for this event");
  }

  const approvedCount = await prisma.eventSignup.count({
    where: {
      eventId,
      status: {
        in: [SignupStatus.APPROVED, SignupStatus.CHECKED_IN],
      },
    },
  });

  let status = SignupStatus.APPROVED;

  if (event.requiresApproval) {
    status = SignupStatus.PENDING;
  } else if (event.capacity !== null && event.capacity !== undefined) {
    if (approvedCount >= event.capacity) {
      if (event.allowWaitlist) {
        status = SignupStatus.WAITLISTED;
      } else {
        throw new Error("Event is at capacity");
      }
    }
  }

  if (existingSignup) {
    return prisma.eventSignup.update({
      where: { id: existingSignup.id },
      data: {
        signedUpById: signedUpById || null,
        status,
        approvedAt: status === SignupStatus.APPROVED ? new Date() : null,
        cancelledAt: null,
        statusNote: null,
      },
      include: {
        event: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  return prisma.eventSignup.create({
    data: {
      userId,
      eventId,
      signedUpById: signedUpById || null,
      status,
      approvedAt: status === SignupStatus.APPROVED ? new Date() : null,
    },
    include: {
      event: true,
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });
};

export const caregiverSignup = async (
  studentId: string,
  eventId: string,
  caregiverId: string
): Promise<EventSignup> => {
  const [student, caregiver] = await Promise.all([
    prisma.user.findUnique({ where: { id: studentId } }),
    prisma.user.findUnique({ where: { id: caregiverId } }),
  ]);

  if (!caregiver || caregiver.role === Role.STUDENT) {
    throw new Error("Only caregivers can perform this action");
  }

  if (!student || student.role !== Role.STUDENT) {
    throw new Error("Invalid student ID");
  }

  if (caregiver.role === Role.CAREGIVER) {
    const isLinked = await prisma.caregiverStudent.findUnique({
      where: {
        caregiverId_studentId: {
          caregiverId,
          studentId,
        },
      },
    });

    if (!isLinked) {
      throw new Error("Caregiver is not linked to this student");
    }
  }

  return createSignup({
    userId: studentId,
    eventId,
    signedUpById: caregiverId,
  });
};

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
    throw new Error("Signup not found");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const canCancel =
    user.role === Role.STAFF ||
    signup.userId === userId ||
    signup.signedUpById === userId ||
    (user.role === Role.CAREGIVER &&
      (await prisma.caregiverStudent.findUnique({
        where: {
          caregiverId_studentId: {
            caregiverId: userId,
            studentId: signup.userId,
          },
        },
      })));

  if (!canCancel) {
    throw new Error("You do not have permission to cancel this signup");
  }

  await prisma.eventSignup.update({
    where: { id: signupId },
    data: {
      status: SignupStatus.CANCELLED,
      cancelledAt: new Date(),
    },
  });

  await promoteWaitlist(signup.eventId);
};

export const getSignupById = async (signupId: string) => {
  return prisma.eventSignup.findUnique({
    where: { id: signupId },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true, studentProfile: true },
      },
      event: true,
      signedUpBy: {
        select: { id: true, name: true, email: true },
      },
      approvedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });
};

export const getUserSignups = async (userId: string) => {
  return prisma.eventSignup.findMany({
    where: { userId },
    include: {
      event: true,
      signedUpBy: {
        select: { id: true, name: true, email: true },
      },
      approvedBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: {
      event: { startTime: "asc" },
    },
  });
};

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
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
};

export const approveSignup = async (
  signupId: string,
  approverId: string
): Promise<EventSignup> => {
  const signup = await prisma.eventSignup.findUnique({
    where: { id: signupId },
    include: { event: true },
  });

  if (!signup) {
    throw new Error("Signup not found");
  }

  if (
    signup.status === SignupStatus.CANCELLED ||
    signup.status === SignupStatus.DECLINED
  ) {
    throw new Error("Cannot approve a cancelled or declined signup");
  }

  const approvedCount = await prisma.eventSignup.count({
    where: {
      eventId: signup.eventId,
      status: {
        in: [SignupStatus.APPROVED, SignupStatus.CHECKED_IN],
      },
    },
  });

  if (
    signup.event.capacity !== null &&
    signup.event.capacity !== undefined &&
    approvedCount >= signup.event.capacity
  ) {
    if (signup.event.allowWaitlist) {
      return prisma.eventSignup.update({
        where: { id: signupId },
        data: {
          status: SignupStatus.WAITLISTED,
          statusNote: "Auto-moved to waitlist (capacity reached).",
        },
      });
    }
    throw new Error("Event is at capacity");
  }

  return prisma.eventSignup.update({
    where: { id: signupId },
    data: {
      status: SignupStatus.APPROVED,
      approvedById: approverId,
      approvedAt: new Date(),
      statusNote: null,
    },
  });
};

export const declineSignup = async (
  signupId: string,
  note?: string
): Promise<EventSignup> => {
  const signup = await prisma.eventSignup.findUnique({
    where: { id: signupId },
  });

  if (!signup) {
    throw new Error("Signup not found");
  }

  const updated = await prisma.eventSignup.update({
    where: { id: signupId },
    data: {
      status: SignupStatus.DECLINED,
      statusNote: note || null,
      cancelledAt: new Date(),
    },
  });

  await promoteWaitlist(signup.eventId);

  return updated;
};

export const checkInSignup = async (
  signupId: string
): Promise<EventSignup> => {
  const signup = await prisma.eventSignup.findUnique({
    where: { id: signupId },
  });

  if (!signup) {
    throw new Error("Signup not found");
  }

  if (
    signup.status !== SignupStatus.APPROVED &&
    signup.status !== SignupStatus.CHECKED_IN
  ) {
    throw new Error("Only approved signups can be checked in");
  }

  if (signup.status === SignupStatus.CHECKED_IN) {
    return signup;
  }

  return prisma.eventSignup.update({
    where: { id: signupId },
    data: {
      status: SignupStatus.CHECKED_IN,
      checkedInAt: new Date(),
    },
  });
};

export const checkInByEventToken = async (
  eventId: string,
  userId: string
): Promise<EventSignup> => {
  const signup = await prisma.eventSignup.findUnique({
    where: {
      userId_eventId: {
        userId,
        eventId,
      },
    },
  });

  if (!signup) {
    throw new Error("Signup not found");
  }

  return checkInSignup(signup.id);
};

const promoteWaitlist = async (eventId: string): Promise<void> => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event || event.requiresApproval || !event.allowWaitlist || !event.capacity) {
    return;
  }

  const approvedCount = await prisma.eventSignup.count({
    where: {
      eventId,
      status: {
        in: [SignupStatus.APPROVED, SignupStatus.CHECKED_IN],
      },
    },
  });

  const slots = event.capacity - approvedCount;

  if (slots <= 0) {
    return;
  }

  const waitlisted = await prisma.eventSignup.findMany({
    where: {
      eventId,
      status: SignupStatus.WAITLISTED,
    },
    orderBy: { createdAt: "asc" },
    take: slots,
  });

  if (!waitlisted.length) {
    return;
  }

  const now = new Date();

  await prisma.$transaction(
    waitlisted.map((signup) =>
      prisma.eventSignup.update({
        where: { id: signup.id },
        data: {
          status: SignupStatus.APPROVED,
          approvedAt: now,
          statusNote: "Auto-promoted from waitlist.",
        },
      })
    )
  );
};
