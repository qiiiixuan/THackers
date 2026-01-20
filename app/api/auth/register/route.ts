import { z } from "zod";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { registerUser } from "@/app/api/_lib/services/auth.service";
import { jsonError } from "@/app/api/_lib/response";

const genderEnum = z.enum(["FEMALE", "MALE", "OTHER", "PREFER_NOT_TO_SAY"]);
const caregiverTypeEnum = z.enum(["MEDICAL", "TEACHER", "STAFF", "FAMILY", "OTHER"]);

const studentProfileSchema = z.object({
  gender: genderEnum.optional(),
  nationalId: z.string().min(4).optional(),
  nokName: z.string().min(1).optional(),
  nokContact: z.string().min(5).optional(),
  disabilityType: z.string().min(1).optional(),
  supportNeeds: z.string().min(1).optional(),
});

const caregiverProfileSchema = z.object({
  contactNumber: z.string().min(5).optional(),
  caregiverType: caregiverTypeEnum.optional(),
  organization: z.string().min(1).optional(),
  jobTitle: z.string().min(1).optional(),
});

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  role: z.nativeEnum(Role).optional(),
  studentProfile: studentProfileSchema.optional(),
  caregiverProfile: caregiverProfileSchema.optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return jsonError(400, validation.error.errors[0].message);
    }

    const result = await registerUser(validation.data);

    if (result.error) {
      return jsonError(400, result.error);
    }

    return NextResponse.json({
      success: true,
      data: {
        user: result.user,
        session: result.session,
      },
      message: "Registration successful",
    });
  } catch (error) {
    console.error("Registration error:", error);
    return jsonError(500, "Registration failed. Please try again.");
  }
}
