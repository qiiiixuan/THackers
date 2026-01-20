import { Role } from "@prisma/client";
import { z } from "zod";
import { getAuthContext } from "@/app/api/_lib/auth";
import { jsonError } from "@/app/api/_lib/response";
import * as signupService from "@/app/api/_lib/services/signup.service";

const bulkSignupSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
  studentIds: z
    .array(z.string().uuid("Invalid student ID"))
    .min(1, "At least one student is required"),
});

const isEventManagerRole = (role?: Role) =>
  role === Role.CAREGIVER || role === Role.STAFF;

export async function POST(req: Request) {
  try {
    const { context, error } = await getAuthContext(req);

    if (error) {
      return jsonError(error.status, error.message);
    }

    if (!isEventManagerRole(context?.dbUser?.role)) {
      return jsonError(403, "Only caregivers or staff can bulk sign up students");
    }

    const body = await req.json();
    const validation = bulkSignupSchema.safeParse(body);

    if (!validation.success) {
      return jsonError(400, validation.error.errors[0].message);
    }

    const results = await signupService.bulkSignup(
      validation.data.studentIds,
      validation.data.eventId,
      context!.user.id
    );

    return Response.json({
      success: true,
      data: results,
      message: `${results.success.length} students signed up successfully, ${results.failed.length} failed`,
    });
  } catch (error) {
    console.error("Bulk signup error:", error);
    return jsonError(500, "Failed to process bulk signup");
  }
}
