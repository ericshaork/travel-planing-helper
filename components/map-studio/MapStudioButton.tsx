"use client";

import { useState } from "react";

import {
  mapStudioButtonSkins,
  type MapStudioCoreIconKey,
  type MapStudioToolbarIconKey,
} from "@/lib/map-studio/assets";

type ButtonTone = "normal" | "danger";

function resolveSkin(input: {
  kind: "text" | "icon";
  hovered: boolean;
  selected?: boolean;
  disabled?: boolean;
  tone?: ButtonTone;
}) {
  const skins = mapStudioButtonSkins[input.kind];

  if (input.disabled) {
    return skins.disabled;
  }

  if (input.tone === "danger") {
    return skins.danger;
  }

  if (input.selected) {
    return skins.selected;
  }

  return input.hovered ? skins.hover : skins.base;
}

function AssetGlyph({
  src,
  className,
}: {
  src: string;
  className: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        backgroundImage: `url(${src})`,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "contain",
      }}
    />
  );
}

export interface MapStudioTextButtonProps {
  label: string;
  iconSrc: string;
  iconKey: MapStudioCoreIconKey;
  tooltip: string;
  selected?: boolean;
  disabled?: boolean;
  tone?: ButtonTone;
  onClick?: () => void;
}

export function MapStudioTextButton({
  label,
  iconSrc,
  iconKey,
  tooltip,
  selected = false,
  disabled = false,
  tone = "normal",
  onClick,
}: MapStudioTextButtonProps) {
  const [hovered, setHovered] = useState(false);
  const skin = resolveSkin({
    kind: "text",
    hovered,
    selected,
    disabled,
    tone,
  });
  const labelColor = disabled
    ? "rgba(229, 207, 145, 0.42)"
    : selected || hovered
      ? "#fff9e8"
      : "#fff4d6";
  const labelShadow = disabled
    ? "none"
    : selected || hovered
      ? "0 1px 1px rgba(0,0,0,0.95), 0 0 10px rgba(229,188,103,0.46)"
      : "0 1px 1px rgba(0,0,0,0.9), 0 0 8px rgba(210,165,83,0.28)";

  return (
    <button
      type="button"
      disabled={disabled}
      title={tooltip}
      aria-label={label}
      aria-pressed={selected}
      data-icon={iconKey}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className={`pointer-events-auto relative h-10 w-[82px] shrink-0 overflow-hidden border-0 bg-transparent text-[12px] font-extrabold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d8a64d] ${
        disabled ? "cursor-not-allowed opacity-70" : ""
      }`}
      style={{
        backgroundImage: `url(${skin})`,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "100% 100%",
        color: labelColor,
        textShadow: labelShadow,
      }}
    >
      <span className="relative z-[1] flex h-full items-center justify-center gap-1.5 px-2">
        <AssetGlyph
          src={iconSrc}
          className="h-[17px] w-[17px] shrink-0 drop-shadow-[0_0_4px_rgba(210,165,83,0.24)]"
        />
        <span className="truncate leading-none">{label}</span>
      </span>
    </button>
  );
}

export interface MapStudioIconButtonProps {
  label: string;
  iconSrc: string;
  iconKey: MapStudioToolbarIconKey;
  selected?: boolean;
  disabled?: boolean;
  tone?: ButtonTone;
  onClick?: () => void;
}

export function MapStudioIconButton({
  label,
  iconSrc,
  iconKey,
  selected = false,
  disabled = false,
  tone = "normal",
  onClick,
}: MapStudioIconButtonProps) {
  const [hovered, setHovered] = useState(false);
  const skin = resolveSkin({
    kind: "icon",
    hovered,
    selected,
    disabled,
    tone,
  });

  return (
    <button
      type="button"
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={selected}
      data-icon={iconKey}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className={`pointer-events-auto relative h-[46px] w-[46px] overflow-visible border-0 bg-transparent transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d8a64d] ${
        disabled ? "cursor-not-allowed opacity-65" : ""
      }`}
      style={{
        backgroundImage: `url(${skin})`,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "100% 100%",
      }}
    >
      <span className="sr-only">{label}</span>
      <AssetGlyph
        src={iconSrc}
        className="absolute left-1/2 top-1/2 h-[20px] w-[20px] -translate-x-1/2 -translate-y-1/2"
      />
      {hovered ? (
        <span className="pointer-events-none absolute right-[52px] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-[4px] border border-[rgba(170,123,43,0.48)] bg-[rgba(20,16,11,0.88)] px-2 py-1 text-[11px] font-bold text-[#f8ead0] shadow-[0_8px_18px_rgba(0,0,0,0.28)]">
          {label}
        </span>
      ) : null}
    </button>
  );
}
