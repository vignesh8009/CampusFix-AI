import { handleError, ok } from "@/lib/api";
import { complaintIdSchema } from "@/lib/validation/schemas";
import { searchSimilarComplaints } from "@/lib/agent/tools";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = complaintIdSchema.parse(params.id);
    return ok(await searchSimilarComplaints(id));
  } catch (err) {
    return handleError(err);
  }
}
