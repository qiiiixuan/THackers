import { getAuthContext } from "@/app/api/_lib/auth";
import { getCurrentUser } from "@/app/api/_lib/services/auth.service";
import { jsonError } from "@/app/api/_lib/response";

export async function GET(req: Request) {
  try {
    const { context, error } = await getAuthContext(req);

    if (error) {
      return jsonError(error.status, error.message);
    }

    if (!context?.user) {
      return jsonError(401, "Not authenticated");
    }

    const user = await getCurrentUser(context.user.id);

    if (!user) {
      return jsonError(404, "User not found");
    }

    return Response.json({
      success: true,
      data: { user },
    });
  } catch (err) {
    console.error("Get current user error:", err);
    return jsonError(500, "Failed to get user info");
  }
}
