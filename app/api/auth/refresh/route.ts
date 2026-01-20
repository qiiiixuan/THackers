import { refreshToken } from "@/app/api/_lib/services/auth.service";
import { jsonError } from "@/app/api/_lib/response";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const refresh_token = body?.refresh_token;

    if (!refresh_token) {
      return jsonError(400, "Refresh token is required");
    }

    const tokens = await refreshToken(refresh_token);

    if (!tokens) {
      return jsonError(401, "Invalid refresh token");
    }

    return Response.json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    return jsonError(500, "Failed to refresh token");
  }
}
