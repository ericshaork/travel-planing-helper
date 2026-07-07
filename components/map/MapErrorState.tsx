import type { AmapLoadErrorCode } from "../../lib/map/amap-types";

import { getMapErrorCopy } from "./map-utils";
import { MapFallback } from "./MapFallback";

interface MapErrorStateProps {
  code: AmapLoadErrorCode;
  className?: string;
  title?: string;
  description?: string;
}

export function MapErrorState({
  code,
  className,
  title,
  description,
}: MapErrorStateProps) {
  const copy = getMapErrorCopy(code);

  return (
    <MapFallback
      className={className}
      title={title ?? copy.title}
      description={description ?? copy.description}
    />
  );
}
