import { Event, SignupStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { generateQrToken } from "../qr";

export interface CreateEventInput {
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  capacity?: number | null;
  requiresApproval?: boolean;
  allowWaitlist?: boolean;
  createdById: string;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  location?: string;
  startTime?: Date;
  endTime?: Date;
  capacity?: number | null;
  requiresApproval?: boolean;
  allowWaitlist?: boolean;
}

export interface EventFilters {
  startDate?: Date;
  endDate?: Date;
  search?: string;
  createdById?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export const createEvent = async (input: CreateEventInput): Promise<Event> => {
  return prisma.event.create({
    data: {
      ...input,
      qrToken: generateQrToken(),
      checkInToken: generateQrToken(),
    },
  });
};

export const getEventById = async (id: string) => {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: { signups: true },
      },
    },
  });

  if (!event) return null;

  const statusCounts = await prisma.eventSignup.groupBy({
    by: ["status"],
    where: { eventId: id },
    _count: { _all: true },
  });

  const counts = Object.values(SignupStatus).reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {} as Record<SignupStatus, number>);

  for (const item of statusCounts) {
    counts[item.status] = item._count._all;
  }

  return {
    ...event,
    signupCount: event._count.signups,
    statusCounts: counts,
  };
};

export const getEventByQrToken = async (qrToken: string) => {
  const event = await prisma.event.findUnique({
    where: { qrToken },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: { signups: true },
      },
    },
  });

  if (!event) return null;

  const statusCounts = await prisma.eventSignup.groupBy({
    by: ["status"],
    where: { eventId: event.id },
    _count: { _all: true },
  });

  const counts = Object.values(SignupStatus).reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {} as Record<SignupStatus, number>);

  for (const item of statusCounts) {
    counts[item.status] = item._count._all;
  }

  return {
    ...event,
    signupCount: event._count.signups,
    statusCounts: counts,
  };
};

export const getEventByCheckInToken = async (checkInToken: string) => {
  return prisma.event.findUnique({
    where: { checkInToken },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: { signups: true },
      },
    },
  });
};

export const getEvents = async (
  filters?: EventFilters,
  pagination?: PaginationOptions
) => {
  const page = pagination?.page || 1;
  const limit = pagination?.limit || 20;
  const skip = (page - 1) * limit;

  const where: {
    startTime?: { gte?: Date; lte?: Date };
    title?: { contains: string; mode: "insensitive" };
    createdById?: string;
  } = {};

  if (filters?.startDate) {
    where.startTime = { ...where.startTime, gte: filters.startDate };
  }

  if (filters?.endDate) {
    where.startTime = { ...where.startTime, lte: filters.endDate };
  }

  if (filters?.search) {
    where.title = { contains: filters.search, mode: "insensitive" };
  }

  if (filters?.createdById) {
    where.createdById = filters.createdById;
  }

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { signups: true },
        },
      },
      orderBy: { startTime: "asc" },
      skip,
      take: limit,
    }),
    prisma.event.count({ where }),
  ]);

  return {
    events: events.map((event) => ({
      ...event,
      signupCount: event._count.signups,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const updateEvent = async (
  id: string,
  data: UpdateEventInput
): Promise<Event | null> => {
  return prisma.event.update({
    where: { id },
    data,
  });
};

export const deleteEvent = async (id: string): Promise<void> => {
  await prisma.event.delete({
    where: { id },
  });
};

export const getEventSignups = async (eventId: string) => {
  return prisma.eventSignup.findMany({
    where: { eventId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          studentProfile: true,
        },
      },
      signedUpBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const regenerateEventQrToken = async (eventId: string): Promise<string> => {
  const newToken = generateQrToken();

  await prisma.event.update({
    where: { id: eventId },
    data: { qrToken: newToken },
  });

  return newToken;
};

export const regenerateEventCheckInToken = async (
  eventId: string
): Promise<string> => {
  const newToken = generateQrToken();

  await prisma.event.update({
    where: { id: eventId },
    data: { checkInToken: newToken },
  });

  return newToken;
};

export const isEventCreator = async (
  eventId: string,
  userId: string
): Promise<boolean> => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { createdById: true },
  });

  return event?.createdById === userId;
};
