/**
 * Seeds demonstration data. Every seeded complaint has isDemo = true so the UI can label it.
 * Running the seed again replaces only the demo rows (real complaints are kept).
 */
import { PrismaClient } from "@prisma/client";
import { fallbackAnalyze } from "../lib/ai/fallback";
import { derivePriority } from "../lib/agent/priority";
import { scoreSimilarity } from "../lib/duplicate-detection";
import { generateComplaintId, generateTicketId } from "../lib/ids";
import { TEAM_BY_CATEGORY, Category } from "../lib/constants";

const prisma = new PrismaClient();
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

interface Demo {
  title: string;
  description: string;
  location: string;
  category: Category;
  daysAgo: number;
  status: "Submitted" | "Under Review" | "In Progress" | "Resolved" | "Closed";
  priority?: "Low" | "Medium" | "High" | "Critical";
  duplicateOf?: number; // index of the original complaint
  resolvedAfterHours?: number;
  resolutionNotes?: string;
  ticket?: { status: "Approved" | "Assigned" | "In Progress" | "Resolved"; notes?: string };
  anonymous?: boolean;
  studentName?: string;
}

const DEMO: Demo[] = [
  { title: "Fan not working in Room 204", description: "The ceiling fan in Room 204 has stopped working since Monday. The classroom gets very hot in the afternoon.", location: "Main Block, Room 204", category: "Electrical", daysAgo: 9, status: "In Progress", ticket: { status: "In Progress" }, studentName: "Ananya R." },
  { title: "Ceiling fan broken in Room 204", description: "The fan in Room 204 is dead and the whole class is sweating during lectures.", location: "Main Block - Room 204", category: "Electrical", daysAgo: 7, status: "In Progress", duplicateOf: 0, anonymous: true },
  { title: "Fan stopped, classroom very hot", description: "Fan in room 204 stopped working again, please repair it as soon as possible.", location: "Main Block Room 204", category: "Electrical", daysAgo: 5, status: "In Progress", duplicateOf: 0, studentName: "Kiran P." },
  { title: "Sparks from socket near projector", description: "There were sparks and a burning smell from the socket next to the projector in Lab 3. We switched it off and left the room.", location: "Computer Science Block, Lab 3", category: "Electrical", daysAgo: 2, status: "Under Review", anonymous: true },
  { title: "Wi-Fi down in the whole hostel", description: "There is no internet for all students in Hostel B since last night. We cannot attend online classes or submit assignments.", location: "Hostel B", category: "Wi-Fi / Network", daysAgo: 3, status: "Under Review", ticket: { status: "Assigned" }, studentName: "Rahul S." },
  { title: "No internet in Hostel B since yesterday", description: "Wi-Fi is not connecting on any floor of Hostel B. Many students are affected.", location: "Hostel B", category: "Wi-Fi / Network", daysAgo: 2, status: "Under Review", duplicateOf: 4, anonymous: true },
  { title: "Slow Wi-Fi in library reading hall", description: "Internet speed in the library reading hall is extremely slow in the evenings and pages do not load.", location: "Library", category: "Wi-Fi / Network", daysAgo: 12, status: "Resolved", resolvedAfterHours: 30, resolutionNotes: "Access point replaced and channel settings corrected. Speed verified.", ticket: { status: "Resolved", notes: "Access point replaced and channel settings corrected. Speed verified." }, studentName: "Meera T." },
  { title: "Water leaking from tap in washroom", description: "The tap in the first floor washroom keeps leaking and the floor is always wet.", location: "Hostel A, First floor washroom", category: "Plumbing / Water", daysAgo: 6, status: "Under Review", studentName: "Arjun V." },
  { title: "Washroom tap leaking continuously", description: "Tap leaking in the washroom on the first floor of Hostel A, water is being wasted.", location: "Hostel A first floor washroom", category: "Plumbing / Water", daysAgo: 4, status: "Under Review", duplicateOf: 7, anonymous: true },
  { title: "No drinking water in cafeteria", description: "The water purifier in the cafeteria is not giving any drinking water since morning, all students are affected.", location: "Cafeteria", category: "Plumbing / Water", daysAgo: 1, status: "Submitted", studentName: "Sneha K." },
  { title: "Washroom unclean and no soap", description: "The washroom near the ground is very dirty and there is no soap or water in the dispenser.", location: "Sports Complex", category: "Cleaning", daysAgo: 10, status: "Resolved", resolvedAfterHours: 20, resolutionNotes: "Deep cleaned and dispensers refilled. Cleaning schedule updated.", anonymous: true },
  { title: "Garbage not collected near cafeteria", description: "Garbage bins outside the cafeteria are overflowing and there is a bad smell.", location: "Cafeteria", category: "Cleaning", daysAgo: 8, status: "Resolved", resolvedAfterHours: 48, resolutionNotes: "Bins emptied and pickup frequency doubled." , studentName: "Dev M."},
  { title: "Wobbly chairs and broken bench", description: "Several chairs in Room 110 have broken legs and one bench is wobbly and unsafe to sit on.", location: "Main Block, Room 110", category: "Furniture", daysAgo: 14, status: "Resolved", resolvedAfterHours: 72, resolutionNotes: "Broken chairs replaced, bench repaired.", ticket: { status: "Resolved", notes: "Broken chairs replaced, bench repaired." }, studentName: "Isha B." },
  { title: "Projector not turning on in lab", description: "The projector in Lab 2 does not turn on and the remote is not responding. Lab sessions are affected.", location: "Computer Science Block, Lab 2", category: "Classroom Equipment", daysAgo: 4, status: "In Progress", ticket: { status: "In Progress" }, studentName: "Farhan A." },
  { title: "Microphone not working in auditorium", description: "The microphone and speaker system in the auditorium has no sound, which affected the seminar.", location: "Auditorium", category: "Classroom Equipment", daysAgo: 20, status: "Resolved", resolvedAfterHours: 96, resolutionNotes: "Mixer cable replaced and sound system tested.", ticket: { status: "Resolved", notes: "Mixer cable replaced and sound system tested." }, anonymous: true },
  { title: "CCTV camera not working at hostel gate", description: "The CCTV camera at the Hostel A gate has been off for a week and the guard says it is not recording.", location: "Hostel A, Main gate", category: "Security", daysAgo: 3, status: "Under Review", priority: "High", studentName: "Nikhil G." },
  { title: "Peeling paint on corridor wall", description: "Paint is peeling off the corridor wall on the second floor, it looks untidy but there is no other problem.", location: "Administrative Block", category: "Other", daysAgo: 11, status: "Under Review", anonymous: true },
  { title: "Street light off near parking, unsafe at night", description: "The light near the parking area is not working and the path is very dark, students feel unsafe walking at night.", location: "Parking Area", category: "Electrical", daysAgo: 1, status: "Submitted", studentName: "Pooja N." },
];

async function main() {
  const deleted = await prisma.complaint.deleteMany({ where: { isDemo: true } });
  if (deleted.count > 0) console.log(`Removed ${deleted.count} previous demo complaints.`);

  const now = Date.now();
  const created: { id: string; complaintId: string; data: Demo; createdAt: Date; priority: string }[] = [];

  for (let i = 0; i < DEMO.length; i++) {
    const d = DEMO[i];
    const createdAt = new Date(now - d.daysAgo * DAY - (i % 5) * HOUR);
    const analysis = fallbackAnalyze(d);
    const rules = derivePriority(d);
    const priority = d.priority ?? analysis.priority;
    const original = d.duplicateOf !== undefined ? created[d.duplicateOf] : undefined;

    let similarityScore: number | null = null;
    if (original) {
      const orig = DEMO[d.duplicateOf as number];
      similarityScore = scoreSimilarity(d, { ...orig, status: "Under Review" }).score;
    }
    const resolvedAt = d.status === "Resolved" ? new Date(createdAt.getTime() + (d.resolvedAfterHours ?? 24) * HOUR) : null;

    const row = await prisma.complaint.create({
      data: {
        complaintId: generateComplaintId(),
        title: d.title,
        description: d.description,
        location: d.location,
        category: d.category,
        studentName: d.anonymous ? null : d.studentName ?? null,
        anonymous: !!d.anonymous,
        priority,
        status: d.status,
        safetyFlag: rules.safetyFlag,
        aiSource: "fallback",
        aiFallbackReason: "Seeded demo data analyzed with the keyword-based fallback",
        aiSummary: analysis.summary,
        aiReasoning: analysis.reasoning,
        recommendedAction: analysis.recommendedAction,
        assignedTeam: TEAM_BY_CATEGORY[d.category],
        confidence: analysis.confidence,
        analyzedAt: createdAt,
        duplicateOfId: original?.id ?? null,
        similarityScore,
        resolutionNotes: d.status === "Resolved" ? d.resolutionNotes ?? null : null,
        resolvedAt,
        isDemo: true,
        createdAt,
      },
    });
    created.push({ id: row.id, complaintId: row.complaintId, data: d, createdAt, priority });

    await prisma.auditLog.create({
      data: { complaintId: row.id, action: "COMPLAINT_SUBMITTED", actor: "student", details: `Demo complaint ${row.complaintId} submitted.`, createdAt },
    });
    await prisma.auditLog.create({
      data: { complaintId: row.id, action: "COMPLAINT_CLASSIFIED", actor: "agent", details: `Source: fallback. Category: ${d.category}. Priority: ${priority}.${rules.safetyFlag ? " Flagged for urgent human review." : ""}`, createdAt: new Date(createdAt.getTime() + 60 * 1000) },
    });
    if (original) {
      await prisma.auditLog.create({
        data: { complaintId: row.id, action: "DUPLICATE_LINKED", actor: "agent", details: `Linked to ${original.complaintId} (score ${similarityScore}). New complaint preserved.`, createdAt: new Date(createdAt.getTime() + 2 * 60 * 1000) },
      });
    }

    if (!original) {
      const relatedCount = DEMO.filter((x) => x.duplicateOf === i).length;
      await prisma.investigationRecord.create({
        data: {
          complaintId: row.id,
          source: "fallback",
          summary: analysis.summary,
          reasoning: analysis.reasoning,
          recommendedAction: analysis.recommendedAction,
          suggestedTeam: TEAM_BY_CATEGORY[d.category],
          suggestedPriority: priority,
          relatedCount,
          similarJson: "[]",
          stepsJson: JSON.stringify([
            { tool: "getComplaint", status: "ok", detail: `Loaded "${d.title}"` },
            { tool: "classifyComplaint", status: "ok", detail: `${d.category}, ${priority} priority (fallback)` },
            { tool: "investigateComplaint", status: "ok", detail: relatedCount > 0 ? `${relatedCount + 1} reports found for this issue.` : "No similar unresolved complaints found." },
            { tool: "recommendAction", status: "ok", detail: d.ticket ? "Ticket approved by admin" : "Ticket suggested; waiting for admin approval" },
          ]),
          ticketSuggested: !d.ticket && d.status !== "Resolved",
          confidence: analysis.confidence,
          createdAt: new Date(createdAt.getTime() + 3 * 60 * 1000),
        },
      });
    }

    if (d.ticket) {
      const tResolved = d.ticket.status === "Resolved";
      const ticket = await prisma.maintenanceTicket.create({
        data: {
          ticketId: generateTicketId(),
          complaintId: row.id,
          assignedTeam: TEAM_BY_CATEGORY[d.category],
          recommendedAction: analysis.recommendedAction,
          priority,
          status: d.ticket.status,
          approvedBy: "Demo Admin",
          resolutionNotes: d.ticket.notes ?? null,
          resolvedAt: tResolved ? resolvedAt : null,
          createdAt: new Date(createdAt.getTime() + 4 * HOUR),
        },
      });
      await prisma.auditLog.create({
        data: { complaintId: row.id, ticketId: ticket.id, action: "TICKET_CREATED", actor: "admin", details: `Demo ticket ${ticket.ticketId} approved for ${ticket.assignedTeam}.`, createdAt: new Date(createdAt.getTime() + 4 * HOUR) },
      });
    }
  }
  console.log(`Seeded ${DEMO.length} demo complaints. Open /dashboard to view them.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
