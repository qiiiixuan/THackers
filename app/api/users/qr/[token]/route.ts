import { Role } from "@prisma/client";
import { getAuthContext } from "@/app/api/_lib/auth";
import { jsonError } from "@/app/api/_lib/response";
import { normalizeQrToken } from "@/app/api/_lib/qr";
import * as userService from "@/app/api/_lib/services/user.service";

const maskSensitiveStudentProfile = (
  profile: Record<string, string | null | undefined> | null | undefined
) => {
  if (!profile) return profile;

  return {
    ...profile,
    nationalId: profile.nationalId ? `****${profile.nationalId.slice(-4)}` : null,
    nokContact: profile.nokContact ? `****${profile.nokContact.slice(-4)}` : null,
  };
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { context, error } = await getAuthContext(req);

    if (error) {
      return jsonError(error.status, error.message);
    }

    if (context?.dbUser?.role !== Role.CAREGIVER && context?.dbUser?.role !== Role.STAFF) {
      return jsonError(403, "Only caregivers or staff can scan student QR codes");
    }

    const { token } = await params;
    const normalizedToken = normalizeQrToken(token);
    const user = await userService.getUserByQrToken(normalizedToken);

    if (!user) {
      return jsonError(404, "Student not found");
    }

    if (user.role !== Role.STUDENT) {
      return jsonError(400, "This QR code does not belong to a student");
    }

    const isStaff = context?.dbUser?.role === Role.STAFF;
    const isLinkedCaregiver =
      context?.dbUser?.role === Role.CAREGIVER
        ? await userService.isCaregiverForStudent(context.user.id, user.id)
        : false;

    const sanitizedUser =
      !isLinkedCaregiver && !isStaff
        ? {
            ...user,
            studentProfile: maskSensitiveStudentProfile(user.studentProfile as Record<string, string>),
            eventSignups: [],
            caregivers: [],
          }
        : user;

    return Response.json({
      success: true,
      data: { user: sanitizedUser, linked: isLinkedCaregiver },
    });
  } catch (error) {
    console.error("Get user by QR token error:", error);
    return jsonError(500, "Failed to get user");
  }
}
