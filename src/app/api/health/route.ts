import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await query("SELECT 1");
    return Response.json({ status: "ok", service: "lina", database: "ok" });
  } catch {
    return Response.json({ status: "error", service: "lina", database: "unavailable" }, { status: 503 });
  }
}
