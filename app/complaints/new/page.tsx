import { ComplaintForm } from "@/components/ComplaintForm";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";

export const metadata = { title: "Report an issue - CampusFix AI" };

export default function NewComplaintPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold">Report a campus problem</h1>
        <p className="mb-6 mt-2 text-muted">
          Give as much detail as you can. After you submit, the agent classifies the report and checks whether
          someone has already reported the same problem.
        </p>
        <ComplaintForm />
      </main>
      <SiteFooter />
    </>
  );
}
