import { handleError, ok } from "@/lib/api";
import { complaintIdSchema } from "@/lib/validation/schemas";
import { runAgentWorkflow } from "@/lib/agent/workflow";
import { getComplaint } from "@/lib/agent/tools";
import { AppError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = complaintIdSchema.parse(params.id);
    if (!(await getComplaint(id))) throw new AppError(404, `Complaint ${id} was not found`, "NOT_FOUND");
    const result = await runAgentWorkflow(id);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
