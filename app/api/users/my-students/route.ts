import { Role } from "@prisma/client";
import { getAuthContext } from "@/app/api/_lib/auth";
import { jsonError } from "@/app/api/_lib/response";
import * as userService from "@/app/api/_lib/services/user.service";

export async function GET(req: Request) {
  try {
    const { context, error } = await getAuthContext(req);

    if (error) {
      return jsonError(error.status, error.message);
    }

    if (context?.dbUser?.role !== Role.CAREGIVER) {
      return jsonError(403, "Only caregivers can access this endpoint");
    }

    const students = await userService.getCaregiverStudents(context.user.id);

    return Response.json({
      success: true,
      data: { students },
    });
  } catch (error) {
    console.error("Get my students error:", error);
    return jsonError(500, "Failed to get students");
  }
}
