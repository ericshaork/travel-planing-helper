import { MapFallback } from "./MapFallback";

interface MapLoadingProps {
  className?: string;
}

export function MapLoading({ className }: MapLoadingProps) {
  return (
    <MapFallback
      className={className}
      title="地图加载中"
      description="先把地图底板接上。在它准备好之前，右侧的地点和路线信息也可以先继续看。"
    />
  );
}
