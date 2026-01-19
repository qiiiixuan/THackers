import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';
import * as authService from '../services/auth.service.js';
import { Role } from '@prisma/client';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
  role: z.nativeEnum(Role).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: validation.error.errors[0].message,
      });
      return;
    }

    const result = await authService.registerUser(validation.data);

    if (result.error) {
      res.status(400).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        session: result.session,
      },
      message: 'Registration successful',
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed. Please try again.',
    });
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
export const login = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: validation.error.errors[0].message,
      });
      return;
    }

    const result = await authService.loginUser(validation.data);

    if (result.error) {
      res.status(401).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.json({
      success: true,
      data: {
        user: result.user,
        session: result.session,
      },
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed. Please try again.',
    });
  }
};

/**
 * Logout user
 * POST /api/auth/logout
 */
export const logout = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(400).json({
        success: false,
        error: 'No token provided',
      });
      return;
    }

    const result = await authService.logoutUser(token);

    if (result.error) {
      res.status(400).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
    });
  }
};

/**
 * Get current user
 * GET /api/auth/me
 */
export const me = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }

    const user = await authService.getCurrentUser(req.user.id);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user info',
    });
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export const refresh = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      res.status(400).json({
        success: false,
        error: 'Refresh token is required',
      });
      return;
    }

    const tokens = await authService.refreshToken(refresh_token);

    if (!tokens) {
      res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
      });
      return;
    }

    res.json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token',
    });
  }
};
