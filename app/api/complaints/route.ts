import { NextRequest } from "next/server";
import { handleError, ok, readJson } from "@/lib/api";
import { createComplaintSchema, parseFilters } from "@/lib/validation/schemas";
import { createComplaint } from "@/lib/database/complaints";
import { listComplaints } from "@/lib/database/queries";
import { runAgentWorkflow } from "@/lib/agent/workflow";
import { prisma } from "@/lib/database/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
    const complaints = await listComplaints(parseFilters(raw));
    return ok(complaints);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const input = createComplaintSchema.parse(await readJson(req));
    const { complaint, alreadySubmitted } = await createComplaint(input);

    // The original report is already saved. Analysis failures must never lose it.
    let analysisOk = false;
    if (!alreadySubmitted) {
      try {
        await runAgentWorkflow(complaint.complaintId);
        analysisOk = true;
      } catch (err) {
        console.error("[api] workflow failed:", err instanceof Error ? err.message : "unknown");
      }
    }
    const latest = await prisma.complaint.findUnique({ where: { id: complaint.id } });
    const c = latest ?? complaint;
    return ok(
      {
        complaintId: c.complaintId,
        status: c.status,
        priority: c.priority,
        category: c.category,
        aiSource: c.aiSource,
        safetyFlag: c.safetyFlag,
        analysisCompleted: analysisOk,
        alreadySubmitted,
      },
      alreadySubmitted ? 200 : 201
    );
  } catch (err) {
    return handleError(err);
  }
}
