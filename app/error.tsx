"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-muted">
        The page could not load. If you just installed the project, check that the database was created with
        <code className="mx-1 rounded bg-ink/5 px-1.5 py-0.5">npm run setup</code>.
      </p>
      <button type="button" className="btn-primary mt-6" onClick={() => reset()}>
        Try again
      </button>
    </main>
  );
}
