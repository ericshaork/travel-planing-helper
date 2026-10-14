import Image from "next/image";

interface CreateEntryDecorProps {
  className?: string;
}

const CREATE_ENTRY_ASSET_BASE = "/assets/wanderly/create-entry";

export function HeroArchiveDecor({ className = "" }: CreateEntryDecorProps) {
  return (
    <div
      aria-hidden="true"
      className={[
        "pointer-events-none relative min-h-[180px] select-none",
        className,
      ].join(" ")}
    >
      <Image
        src={`${CREATE_ENTRY_ASSET_BASE}/decor/compass-line.svg`}
        alt=""
        width={220}
        height={220}
        unoptimized
        loading="eager"
        className="absolute right-3 top-0 w-[190px] opacity-[0.14]"
      />
    </div>
  );
}

export function CreateEntryPageDecor() {
  return null;
}
