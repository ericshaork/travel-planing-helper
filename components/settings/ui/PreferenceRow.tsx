"use client";

export function PreferenceRow({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-3 border-b border-[rgba(142,139,127,0.16)] py-4 last:border-b-0 last:pb-0 sm:grid-cols-[minmax(0,260px)_minmax(0,1fr)] sm:items-start sm:gap-6">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-[var(--ink)]">{title}</h3>
        {description ? (
          <p className="text-sm leading-6 text-[var(--ink-muted)]">{description}</p>
        ) : null}
      </div>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
