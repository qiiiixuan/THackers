import { getAuthContext } from "@/app/api/_lib/auth";
import { jsonError } from "@/app/api/_lib/response";
import * as userService from "@/app/api/_lib/services/user.service";

export async function POST(req: Request) {
  try {
    const { context, error } = await getAuthContext(req);

    if (error) {
      return jsonError(error.status, error.message);
    }

    const newToken = await userService.regenerateQrToken(context!.user.id);

    return Response.json({
      success: true,
      data: { qrToken: newToken },
      message: "QR token regenerated successfully",
    });
  } catch (error) {
    console.error("Regenerate QR error:", error);
    return jsonError(500, "Failed to regenerate QR token");
  }
}
