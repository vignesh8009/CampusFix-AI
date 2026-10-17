import { handleError, ok } from "@/lib/api";
import { getInsights } from "@/lib/database/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok(await getInsights());
  } catch (err) {
    return handleError(err);
  }
}
