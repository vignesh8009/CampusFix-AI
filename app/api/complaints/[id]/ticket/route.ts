import { handleError, ok, readJson } from "@/lib/api";
import { complaintIdSchema, createTicketSchema } from "@/lib/validation/schemas";
import { createMaintenanceTicket } from "@/lib/agent/tools";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = complaintIdSchema.parse(params.id);
    const body = createTicketSchema.parse(await readJson(req));
    const ticket = await createMaintenanceTicket(id, {
      approved: body.approval,
      approvedBy: body.approvedBy,
    });
    return ok(ticket, 201);
  } catch (err) {
    return handleError(err);
  }
}
