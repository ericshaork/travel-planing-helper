import Image from "next/image";
import Link from "next/link";

import { UserMenu } from "@/components/auth/UserMenu";

interface HeaderNavItem {
  href: string;
  label: string;
  emphasized?: boolean;
}

interface HeaderProps {
  minimal?: boolean;
  overlay?: boolean;
  navItems?: HeaderNavItem[];
}

function MinimalNav({ items }: { items: HeaderNavItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Primary"
      className="hidden items-center gap-2 lg:flex"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={
            item.emphasized
              ? "inline-flex min-h-10 items-center rounded-full border border-[var(--ink)] bg-[rgba(255,253,247,0.9)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--paper-bright)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
              : "inline-flex min-h-10 items-center rounded-full px-3 py-2 text-sm font-semibold text-[rgba(88,69,52,0.8)] transition-colors hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
          }
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function Header({
  minimal = false,
  overlay = true,
  navItems = [],
}: HeaderProps) {
  if (minimal) {
    if (overlay) {
      return (
        <header className="absolute inset-x-0 top-0 z-20">
          <div className="absolute left-[48px] right-[48px] top-[28px] flex items-start justify-between gap-6">
            <Link
              href="/"
              className="inline-flex rounded-[20px] border border-[rgba(193,181,158,0.18)] bg-[rgba(255,249,239,0.32)] px-2.5 py-1.5 text-[var(--ink)] shadow-[0_4px_10px_rgba(65,58,45,0.025)] backdrop-blur-[5px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--paper-bright)]"
            >
              <Image
                src="/images/brand/logo/logo-horizontal-transparent.svg"
                alt="Wanderly"
                width={182}
                height={102}
                priority
                className="h-auto w-[9.8rem]"
              />
            </Link>

            <div className="flex items-center gap-3">
              <MinimalNav items={navItems} />
              <UserMenu minimal />
            </div>
          </div>
        </header>
      );
    }

    return (
      <header className="mx-auto flex w-full max-w-[clamp(1280px,88vw,1680px)] items-start justify-between gap-6 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <Link
          href="/"
          className="inline-flex shrink-0 rounded-[20px] border border-[rgba(193,181,158,0.18)] bg-[rgba(255,249,239,0.32)] px-2.5 py-1.5 text-[var(--ink)] shadow-[0_4px_10px_rgba(65,58,45,0.025)] backdrop-blur-[5px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--clay)]"
        >
          <Image
            src="/images/brand/logo/logo-horizontal-transparent.svg"
            alt="Wanderly"
            width={182}
            height={102}
            priority
            className="h-auto w-[9.8rem]"
          />
        </Link>

        <div className="flex min-w-0 items-center gap-3">
          <MinimalNav items={navItems} />
          <UserMenu minimal />
        </div>
      </header>
    );
  }

  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-5 sm:px-8 sm:py-7">
      <div className="flex min-w-0 items-center gap-3" aria-label="漫游草签">
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 -rotate-3 place-items-center border border-[var(--ink)] bg-[var(--paper)] shadow-[3px_3px_0_var(--sand-deep)]"
        >
          <span className="size-2 rounded-full bg-[var(--clay)]" />
        </span>
        <div className="min-w-0">
          <p className="break-words text-sm font-bold tracking-[0.14em]">
            漫游草签
          </p>
          <p className="break-words text-[11px] text-[var(--ink-muted)]">
            自由行路线整理
          </p>
        </div>
      </div>

      <div className="flex max-w-full items-center gap-3">
        <p className="text-right text-xs leading-5 text-[var(--ink-muted)] sm:block">
          不卖课，只帮你先想清楚
        </p>
        <UserMenu />
      </div>
    </header>
  );
}
