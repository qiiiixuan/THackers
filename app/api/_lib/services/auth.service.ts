import { Role, User } from "@prisma/client";
import { supabase, supabaseAdmin } from "../supabase";
import { prisma } from "../prisma";
import { generateQrToken } from "../qr";
import type { CaregiverProfileInput, StudentProfileInput } from "../types";

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role?: Role;
  studentProfile?: StudentProfileInput;
  caregiverProfile?: CaregiverProfileInput;
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

export const registerUser = async (input: RegisterInput): Promise<AuthResult> => {
  const {
    email,
    password,
    name,
    role = Role.STUDENT,
    studentProfile,
    caregiverProfile,
  } = input;

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError || !authData.user) {
    return {
      user: null,
      session: null,
      error: authError?.message || "Failed to create account",
    };
  }

  try {
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          id: authData.user.id,
          email,
          name,
          role,
          qrToken: generateQrToken(),
        },
      });

      if (role === Role.STUDENT && studentProfile) {
        await tx.studentProfile.create({
          data: {
            ...studentProfile,
            userId: createdUser.id,
          },
        });
      }

      if (role !== Role.STUDENT && caregiverProfile) {
        await tx.caregiverProfile.create({
          data: {
            ...caregiverProfile,
            userId: createdUser.id,
          },
        });
      }

      return createdUser;
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
    if (supabaseAdmin) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    }
    console.error("Database error during registration:", dbError);
    return {
      user: null,
      session: null,
      error: "Failed to create user profile",
    };
  }
};

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
      error: error?.message || "Invalid credentials",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: data.user.id },
  });

  if (!user) {
    return {
      user: null,
      session: null,
      error: "User profile not found. Please contact support.",
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

export const logoutUser = async (token: string): Promise<{ error?: string }> => {
  const { error: sessionError } = await supabase.auth.setSession({
    access_token: token,
    refresh_token: "",
  });

  if (sessionError) {
    console.warn("Session set error:", sessionError.message);
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: error.message };
  }

  return {};
};

export const getCurrentUser = async (userId: string): Promise<User | null> => {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      studentProfile: true,
      caregiverProfile: true,
      caregiverLinks: {
        select: {
          student: { select: { id: true, name: true, email: true, qrToken: true } },
        },
      },
      studentLinks: {
        select: {
          caregiver: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
};

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
