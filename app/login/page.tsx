import Link from "next/link";

import { LoginForm } from "@/components/auth/LoginForm";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const rawReturnTo = resolvedSearchParams.returnTo;
  const returnTo = Array.isArray(rawReturnTo) ? rawReturnTo[0] : rawReturnTo;

  return (
    <div className="paper-texture flex min-h-screen flex-col overflow-x-clip text-[var(--ink)]">
      <Header />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-8 pt-4 sm:px-8 sm:pb-16 sm:pt-10">
        <nav
          aria-label="登录页返回入口"
          className="mb-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold sm:mb-7"
        >
          <Link
            href={returnTo?.startsWith("/") ? returnTo : "/"}
            className="border-b border-[var(--line-strong)] pb-1 text-[var(--ink-muted)] hover:border-[var(--clay-deep)] hover:text-[var(--clay-deep)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--clay)]"
          >
            回到工作台
          </Link>
        </nav>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(30rem,1.1fr)] lg:gap-12">
          <div className="min-w-0 max-w-xl pt-0.5 lg:pt-8">
            <p className="inline-flex -rotate-1 rounded-full border border-[var(--sage-deep)] bg-[var(--sage-soft)] px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-[var(--sage-deep)] sm:text-xs">
              先补登录
            </p>

            <h1 className="mt-4 text-3xl font-semibold leading-[1.08] tracking-[-0.05em] sm:mt-6 sm:text-6xl">
              先把账号接上，
              <span className="mt-1 block text-[var(--clay)]">后面才好保存计划。</span>
            </h1>

            <p className="mt-3 max-w-lg text-sm leading-6 text-[var(--ink-muted)] sm:mt-6 sm:text-lg sm:leading-8">
              这轮只做最轻的邮箱 magic link。先让登录状态能出现、能退出、刷新后还能认出来，
              不把功能做得太重。
            </p>

            <div className="workspace-panel mt-8 hidden px-5 py-5 lg:block">
              <div className="relative z-[1] space-y-3 text-sm leading-7 text-[var(--ink-muted)]">
                <p className="workspace-kicker">THIS ROUND STOPS AT</p>
                <p>登录、退出、导航状态展示。</p>
                <p>不登录也照样可以继续走 <code>/create -&gt; /plan -&gt; /workspace</code>。</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <LoginForm returnTo={returnTo} />
          </div>
        </section>
      </main>

      <div className="hidden lg:block">
        <Footer />
      </div>
    </div>
  );
}
