import { z } from "zod";
import { Role } from "@prisma/client";
import { getAuthContext } from "@/app/api/_lib/auth";
import { jsonError } from "@/app/api/_lib/response";
import * as userService from "@/app/api/_lib/services/user.service";

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

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  studentProfile: studentProfileSchema.optional(),
  caregiverProfile: caregiverProfileSchema.optional(),
});

type StudentProfilePayload = z.infer<typeof studentProfileSchema>;

const maskSensitiveStudentProfile = (
  profile: StudentProfilePayload | null | undefined
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
  { params }: { params: { id: string } }
) {
  try {
    const { context, error } = await getAuthContext(req);

    if (error) {
      return jsonError(error.status, error.message);
    }

    const user = await userService.getUserById(params.id, true);

    if (!user) {
      return jsonError(404, "User not found");
    }

    const isSelf = context?.user?.id === params.id;
    const isStaff = context?.dbUser?.role === Role.STAFF;
    const isLinkedCaregiver =
      context?.dbUser?.role === Role.CAREGIVER
        ? await userService.isCaregiverForStudent(context.user.id, params.id)
        : false;

    const canAccess = isSelf || isStaff || isLinkedCaregiver;

    if (!canAccess) {
      return jsonError(403, "You do not have permission to view this profile");
    }

    const sanitizedSignups =
      user.eventSignups?.map((signup) => {
        if (!signup.event) return signup;
        const { checkInToken, ...event } = signup.event as Record<string, unknown>;
        return {
          ...signup,
          event,
        };
      }) || [];

    const baseUser = {
      ...user,
      eventSignups: sanitizedSignups,
    };

    const sanitizedUser =
      !isLinkedCaregiver && !isStaff
        ? {
            ...baseUser,
            studentProfile: maskSensitiveStudentProfile(user.studentProfile),
            eventSignups: [],
            caregivers: [],
          }
        : baseUser;

    return Response.json({
      success: true,
      data: { user: sanitizedUser },
    });
  } catch (error) {
    console.error("Get user error:", error);
    return jsonError(500, "Failed to get user");
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { context, error } = await getAuthContext(req);

    if (error) {
      return jsonError(error.status, error.message);
    }

    if (context?.user?.id !== params.id) {
      return jsonError(403, "You can only update your own profile");
    }

    const body = await req.json();
    const validation = updateUserSchema.safeParse(body);

    if (!validation.success) {
      return jsonError(400, validation.error.errors[0].message);
    }

    const user = await userService.updateUser(params.id, validation.data);

    if (!user) {
      return jsonError(404, "User not found");
    }

    return Response.json({
      success: true,
      data: { user },
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Update user error:", error);
    return jsonError(500, "Failed to update user");
  }
}
