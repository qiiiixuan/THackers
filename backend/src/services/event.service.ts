import { prisma } from '../utils/prisma.js';
import { Event } from '@prisma/client';
import { generateQrToken } from '../utils/qr.utils.js';

export interface CreateEventInput {
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  createdById: string;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  location?: string;
  startTime?: Date;
  endTime?: Date;
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

/**
 * Create a new event
 */
export const createEvent = async (input: CreateEventInput): Promise<Event> => {
  return prisma.event.create({
    data: {
      ...input,
      qrToken: generateQrToken(),
    },
  });
};

/**
 * Get event by ID with signup count
 */
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

  return {
    ...event,
    signupCount: event._count.signups,
  };
};

/**
 * Get event by QR token (used when student scans event QR)
 */
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

  return {
    ...event,
    signupCount: event._count.signups,
  };
};

/**
 * Get all events with optional filters and pagination
 */
export const getEvents = async (
  filters?: EventFilters,
  pagination?: PaginationOptions
) => {
  const page = pagination?.page || 1;
  const limit = pagination?.limit || 20;
  const skip = (page - 1) * limit;

  const where: {
    startTime?: { gte?: Date; lte?: Date };
    title?: { contains: string; mode: 'insensitive' };
    createdById?: string;
  } = {};

  if (filters?.startDate) {
    where.startTime = { ...where.startTime, gte: filters.startDate };
  }

  if (filters?.endDate) {
    where.startTime = { ...where.startTime, lte: filters.endDate };
  }

  if (filters?.search) {
    where.title = { contains: filters.search, mode: 'insensitive' };
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
      orderBy: { startTime: 'asc' },
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

/**
 * Update an event
 */
export const updateEvent = async (
  id: string,
  data: UpdateEventInput
): Promise<Event | null> => {
  return prisma.event.update({
    where: { id },
    data,
  });
};

/**
 * Delete an event
 */
export const deleteEvent = async (id: string): Promise<void> => {
  await prisma.event.delete({
    where: { id },
  });
};

/**
 * Get signups for an event
 */
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
        },
      },
      signedUpBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Regenerate QR token for an event
 */
export const regenerateEventQrToken = async (eventId: string): Promise<string> => {
  const newToken = generateQrToken();
  
  await prisma.event.update({
    where: { id: eventId },
    data: { qrToken: newToken },
  });

  return newToken;
};

/**
 * Check if user is event creator
 */
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
