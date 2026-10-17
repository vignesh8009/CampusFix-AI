import { handleError, AppError, ok } from "@/lib/api";
import { complaintIdSchema } from "@/lib/validation/schemas";
import { getComplaint } from "@/lib/agent/tools";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = complaintIdSchema.parse(params.id);
    const complaint = await getComplaint(id);
    if (!complaint) throw new AppError(404, `Complaint ${id} was not found`, "NOT_FOUND");
    return ok(complaint);
  } catch (err) {
    return handleError(err);
  }
}
