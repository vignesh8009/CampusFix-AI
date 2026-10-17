import Link from "next/link";
import {
  CheckCircle2,
  Copy,
  Eye,
  ListChecks,
  Search,
  ShieldAlert,
  KeyRound,
} from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";

const PROCESS = [
  { title: "Report", text: "A student describes the problem and where it is." },
  { title: "Triage", text: "The agent sets a category, priority and responsible team." },
  { title: "Repeat check", text: "It looks for the same problem already reported." },
  { title: "Approval", text: "An admin approves the maintenance ticket." },
  { title: "Fixed", text: "Status updates and resolution notes appear on the tracker." },
];

const FEATURES = [
  {
    icon: Search,
    title: "AI investigation",
    text: "Each report is read, classified and compared with unresolved complaints. The agent explains its reasoning and recommends the next step.",
  },
  {
    icon: Copy,
    title: "Duplicate detection",
    text: "Reports about the same problem are linked to the original, so one ticket covers everyone and the admin can see how many students are affected.",
  },
  {
    icon: ShieldAlert,
    title: "Priority management",
    text: "Safety rules cannot be overridden by the AI. Possible electrical or structural hazards are flagged for urgent human review.",
  },
  {
    icon: Eye,
    title: "Transparent tracking",
    text: "Students follow progress with a complaint ID. Every important change is written to an audit log.",
  },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:pt-16">
          <div>
            <h1 className="text-4xl font-bold leading-[1.1] sm:text-5xl">
              Report a campus problem once. Watch it get fixed.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Broken fans, Wi-Fi outages, water shortages, damaged equipment. CampusFix AI sorts every report,
              spots repeats and prepares a maintenance ticket for an admin to approve.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/complaints/new" className="btn-hazard px-6 py-3 text-base">
                Report an issue
              </Link>
              <Link href="/dashboard" className="btn-secondary px-6 py-3 text-base">
                View dashboard
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted">
              Already reported something?{" "}
              <Link href="/tracking" className="font-semibold text-sign underline underline-offset-2">
                Track your complaint
              </Link>
            </p>
          </div>

          {/* Door-sign style example of what the agent does with one report */}
          <figure aria-label="Example of how a report is handled" className="mx-auto w-full max-w-md">
            <div className="rounded-xl bg-sign p-1.5 shadow-lg">
              <div className="rounded-lg border-2 border-white/80 px-5 py-5 text-white">
                <p className="text-sm text-white/80">Example report</p>
                <p className="mt-1 font-display text-3xl font-bold leading-tight">Room 204</p>
                <p className="text-lg">Fan not working</p>
              </div>
            </div>
            <div className="panel mt-3 p-5">
              <p className="text-sm font-semibold">What the agent did</p>
              <ul className="mt-3 space-y-3 text-sm">
                {[
                  "Classified as Electrical, routed to Electrical Maintenance",
                  "Set priority to Medium after safety rules found no hazard",
                  "Found 2 earlier reports of the same fan and linked them",
                  "Drafted one ticket and is waiting for admin approval",
                ].map((line) => (
                  <li key={line} className="flex gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sign" aria-hidden="true" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </figure>
        </section>

        <section className="border-y border-line bg-white" aria-labelledby="process-heading">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <h2 id="process-heading" className="text-2xl font-bold">
              How a report moves through the system
            </h2>
            <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
              {PROCESS.map((step, i) => (
                <li key={step.title} className="border-t-4 border-sign pt-3">
                  <span className="font-display text-sm font-bold text-sign">Step {i + 1}</span>
                  <p className="mt-1 font-display text-lg font-bold">{step.title}</p>
                  <p className="mt-1 text-sm text-muted">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6" aria-labelledby="features-heading">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2 id="features-heading" className="text-3xl font-bold">
                Built so nothing gets lost
              </h2>
              <p className="mt-3 text-muted">
                Complaints are often repeated, overlooked or delayed because nobody sees the whole picture. The
                agent works from real records and never takes an action without a person approving it.
              </p>
            </div>
            <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <div key={title} className="border-t border-ink/20 pt-4">
                  <Icon className="h-6 w-6 text-sign" aria-hidden="true" />
                  <h3 className="mt-2 text-lg font-bold">{title}</h3>
                  <p className="mt-1 text-sm text-muted">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-ink text-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold">Works without an API key</h2>
              <p className="mt-2 text-white/80">
                Demo mode uses transparent keyword rules, so the full flow runs offline. Add a Gemini API key and
                the same workflow uses AI analysis. Every result is labeled with the source that produced it.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-2">
                <ListChecks className="h-4 w-4" aria-hidden="true" /> Seeded demo data included
              </span>
              <span className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-2">
                <KeyRound className="h-4 w-4" aria-hidden="true" /> Secrets stay in .env
              </span>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
