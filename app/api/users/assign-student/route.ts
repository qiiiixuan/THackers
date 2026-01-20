import { Role } from "@prisma/client";
import { getAuthContext } from "@/app/api/_lib/auth";
import { jsonError } from "@/app/api/_lib/response";
import * as userService from "@/app/api/_lib/services/user.service";

export async function POST(req: Request) {
  try {
    const { context, error } = await getAuthContext(req);

    if (error) {
      return jsonError(error.status, error.message);
    }

    if (context?.dbUser?.role !== Role.CAREGIVER) {
      return jsonError(403, "Only caregivers can assign students");
    }

    const body = await req.json();
    const { studentId, relationship } = body;

    if (!studentId) {
      return jsonError(400, "Student ID is required");
    }

    await userService.assignStudentToCaregiver(studentId, context.user.id, relationship);

    return Response.json({
      success: true,
      message: "Student assigned successfully",
    });
  } catch (error) {
    console.error("Assign student error:", error);
    return jsonError(500, error instanceof Error ? error.message : "Failed to assign student");
  }
}
