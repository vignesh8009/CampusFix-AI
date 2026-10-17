import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-muted">That page does not exist. Check the address or go back to the start.</p>
      <Link href="/" className="btn-primary mt-6">
        Back to home
      </Link>
    </main>
  );
}
