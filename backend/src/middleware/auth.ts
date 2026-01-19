import { Response, NextFunction } from 'express';
import { supabase } from '../config/supabase.js';
import { prisma } from '../utils/prisma.js';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';
import { Role } from '@prisma/client';

/**
 * Authentication middleware
 * Verifies Supabase JWT token and attaches user info to request
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header',
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
      return;
    }

    // Attach Supabase user info to request
    req.user = {
      id: user.id,
      email: user.email || '',
    };

    // Fetch database user info
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (dbUser) {
      req.dbUser = dbUser;
    }

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

/**
 * Role-based authorization middleware
 * Must be used after authenticate middleware
 */
export const authorize = (...allowedRoles: Role[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response<ApiResponse>,
    next: NextFunction
  ): void => {
    if (!req.dbUser) {
      res.status(403).json({
        success: false,
        error: 'User profile not found. Please complete registration.',
      });
      return;
    }

    if (!allowedRoles.includes(req.dbUser.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions for this action',
      });
      return;
    }

    next();
  };
};

/**
 * Optional authentication middleware
 * Attaches user info if token is provided, but doesn't require it
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user } } = await supabase.auth.getUser(token);

      if (user) {
        req.user = {
          id: user.id,
          email: user.email || '',
        };

        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
        });

        if (dbUser) {
          req.dbUser = dbUser;
        }
      }
    }

    next();
  } catch {
    // Continue without authentication on error
    next();
  }
};
