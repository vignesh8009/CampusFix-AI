export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse" aria-busy="true" aria-label="Loading dashboard">
      <div className="h-9 w-64 rounded bg-ink/10" />
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-ink/10" />
        ))}
      </div>
      <div className="mt-6 h-24 rounded-lg bg-ink/10" />
      <div className="mt-4 h-72 rounded-lg bg-ink/10" />
    </div>
  );
}
