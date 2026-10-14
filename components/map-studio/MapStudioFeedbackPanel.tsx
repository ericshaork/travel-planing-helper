export type MapStudioFeedbackKey =
  | "budget"
  | "version"
  | "import"
  | "ai"
  | "saved"
  | "hotel"
  | "measure"
  | "box-select"
  | "help";

interface MapStudioFeedbackPanelProps {
  activeKey: MapStudioFeedbackKey | null;
  onClose: () => void;
}

const feedbackCopy: Record<
  MapStudioFeedbackKey,
  {
    label: string;
    title: string;
    message: string;
    badge: string;
  }
> = {
  budget: {
    label: "BUDGET",
    title: "预算字段",
    message: "预算面板会在后续接入分项编辑。",
    badge: "Phase 2",
  },
  version: {
    label: "VERSION",
    title: "v2.0 Phase",
    message: "当前为 Map Studio Phase 1 操作台。",
    badge: "v2.0",
  },
  import: {
    label: "IMPORT",
    title: "路径导入",
    message: "路径导入将在 Phase 2 启用。",
    badge: "Phase 2",
  },
  ai: {
    label: "AI",
    title: "AI 建议",
    message: "AI 地图建议将在后续版本启用。",
    badge: "v2.3",
  },
  saved: {
    label: "SAVED",
    title: "收藏地点",
    message: "收藏清单暂时为空，后续接入账号收藏。",
    badge: "Phase 2",
  },
  hotel: {
    label: "HOTEL",
    title: "住宿图层",
    message: "住宿区域会在 Phase 2 接入。",
    badge: "Phase 2",
  },
  measure: {
    label: "MEASURE",
    title: "测距工具",
    message: "测距工具待启用。",
    badge: "Phase 2",
  },
  "box-select": {
    label: "BOX",
    title: "框选工具",
    message: "框选地点会在后续版本启用。",
    badge: "Phase 2",
  },
  help: {
    label: "HELP",
    title: "快捷帮助",
    message: "先用右侧图层/筛选和底部写入完成探索。",
    badge: "Phase 1",
  },
};

export function MapStudioFeedbackPanel({
  activeKey,
  onClose,
}: MapStudioFeedbackPanelProps) {
  if (!activeKey) {
    return null;
  }

  const copy = feedbackCopy[activeKey];

  return (
    <section
      aria-label="Map Studio 功能反馈"
      className="absolute right-20 top-28 z-30 w-64 rounded-[8px] border border-[#8a6428] bg-[linear-gradient(180deg,rgba(22,29,29,0.96),rgba(5,7,7,0.94))] p-3 text-[rgba(255,250,235,0.86)] shadow-[inset_0_1px_0_rgba(255,224,147,0.2),inset_0_-14px_28px_rgba(0,0,0,0.42),0_12px_30px_rgba(0,0,0,0.4)] backdrop-blur-[3px]"
    >
      <div className="flex items-start justify-between gap-3 border-b border-[rgba(255,224,147,0.16)] pb-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[rgba(255,224,147,0.52)]">
            {copy.label}
          </p>
          <h2 className="mt-0.5 text-sm font-black text-[#fff3d2]">
            {copy.title}
          </h2>
        </div>
        <button
          type="button"
          aria-label="关闭功能反馈"
          onClick={onClose}
          className="h-7 w-7 rounded-[4px] border border-[rgba(255,224,147,0.22)] bg-[rgba(0,0,0,0.28)] text-xs font-black text-[rgba(255,250,235,0.72)] hover:border-[#d2a044] hover:text-[#fff7df]"
        >
          X
        </button>
      </div>
      <p className="mt-3 text-xs font-semibold leading-5 text-[rgba(255,250,235,0.72)]">
        {copy.message}
      </p>
      <span className="mt-3 inline-flex rounded-[4px] border border-[rgba(224,180,82,0.34)] bg-[rgba(224,180,82,0.1)] px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#e0b452]">
        {copy.badge}
      </span>
    </section>
  );
}
