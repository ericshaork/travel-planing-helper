"use client";

import Image from "next/image";
import Link from "next/link";

import { UserMenu } from "@/components/auth/UserMenu";

export function CreateEntryHeader() {
  return (
    <header className="create-entry-header">
      <div className="mx-auto flex min-h-[60px] w-full max-w-[1480px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3 rounded-[14px] py-1 pr-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--clay)]"
        >
          <Image
            src="/images/brand/logo/logo-symbol-transparent.svg"
            alt="Wanderly logo"
            width={96}
            height={96}
            priority
            sizes="40px"
            className="h-9 w-9 rounded-[10px] object-contain sm:h-10 sm:w-10"
          />
          <span className="flex min-w-0 flex-col leading-none">
            <span className="text-[15px] font-bold tracking-[0.08em] text-[var(--ink)]">
              Wanderly
            </span>
            <span className="mt-1 text-[11px] font-semibold tracking-[0.18em] text-[var(--ink-muted)]">
              旅行计划工作台
            </span>
          </span>
        </Link>

        <div className="ml-auto flex min-w-0 shrink-0 items-center">
          <UserMenu minimal />
        </div>
      </div>
    </header>
  );
}
