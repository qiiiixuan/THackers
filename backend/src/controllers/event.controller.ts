import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';
import * as eventService from '../services/event.service.js';
import { Role } from '@prisma/client';

// Validation schemas
const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  location: z.string().optional(),
  startTime: z.string().transform((str) => new Date(str)),
  endTime: z.string().transform((str) => new Date(str)),
}).refine((data) => data.endTime > data.startTime, {
  message: 'End time must be after start time',
});

const updateEventSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  startTime: z.string().transform((str) => new Date(str)).optional(),
  endTime: z.string().transform((str) => new Date(str)).optional(),
});

/**
 * Get all events
 * GET /api/events
 */
export const getEvents = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { page, limit, startDate, endDate, search } = req.query;

    const filters = {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      search: search as string | undefined,
    };

    const pagination = {
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    };

    const result = await eventService.getEvents(filters, pagination);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get events',
    });
  }
};

/**
 * Get event by ID
 * GET /api/events/:id
 */
export const getEventById = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;

    const event = await eventService.getEventById(id);

    if (!event) {
      res.status(404).json({
        success: false,
        error: 'Event not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { event },
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get event',
    });
  }
};

/**
 * Get event by QR token
 * GET /api/events/qr/:token
 */
export const getEventByQrToken = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { token } = req.params;

    const event = await eventService.getEventByQrToken(token);

    if (!event) {
      res.status(404).json({
        success: false,
        error: 'Event not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { event },
    });
  } catch (error) {
    console.error('Get event by QR token error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get event',
    });
  }
};

/**
 * Create a new event
 * POST /api/events
 */
export const createEvent = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    // Only caregivers can create events
    if (req.dbUser?.role !== Role.CAREGIVER) {
      res.status(403).json({
        success: false,
        error: 'Only caregivers can create events',
      });
      return;
    }

    const validation = createEventSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: validation.error.errors[0].message,
      });
      return;
    }

    const event = await eventService.createEvent({
      ...validation.data,
      createdById: req.user!.id,
    });

    res.status(201).json({
      success: true,
      data: { event },
      message: 'Event created successfully',
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create event',
    });
  }
};

/**
 * Update an event
 * PATCH /api/events/:id
 */
export const updateEvent = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if user is the event creator
    const isCreator = await eventService.isEventCreator(id, req.user!.id);

    if (!isCreator) {
      res.status(403).json({
        success: false,
        error: 'Only the event creator can update this event',
      });
      return;
    }

    const validation = updateEventSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: validation.error.errors[0].message,
      });
      return;
    }

    const event = await eventService.updateEvent(id, validation.data);

    if (!event) {
      res.status(404).json({
        success: false,
        error: 'Event not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { event },
      message: 'Event updated successfully',
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update event',
    });
  }
};

/**
 * Delete an event
 * DELETE /api/events/:id
 */
export const deleteEvent = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if user is the event creator
    const isCreator = await eventService.isEventCreator(id, req.user!.id);

    if (!isCreator) {
      res.status(403).json({
        success: false,
        error: 'Only the event creator can delete this event',
      });
      return;
    }

    await eventService.deleteEvent(id);

    res.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete event',
    });
  }
};

/**
 * Get signups for an event
 * GET /api/events/:id/signups
 */
export const getEventSignups = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;

    // Only caregivers can see event signups
    if (req.dbUser?.role !== Role.CAREGIVER) {
      res.status(403).json({
        success: false,
        error: 'Only caregivers can view event signups',
      });
      return;
    }

    const signups = await eventService.getEventSignups(id);

    res.json({
      success: true,
      data: { signups },
    });
  } catch (error) {
    console.error('Get event signups error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get event signups',
    });
  }
};

/**
 * Regenerate QR token for an event
 * POST /api/events/:id/regenerate-qr
 */
export const regenerateEventQr = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if user is the event creator
    const isCreator = await eventService.isEventCreator(id, req.user!.id);

    if (!isCreator) {
      res.status(403).json({
        success: false,
        error: 'Only the event creator can regenerate the QR token',
      });
      return;
    }

    const newToken = await eventService.regenerateEventQrToken(id);

    res.json({
      success: true,
      data: { qrToken: newToken },
      message: 'QR token regenerated successfully',
    });
  } catch (error) {
    console.error('Regenerate event QR error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to regenerate QR token',
    });
  }
};
