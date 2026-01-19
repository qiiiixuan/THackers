import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '@prisma/client';

const router = Router();

// All user routes require authentication
router.use(authenticate);

/**
 * @route GET /api/users/my-students
 * @desc Get students managed by the authenticated caregiver
 * @access Private (Caregiver only)
 */
router.get('/my-students', authorize(Role.CAREGIVER), userController.getMyStudents);

/**
 * @route POST /api/users/regenerate-qr
 * @desc Regenerate QR token for the authenticated user
 * @access Private
 */
router.post('/regenerate-qr', userController.regenerateQr);

/**
 * @route POST /api/users/assign-student
 * @desc Assign a student to the authenticated caregiver
 * @access Private (Caregiver only)
 */
router.post('/assign-student', authorize(Role.CAREGIVER), userController.assignStudent);

/**
 * @route GET /api/users/qr/:token
 * @desc Get user by QR token (for caregiver scanning student QR)
 * @access Private (Caregiver only)
 */
router.get('/qr/:token', authorize(Role.CAREGIVER), userController.getUserByQrToken);

/**
 * @route GET /api/users/:id
 * @desc Get user by ID
 * @access Private
 */
router.get('/:id', userController.getUserById);

/**
 * @route PATCH /api/users/:id
 * @desc Update user profile
 * @access Private (own profile only)
 */
router.patch('/:id', userController.updateUser);

/**
 * @route GET /api/users/:id/events
 * @desc Get events a user has signed up for
 * @access Private
 */
router.get('/:id/events', userController.getUserEvents);

export default router;
