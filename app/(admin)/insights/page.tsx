import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { getInsights } from "@/lib/database/queries";
import { PriorityBadge, StatusBadge } from "@/components/badges";
import { formatHours } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Insights - CampusFix AI" };

function Bars({ items, empty }: { items: { label: string; count: number }[]; empty: string }) {
  if (items.length === 0) return <p className="mt-3 text-sm text-muted">{empty}</p>;
  const max = Math.max(...items.map((i) => i.count));
  return (
    <ul className="mt-3 space-y-2.5">
      {items.map((i) => (
        <li key={i.label} className="text-sm">
          <div className="flex justify-between gap-3">
            <span className="truncate">{i.label}</span>
            <span className="font-semibold">{i.count}</span>
          </div>
          <div className="mt-1 h-2.5 rounded-full bg-ink/10" role="presentation">
            <div className="h-2.5 rounded-full bg-sign" style={{ width: `${Math.max(4, (i.count / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function InsightsPage() {
  const ins = await getInsights();
  const maxVol = Math.max(1, ...ins.volume.map((v) => v.count));

  if (ins.totalComplaints === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold">Campus insights</h1>
        <div className="panel mt-6 p-10 text-center text-muted">
          <BarChart3 className="mx-auto h-8 w-8" aria-hidden="true" />
          <p className="mt-3 font-semibold text-ink">No data to analyze yet</p>
          <p className="mt-1 text-sm">Insights appear after complaints are submitted. Run npm run db:seed to load demo data.</p>
        </div>
      </div>
    );
  }

  const { volumeChange: vc } = ins;
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-bold">Campus insights</h1>
      <p className="mt-1 text-sm text-muted">Based on {ins.totalComplaints} complaints in the database.</p>
      {!ins.hasEnoughData && (
        <p className="mt-4 rounded-md bg-hazard-light p-3 text-sm text-hazard-dark">
          There are only {ins.totalComplaints} complaints, so trends below may not be meaningful yet.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="panel p-5" aria-labelledby="cat-h">
          <h2 id="cat-h" className="text-lg font-bold">Most reported categories</h2>
          <Bars items={ins.topCategories} empty="No categories yet." />
        </section>
        <section className="panel p-5" aria-labelledby="loc-h">
          <h2 id="loc-h" className="text-lg font-bold">Locations with the most complaints</h2>
          <Bars items={ins.topLocations} empty="No locations yet." />
        </section>

        <section className="panel p-5" aria-labelledby="vol-h">
          <h2 id="vol-h" className="text-lg font-bold">Complaint volume, last 6 weeks</h2>
          {ins.hasEnoughData ? (
            <>
              <div className="mt-4 flex h-40 items-end gap-2" role="img" aria-label={`Weekly complaint counts: ${ins.volume.map((v) => `${v.label} ${v.count}`).join(", ")}`}>
                {ins.volume.map((v) => (
                  <div key={v.label} className="flex flex-1 flex-col items-center justify-end gap-1">
                    <span className="text-xs font-semibold">{v.count}</span>
                    <div className="w-full rounded-t bg-sign" style={{ height: `${Math.max(2, (v.count / maxVol) * 100)}%` }} />
                  </div>
                ))}
              </div>
              <div className="mt-1 flex gap-2 text-center text-[11px] text-muted">
                {ins.volume.map((v) => <span key={v.label} className="flex-1">{v.label}</span>)}
              </div>
              <p className="mt-3 text-sm text-muted">
                {vc.percent === null
                  ? `${vc.thisWeek} complaints this week. There were none last week, so no change can be calculated.`
                  : `${vc.thisWeek} this week versus ${vc.lastWeek} last week (${vc.percent > 0 ? "+" : ""}${vc.percent}%).`}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">Not enough complaints to show a volume trend yet.</p>
          )}
        </section>

        <section className="panel p-5" aria-labelledby="res-h">
          <h2 id="res-h" className="text-lg font-bold">Average resolution time</h2>
          {ins.resolution.averageHours === null ? (
            <p className="mt-3 text-sm text-muted">
              Not enough data. At least {ins.resolution.minimumSamples} resolved complaints are needed; there
              {ins.resolution.sampleSize === 1 ? " is" : " are"} {ins.resolution.sampleSize} so far.
            </p>
          ) : (
            <>
              <p className="mt-3 font-display text-4xl font-bold">{formatHours(ins.resolution.averageHours)}</p>
              <p className="text-sm text-muted">Average time from submission to resolution across {ins.resolution.sampleSize} resolved complaints.</p>
            </>
          )}
        </section>

        <section className="panel p-5" aria-labelledby="rep-h">
          <h2 id="rep-h" className="text-lg font-bold">Repeated unresolved issues</h2>
          {ins.repeatedUnresolved.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No unresolved issue has been reported more than once.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line text-sm">
              {ins.repeatedUnresolved.map((r) => (
                <li key={r.complaintId} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link href={`/dashboard/complaints/${r.complaintId}`} className="block truncate font-semibold text-sign hover:underline">{r.title}</Link>
                    <p className="text-xs text-muted">{r.location}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-900">{r.reports} reports</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel p-5" aria-labelledby="hp-h">
          <h2 id="hp-h" className="text-lg font-bold">High-priority open complaints</h2>
          {ins.highPriority.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No open High or Critical complaints.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line text-sm">
              {ins.highPriority.map((h) => (
                <li key={h.complaintId} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link href={`/dashboard/complaints/${h.complaintId}`} className="block truncate font-semibold text-sign hover:underline">{h.title}</Link>
                    <p className="text-xs text-muted">{h.location}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2"><PriorityBadge priority={h.priority} /><StatusBadge status={h.status} /></div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
