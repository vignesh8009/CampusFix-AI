import { handleError, AppError, ok } from "@/lib/api";
import { complaintIdSchema } from "@/lib/validation/schemas";
import { getComplaint } from "@/lib/agent/tools";
import { listInvestigations } from "@/lib/database/queries";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = complaintIdSchema.parse(params.id);
    const c = await getComplaint(id);
    if (!c) throw new AppError(404, `Complaint ${id} was not found`, "NOT_FOUND");
    return ok(await listInvestigations(c.id));
  } catch (err) {
    return handleError(err);
  }
}
