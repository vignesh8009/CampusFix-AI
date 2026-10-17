import { handleError, ok, readJson } from "@/lib/api";
import { ticketIdSchema, updateTicketSchema } from "@/lib/validation/schemas";
import { updateTicketStatus } from "@/lib/agent/tools";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { ticketId: string } }) {
  try {
    const id = ticketIdSchema.parse(params.ticketId);
    const body = updateTicketSchema.parse(await readJson(req));
    const updated = await updateTicketStatus(id, body);
    return ok(updated);
  } catch (err) {
    return handleError(err);
  }
}
