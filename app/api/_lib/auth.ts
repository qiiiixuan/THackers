import { prisma } from "./prisma";
import { supabase } from "./supabase";
import { User } from "@prisma/client";
import { AuthUser } from "./types";

export type AuthContext = {
  user: AuthUser;
  dbUser: User | null;
};

export type AuthError = {
  status: number;
  message: string;
};

export const getAuthContext = async (
  req: Request
): Promise<{ context?: AuthContext; error?: AuthError }> => {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: { status: 401, message: "Missing or invalid authorization header" } };
  }

  const token = authHeader.split(" ")[1];

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return { error: { status: 401, message: "Invalid or expired token" } };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: data.user.id },
  });

  return {
    context: {
      user: {
        id: data.user.id,
        email: data.user.email || "",
      },
      dbUser,
    },
  };
};
