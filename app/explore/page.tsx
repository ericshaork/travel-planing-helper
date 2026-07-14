import { ExploreHome } from "@/components/explore/ExploreHome";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

export default function ExplorePage() {
  return (
    <div className="paper-texture explore-page-bg relative flex min-h-screen flex-col overflow-x-clip text-[var(--ink)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_left_center,rgba(233,223,202,0.22),transparent_24%),radial-gradient(circle_at_right_18%,rgba(223,232,216,0.18),transparent_20%)]"
      />
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

      <main className="relative z-[1] mx-auto flex w-full max-w-[clamp(1280px,88vw,1680px)] flex-1 flex-col px-4 pb-8 pt-1 sm:px-6 sm:pb-16 sm:pt-2 lg:px-8">
        <ExploreHome />
      </main>

      <div className="hidden lg:block">
        <Footer />
      </div>
    </div>
  );
}
