import Link from "next/link";
import { AlertOctagon, CheckCircle2, Clock, Copy, Inbox, ListTodo } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { DemoTag, PriorityBadge, SafetyBadge, StatusBadge } from "@/components/badges";
import { getDashboardMetrics } from "@/lib/agent/tools";
import { listComplaints, listLocations } from "@/lib/database/queries";
import { parseFilters } from "@/lib/validation/schemas";
import { CATEGORIES, COMPLAINT_STATUSES, PRIORITIES } from "@/lib/constants";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard - CampusFix AI" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseFilters(searchParams);
  const [metrics, complaints, locations] = await Promise.all([
    getDashboardMetrics(),
    listComplaints(filters),
    listLocations(),
  ]);
  const filtered = Boolean(filters.q || filters.category || filters.location || filters.priority || filters.status);
  const hasDemo = complaints.some((c) => c.isDemo);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-bold">Complaints overview</h1>
      <p className="mt-1 text-sm text-muted">All figures are calculated from the database.</p>

      <section aria-label="Summary" className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard label="Total" value={metrics.total} icon={<Inbox className="h-4 w-4" aria-hidden="true" />} />
        <StatCard label="Open" value={metrics.open} icon={<Clock className="h-4 w-4" aria-hidden="true" />} tone="warn" />
        <StatCard label="Critical" value={metrics.critical} hint="Open complaints" icon={<AlertOctagon className="h-4 w-4" aria-hidden="true" />} tone="danger" />
        <StatCard label="Resolved" value={metrics.resolved} icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />} tone="good" />
        <StatCard label="Likely duplicates" value={metrics.duplicates} icon={<Copy className="h-4 w-4" aria-hidden="true" />} />
        <StatCard label="Pending tickets" value={metrics.pendingTickets} hint="Awaiting admin approval" icon={<ListTodo className="h-4 w-4" aria-hidden="true" />} tone="warn" />
      </section>

      <form method="get" className="panel mt-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6" role="search" aria-label="Filter complaints">
        <div className="lg:col-span-2">
          <label htmlFor="q" className="label">Search</label>
          <input id="q" name="q" defaultValue={filters.q ?? ""} placeholder="Title, ID, location" className="field" />
        </div>
        <div>
          <label htmlFor="category" className="label">Category</label>
          <select id="category" name="category" defaultValue={filters.category ?? ""} className="field">
            <option value="">All</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="location" className="label">Location</label>
          <select id="location" name="location" defaultValue={filters.location ?? ""} className="field">
            <option value="">All</option>
            {locations.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="priority" className="label">Priority</label>
          <select id="priority" name="priority" defaultValue={filters.priority ?? ""} className="field">
            <option value="">All</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="status" className="label">Status</label>
          <select id="status" name="status" defaultValue={filters.status ?? ""} className="field">
            <option value="">All</option>
            {COMPLAINT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="sort" className="label">Sort by</label>
          <select id="sort" name="sort" defaultValue={filters.sort} className="field">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="priority">Priority</option>
          </select>
        </div>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-2">
          <button type="submit" className="btn-primary">Apply filters</button>
          <Link href="/dashboard" className="btn-secondary">Clear</Link>
        </div>
      </form>

      {hasDemo && (
        <p className="mt-4 rounded-md bg-hazard-light p-3 text-sm text-hazard-dark">
          Rows tagged <strong>Demo data</strong> are seeded sample complaints, not real reports. Re-run
          <code className="mx-1 rounded bg-white/70 px-1">npm run db:seed</code> to refresh them.
        </p>
      )}

      <section className="panel mt-4 overflow-hidden" aria-label="Complaints">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <caption className="sr-only">Complaints matching the current filters</caption>
            <thead className="bg-paper text-xs text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Complaint</th>
                <th scope="col" className="px-4 py-3 font-semibold">Category</th>
                <th scope="col" className="px-4 py-3 font-semibold">Priority</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                <th scope="col" className="px-4 py-3 font-semibold">Reports</th>
                <th scope="col" className="px-4 py-3 font-semibold">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {complaints.map((c) => (
                <tr key={c.id} className="align-top hover:bg-paper/60">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/complaints/${c.complaintId}`} className="font-semibold text-sign hover:underline">
                      {c.title}
                    </Link>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                      <span className="font-display font-bold">{c.complaintId}</span>
                      <span>{c.location}</span>
                      {c.isDemo && <DemoTag />}
                    </p>
                  </td>
                  <td className="px-4 py-3">{c.category}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <PriorityBadge priority={c.priority} />
                      {c.safetyFlag && <SafetyBadge />}
                    </div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-xs">
                    {c.duplicateOf ? (
                      <span>Duplicate of <span className="font-semibold">{c.duplicateOf.complaintId}</span></span>
                    ) : c._count.duplicates > 0 ? (
                      <span className="font-semibold">{c._count.duplicates + 1} students</span>
                    ) : (
                      <span className="text-muted">1 student</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {complaints.length === 0 && (
          <div className="p-10 text-center text-muted">
            <Inbox className="mx-auto h-8 w-8" aria-hidden="true" />
            <p className="mt-3 font-semibold text-ink">{filtered ? "No complaints match these filters" : "No complaints yet"}</p>
            <p className="mt-1 text-sm">
              {filtered ? "Clear the filters to see everything." : "Run npm run db:seed to load demo data, or submit a report."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
