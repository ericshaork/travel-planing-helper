import { MapFallback } from "./MapFallback";

interface MapLoadingProps {
  className?: string;
}

export function MapLoading({ className }: MapLoadingProps) {
  return (
    <MapFallback
      className={className}
      title="地图加载中"
      description="先把地图底板接上。没出来之前，你还是可以先看右侧其他路线信息。"
    />
  );
}
