import { handleError, ok, readJson } from "@/lib/api";
import { complaintIdSchema, updateComplaintStatusSchema } from "@/lib/validation/schemas";
import { updateComplaintStatus } from "@/lib/agent/tools";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = complaintIdSchema.parse(params.id);
    const body = updateComplaintStatusSchema.parse(await readJson(req));
    const updated = await updateComplaintStatus(id, body.status, body.notes);
    return ok({ complaintId: updated.complaintId, status: updated.status });
  } catch (err) {
    return handleError(err);
  }
}
