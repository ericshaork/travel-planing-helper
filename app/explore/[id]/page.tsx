import { ArchivePageShell } from "@/components/explore/archive/ArchivePageShell";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

export default async function ExploreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="paper-texture flex min-h-screen flex-col overflow-x-clip text-[var(--ink)]">
      <Header
        minimal
        overlay={false}
        navItems={[
          { href: "/explore", label: "探索灵感" },
          { href: "/trips", label: "我的行程" },
          { href: "/create", label: "创建旅行", emphasized: true },
          { href: "/favorites", label: "收藏" },
        ]}
      />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-8 pt-4 sm:px-8 sm:pb-16 sm:pt-6">
        <ArchivePageShell archiveId={id} />
      </main>

      <div className="hidden lg:block">
        <Footer />
      </div>
    </div>
  );
}
