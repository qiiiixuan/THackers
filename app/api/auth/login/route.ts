import { z } from "zod";
import { NextResponse } from "next/server";
import { loginUser } from "@/app/api/_lib/services/auth.service";
import { jsonError } from "@/app/api/_lib/response";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return jsonError(400, validation.error.errors[0].message);
    }

    const result = await loginUser(validation.data);

    if (result.error) {
      return jsonError(401, result.error);
    }

    return NextResponse.json({
      success: true,
      data: {
        user: result.user,
        session: result.session,
      },
      message: "Login successful",
    });
  } catch (error) {
    console.error("Login error:", error);
    return jsonError(500, "Login failed. Please try again.");
  }
}
