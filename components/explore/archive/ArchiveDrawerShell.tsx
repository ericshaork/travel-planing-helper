"use client";

import { useEffect, useRef } from "react";

import { ArchiveViewer } from "./ArchiveViewer";

interface ArchiveDrawerShellProps {
  archiveId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ArchiveDrawerShell({
  archiveId,
  isOpen,
  onClose,
}: ArchiveDrawerShellProps) {
  const lockedScrollYRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const scrollY = window.scrollY;
    lockedScrollYRef.current = scrollY;

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyWidth = document.body.style.width;
    const previousBodyLeft = document.body.style.left;
    const previousBodyRight = document.body.style.right;
    const previousBodyOverscrollBehavior = document.body.style.overscrollBehavior;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousHtmlOverscrollBehavior =
      document.documentElement.style.overscrollBehavior;

    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.documentElement.style.overscrollBehavior =
        previousHtmlOverscrollBehavior;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;
      document.body.style.left = previousBodyLeft;
      document.body.style.right = previousBodyRight;
      document.body.style.overscrollBehavior = previousBodyOverscrollBehavior;

      const nextScrollY = lockedScrollYRef.current ?? scrollY;
      lockedScrollYRef.current = null;
      window.scrollTo({ top: nextScrollY, left: 0, behavior: "auto" });
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!archiveId && !isOpen) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[90] overflow-hidden transition-opacity duration-300 ${
        isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        aria-label="关闭档案"
        onClick={onClose}
        className={`absolute inset-0 bg-[rgba(43,36,28,0.18)] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        className={`absolute inset-y-0 right-0 flex h-screen w-full max-w-full justify-end transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="relative h-full w-full bg-transparent lg:w-[min(64vw,1240px)] lg:min-w-[760px]">
          <div className="h-full overflow-hidden px-2 py-2 sm:px-3 sm:py-3 lg:px-4 lg:py-4">
            <div className="relative flex h-full flex-col overflow-hidden rounded-[28px] border border-[rgba(158,136,110,0.18)] bg-[#f7efdf] shadow-[0_24px_56px_rgb(55_44_32_/_0.14)] sm:rounded-[30px]">
              <div className="relative z-[1] min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#f7efdf] bg-[url('/images/explore/archive/drawer/archive-drawer-paper-02.png')] bg-[length:100%_auto] bg-repeat-y bg-top [scrollbar-gutter:stable]">
                {archiveId ? (
                  <ArchiveViewer id={archiveId} mode="drawer" onClose={onClose} />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
