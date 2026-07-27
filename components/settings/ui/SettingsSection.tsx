"use client";

export function SettingsSection({
  id,
  title,
  hint,
  children,
}: {
  id?: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 pb-8 last:pb-0"
    >
      <div className="profile-card px-5 py-5">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <p className="edit-kicker">{title}</p>
            <h2 className="mt-1 text-base font-semibold text-[var(--ink)]">{title}</h2>
            {hint ? (
              <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">{hint}</p>
            ) : null}
          </div>
        </div>

        <hr className="profile-divider mb-4" />

        <div className="space-y-0">{children}</div>
      </div>
    </section>
  );
}
