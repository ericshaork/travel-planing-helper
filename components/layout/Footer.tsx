export function Footer() {
  return (
    <footer className="mx-auto w-full max-w-6xl px-5 pb-8 sm:px-8">
      <div className="flex flex-col gap-2 border-t border-dashed border-[var(--line)] pt-5 text-xs leading-5 text-[var(--ink-muted)] sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="min-w-0 break-words">
          路线先做参考，实时天气、票价和开放状态出发前再确认。
        </p>
        <p className="min-w-0 break-words sm:text-right">
          慢一点，通常比多塞两个景点更好玩。
        </p>
      </div>
    </footer>
  );
}
