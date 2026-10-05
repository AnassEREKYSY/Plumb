/** Shown instantly while a page's data loads, so navigation never feels stuck. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="pb-6">
        <div className="skeleton h-3.5 w-40" />
        <div className="skeleton mt-3 h-8 w-64" />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-line p-5">
            <div className="skeleton h-3 w-20" />
            <div className="skeleton mt-4 h-7 w-28" />
            <div className="skeleton mt-3 h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="rounded-xl border border-line p-5 lg:col-span-8">
          <div className="skeleton h-4 w-48" />
          <div className="skeleton mt-6 h-64 w-full" />
        </div>
        <div className="rounded-xl border border-line p-5 lg:col-span-4">
          <div className="skeleton h-4 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="mt-5">
              <div className="skeleton h-3 w-full" />
              <div className="skeleton mt-2 h-1.5 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
