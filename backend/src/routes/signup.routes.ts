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
 * @access Private (Caregiver only)
 */
router.post('/caregiver', authorize(Role.CAREGIVER), signupController.caregiverSignup);

/**
 * @route POST /api/signups/bulk
 * @desc Bulk signup students for an event
 * @access Private (Caregiver only)
 */
router.post('/bulk', authorize(Role.CAREGIVER), signupController.bulkSignup);

/**
 * @route POST /api/signups/qr/:token
 * @desc Quick signup via QR scan
 * @access Private
 */
router.post('/qr/:token', signupController.qrSignup);

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

export default router;
