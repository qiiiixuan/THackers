import { Role } from "@prisma/client";
import { z } from "zod";
import { getAuthContext } from "@/app/api/_lib/auth";
import { jsonError } from "@/app/api/_lib/response";
import * as eventService from "@/app/api/_lib/services/event.service";
import * as signupService from "@/app/api/_lib/services/signup.service";

const actionSchema = z.object({
  note: z.string().max(250).optional(),
});

const isEventManagerRole = (role?: Role) =>
  role === Role.CAREGIVER || role === Role.STAFF;

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { context, error } = await getAuthContext(req);

    if (error) {
      return jsonError(error.status, error.message);
    }

    if (!isEventManagerRole(context?.dbUser?.role)) {
      return jsonError(403, "Only staff or caregivers can decline signups");
    }

    let body: unknown = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const validation = actionSchema.safeParse(body);

    if (!validation.success) {
      return jsonError(400, validation.error.errors[0].message);
    }

    const signup = await signupService.getSignupById(params.id);

    if (!signup) {
      return jsonError(404, "Signup not found");
    }

    const isCreator = await eventService.isEventCreator(
      signup.eventId,
      context!.user.id
    );

    if (!isCreator && context?.dbUser?.role !== Role.STAFF) {
      return jsonError(403, "Only the event creator can decline signups");
    }

    const updated = await signupService.declineSignup(
      params.id,
      validation.data.note
    );

    return Response.json({
      success: true,
      data: { signup: updated },
      message: "Signup declined",
    });
  } catch (error) {
    console.error("Decline signup error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to decline signup";
    return jsonError(400, errorMessage);
  }
}
