import { logoutUser } from "@/app/api/_lib/services/auth.service";
import { jsonError } from "@/app/api/_lib/response";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];

    if (!token) {
      return jsonError(400, "No token provided");
    }

    const result = await logoutUser(token);

    if (result.error) {
      return jsonError(400, result.error);
    }

    return Response.json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return jsonError(500, "Logout failed");
  }
}
