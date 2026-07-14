import Image from "next/image";

type ArchiveDecorationVariant =
  | "header"
  | "sectionDivider"
  | "route"
  | "foodPlaces"
  | "footer";

interface ArchiveDecorationsProps {
  variant: ArchiveDecorationVariant;
}

const DECORATION_BASE =
  "pointer-events-none absolute select-none object-contain";

export function ArchiveDecorations({ variant }: ArchiveDecorationsProps) {
  if (variant === "header") {
    return (
      <>
        <Image
          src="/images/explore/archive/decorations/archive-deco-tape-strip.png"
          alt=""
          aria-hidden
          width={138}
          height={30}
          className={`${DECORATION_BASE} right-24 top-2 z-0 rotate-[3deg] opacity-[0.34]`}
        />
        <Image
          src="/images/explore/archive/decorations/archive-deco-bookmark-tab.png"
          alt=""
          aria-hidden
          width={64}
          height={112}
          className={`${DECORATION_BASE} right-4 top-0 z-0 opacity-[0.28]`}
        />
        <Image
          src="/images/explore/archive/decorations/archive-deco-folded-corner.png"
          alt=""
          aria-hidden
          width={96}
          height={96}
          className={`${DECORATION_BASE} right-0 top-0 z-0 opacity-[0.2]`}
        />
      </>
    );
  }

  if (variant === "sectionDivider") {
    return (
      <>
        <Image
          src="/images/explore/archive/decorations/archive-deco-round-stamp.png"
          alt=""
          aria-hidden
          width={94}
          height={94}
          className={`${DECORATION_BASE} -right-2 top-1 opacity-[0.22]`}
        />
        <Image
          src="/images/explore/archive/decorations/archive-deco-torn-label.png"
          alt=""
          aria-hidden
          width={110}
          height={36}
          className={`${DECORATION_BASE} -left-3 top-0 rotate-[-5deg] opacity-[0.24]`}
        />
      </>
    );
  }

  if (variant === "route") {
    return (
      <>
        <Image
          src="/images/explore/archive/decorations/archive-deco-dotted-route.png"
          alt=""
          aria-hidden
          width={128}
          height={128}
          className={`${DECORATION_BASE} right-0 top-10 opacity-[0.18]`}
        />
        <Image
          src="/images/explore/archive/decorations/archive-deco-route-compass.png"
          alt=""
          aria-hidden
          width={72}
          height={72}
          className={`${DECORATION_BASE} right-8 top-0 opacity-[0.26]`}
        />
        <Image
          src="/images/explore/archive/decorations/archive-deco-map-pin-arrow.png"
          alt=""
          aria-hidden
          width={94}
          height={94}
          className={`${DECORATION_BASE} -left-2 bottom-0 opacity-[0.24]`}
        />
      </>
    );
  }

  if (variant === "foodPlaces") {
    return (
      <>
        <Image
          src="/images/explore/archive/decorations/archive-deco-paperclip-tab.png"
          alt=""
          aria-hidden
          width={54}
          height={64}
          className={`${DECORATION_BASE} right-10 top-0 opacity-[0.28]`}
        />
        <Image
          src="/images/explore/archive/decorations/archive-deco-file-tab.png"
          alt=""
          aria-hidden
          width={84}
          height={28}
          className={`${DECORATION_BASE} -left-2 top-1 opacity-[0.22]`}
        />
      </>
    );
  }

  return (
    <>
      <Image
        src="/images/explore/archive/decorations/archive-deco-tape-strip.png"
        alt=""
        aria-hidden
        width={126}
        height={28}
        className={`${DECORATION_BASE} right-8 top-2 opacity-[0.24]`}
      />
      <Image
        src="/images/explore/archive/decorations/archive-deco-round-stamp.png"
        alt=""
        aria-hidden
        width={82}
        height={82}
        className={`${DECORATION_BASE} right-0 bottom-0 opacity-[0.18]`}
      />
    </>
  );
}
