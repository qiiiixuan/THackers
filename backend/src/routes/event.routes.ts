import { Router } from 'express';
import * as eventController from '../controllers/event.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '@prisma/client';

const router = Router();

// All event routes require authentication
router.use(authenticate);

/**
 * @route GET /api/events
 * @desc Get all events with optional filters
 * @access Private
 */
router.get('/', eventController.getEvents);

/**
 * @route POST /api/events
 * @desc Create a new event
 * @access Private (Caregiver only)
 */
router.post('/', authorize(Role.CAREGIVER), eventController.createEvent);

/**
 * @route GET /api/events/qr/:token
 * @desc Get event by QR token
 * @access Private
 */
router.get('/qr/:token', eventController.getEventByQrToken);

/**
 * @route GET /api/events/:id
 * @desc Get event by ID
 * @access Private
 */
router.get('/:id', eventController.getEventById);

/**
 * @route PATCH /api/events/:id
 * @desc Update an event
 * @access Private (Event creator only)
 */
router.patch('/:id', authorize(Role.CAREGIVER), eventController.updateEvent);

/**
 * @route DELETE /api/events/:id
 * @desc Delete an event
 * @access Private (Event creator only)
 */
router.delete('/:id', authorize(Role.CAREGIVER), eventController.deleteEvent);

/**
 * @route GET /api/events/:id/signups
 * @desc Get signups for an event
 * @access Private (Caregiver only)
 */
router.get('/:id/signups', authorize(Role.CAREGIVER), eventController.getEventSignups);

/**
 * @route POST /api/events/:id/regenerate-qr
 * @desc Regenerate QR token for an event
 * @access Private (Event creator only)
 */
router.post('/:id/regenerate-qr', authorize(Role.CAREGIVER), eventController.regenerateEventQr);

export default router;
