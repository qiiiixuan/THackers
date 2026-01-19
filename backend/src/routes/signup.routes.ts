import { Router } from 'express';
import * as signupController from '../controllers/signup.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '@prisma/client';

const router = Router();

// All signup routes require authentication
router.use(authenticate);

/**
 * @route GET /api/signups/my
 * @desc Get all signups for the authenticated user
 * @access Private
 */
router.get('/my', signupController.getMySignups);

/**
 * @route POST /api/signups
 * @desc Sign up for an event (self-signup)
 * @access Private
 */
router.post('/', signupController.createSignup);

/**
 * @route POST /api/signups/caregiver
 * @desc Caregiver signs up a student for an event
 * @access Private (Staff/Caregiver only)
 */
router.post('/caregiver', authorize(Role.CAREGIVER, Role.STAFF), signupController.caregiverSignup);

/**
 * @route POST /api/signups/bulk
 * @desc Bulk signup students for an event
 * @access Private (Staff/Caregiver only)
 */
router.post('/bulk', authorize(Role.CAREGIVER, Role.STAFF), signupController.bulkSignup);

/**
 * @route POST /api/signups/qr/:token
 * @desc Quick signup via QR scan
 * @access Private
 */
router.post('/qr/:token', signupController.qrSignup);

/**
 * @route POST /api/signups/check-in/qr/:token
 * @desc Check in via event check-in QR token
 * @access Private
 */
router.post('/check-in/qr/:token', signupController.qrCheckIn);

/**
 * @route GET /api/signups/:id
 * @desc Get signup by ID
 * @access Private
 */
router.get('/:id', signupController.getSignupById);

/**
 * @route DELETE /api/signups/:id
 * @desc Cancel a signup
 * @access Private
 */
router.delete('/:id', signupController.cancelSignup);

/**
 * @route POST /api/signups/:id/approve
 * @desc Approve a signup
 * @access Private (Staff/Caregiver only)
 */
router.post('/:id/approve', authorize(Role.CAREGIVER, Role.STAFF), signupController.approveSignup);

/**
 * @route POST /api/signups/:id/decline
 * @desc Decline a signup
 * @access Private (Staff/Caregiver only)
 */
router.post('/:id/decline', authorize(Role.CAREGIVER, Role.STAFF), signupController.declineSignup);

/**
 * @route POST /api/signups/:id/check-in
 * @desc Check in a signup
 * @access Private (Staff/Caregiver only)
 */
router.post('/:id/check-in', authorize(Role.CAREGIVER, Role.STAFF), signupController.checkInSignup);

export default router;
