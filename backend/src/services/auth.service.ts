import { supabase, supabaseAdmin } from '../config/supabase.js';
import { prisma } from '../utils/prisma.js';
import { generateQrToken } from '../utils/qr.utils.js';
import { Role, User } from '@prisma/client';

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role?: Role;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  user: User | null;
  session: {
    access_token: string;
    refresh_token: string;
  } | null;
  error?: string;
}

/**
 * Register a new user with Supabase Auth and create profile in database
 */
export const registerUser = async (input: RegisterInput): Promise<AuthResult> => {
  const { email, password, name, role = Role.STUDENT } = input;

  // Sign up with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError || !authData.user) {
    return {
      user: null,
      session: null,
      error: authError?.message || 'Failed to create account',
    };
  }

  // Create user profile in database
  try {
    const user = await prisma.user.create({
      data: {
        id: authData.user.id,
        email,
        name,
        role,
        qrToken: generateQrToken(),
      },
    });

    return {
      user,
      session: authData.session
        ? {
            access_token: authData.session.access_token,
            refresh_token: authData.session.refresh_token,
          }
        : null,
    };
  } catch (dbError) {
    // If database creation fails, try to delete the Supabase auth user
    if (supabaseAdmin) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    }
    console.error('Database error during registration:', dbError);
    return {
      user: null,
      session: null,
      error: 'Failed to create user profile',
    };
  }
};

/**
 * Login user with Supabase Auth
 */
export const loginUser = async (input: LoginInput): Promise<AuthResult> => {
  const { email, password } = input;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user || !data.session) {
    return {
      user: null,
      session: null,
      error: error?.message || 'Invalid credentials',
    };
  }

  // Fetch user profile from database
  const user = await prisma.user.findUnique({
    where: { id: data.user.id },
  });

  if (!user) {
    return {
      user: null,
      session: null,
      error: 'User profile not found. Please contact support.',
    };
  }

  return {
    user,
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
  };
};

/**
 * Logout user (invalidate session)
 */
export const logoutUser = async (token: string): Promise<{ error?: string }> => {
  // Set the session before signing out
  const { error: sessionError } = await supabase.auth.setSession({
    access_token: token,
    refresh_token: '', // We don't have the refresh token here
  });

  if (sessionError) {
    // Try to sign out anyway
    console.warn('Session set error:', sessionError.message);
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: error.message };
  }

  return {};
};

/**
 * Get current user from database
 */
export const getCurrentUser = async (userId: string): Promise<User | null> => {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      caregiver: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      students: {
        select: {
          id: true,
          name: true,
          email: true,
          qrToken: true,
        },
      },
    },
  });
};

/**
 * Refresh access token
 */
export const refreshToken = async (
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string } | null> => {
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    return null;
  }

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  };
};
