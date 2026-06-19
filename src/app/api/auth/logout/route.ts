import { clearSession } from "@/lib/auth";
import { validateAuthRequest } from "@/lib/request-security";

export async function POST(request: Request) {
  const securityError = validateAuthRequest(request);
  if (securityError) return securityError;
  await clearSession();
  return Response.json({ ok: true });
}
