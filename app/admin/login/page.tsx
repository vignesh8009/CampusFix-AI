import Link from "next/link";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { getAuthMode } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin login - CampusFix AI" };

export default function AdminLoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const mode = getAuthMode();
  const raw = typeof searchParams.next === "string" ? searchParams.next : "";
  // Only allow redirects to paths on this site.
  const next = raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/admin/login") ? raw : "/dashboard";

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-md px-4 py-14">
        <h1 className="text-3xl font-bold">Admin login</h1>
        <p className="mb-6 mt-2 text-muted">For campus staff who review complaints and approve tickets.</p>

        {mode === "enabled" && <AdminLoginForm next={next} />}

        {mode === "open-dev" && (
          <div className="panel space-y-3 p-6 text-sm">
            <p className="font-semibold">No admin passcode is set.</p>
            <p className="text-muted">
              Admin pages are open in development. Add <code className="rounded bg-ink/5 px-1">ADMIN_PASSCODE</code> to
              your <code className="rounded bg-ink/5 px-1">.env</code> file and restart the server to require a login.
            </p>
            <Link href={next} className="btn-primary">
              Continue to admin
            </Link>
          </div>
        )}

        {mode === "locked" && (
          <div role="alert" className="panel space-y-2 border-red-400 p-6 text-sm">
            <p className="font-semibold text-red-900">Admin access is disabled.</p>
            <p className="text-muted">
              This server is running in production without an admin passcode. Set{" "}
              <code className="rounded bg-ink/5 px-1">ADMIN_PASSCODE</code> in <code className="rounded bg-ink/5 px-1">.env</code>{" "}
              and restart.
            </p>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
