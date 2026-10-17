import Link from "next/link";
import { Logo } from "./Logo";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="flex items-center gap-1 text-sm font-medium">
          <Link href="/complaints/new" className="rounded-md px-3 py-2 hover:bg-ink/5">
            Report an issue
          </Link>
          <Link href="/tracking" className="rounded-md px-3 py-2 hover:bg-ink/5">
            Track a complaint
          </Link>
          <Link href="/dashboard" className="btn-secondary !py-2">
            Admin login
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted sm:px-6">
        <p>
          CampusFix AI is a hackathon prototype. It records and organizes reports; it does not dispatch
          staff or emergency services. If someone is in immediate danger, contact campus security or local
          emergency services directly.
        </p>
      </div>
    </footer>
  );
}
