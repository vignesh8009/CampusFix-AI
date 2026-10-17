import { handleError, AppError, ok } from "@/lib/api";
import { complaintIdSchema } from "@/lib/validation/schemas";
import { getTrackingView } from "@/lib/database/queries";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = complaintIdSchema.parse(params.id);
    const view = await getTrackingView(id);
    if (!view) throw new AppError(404, `No complaint found with ID ${id}`, "NOT_FOUND");
    return ok(view);
  } catch (err) {
    return handleError(err);
  }
}
