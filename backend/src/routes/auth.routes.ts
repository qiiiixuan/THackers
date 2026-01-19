import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', authController.register);

/**
 * @route POST /api/auth/login
 * @desc Login user
 * @access Public
 */
router.post('/login', authController.login);

/**
 * @route POST /api/auth/logout
 * @desc Logout user
 * @access Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route GET /api/auth/me
 * @desc Get current authenticated user
 * @access Private
 */
router.get('/me', authenticate, authController.me);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token
 * @access Public (requires refresh token in body)
 */
router.post('/refresh', authController.refresh);

export default router;
