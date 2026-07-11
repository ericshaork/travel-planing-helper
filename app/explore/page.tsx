import { ExploreHome } from "@/components/explore/ExploreHome";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

export default function ExplorePage() {
  return (
    <div className="paper-texture flex min-h-screen flex-col overflow-x-clip text-[var(--ink)]">
      <Header
        minimal
        overlay={false}
        navItems={[
          { href: "/explore", label: "Explore" },
          { href: "/trips", label: "我的旅行" },
          { href: "/create", label: "创建旅行", emphasized: true },
          { href: "/favorites", label: "收藏" },
        ]}
      />

      <main className="mx-auto flex w-full max-w-[86rem] flex-1 flex-col px-4 pb-8 pt-1 sm:px-8 sm:pb-16 sm:pt-2">
        <ExploreHome />
      </main>

      <div className="hidden lg:block">
        <Footer />
      </div>
    </div>
  );
}
