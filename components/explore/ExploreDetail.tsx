"use client";

import { ArchiveViewer } from "./ArchiveViewer";

interface ExploreDetailProps {
  id: string;
}

export function ExploreDetail({ id }: ExploreDetailProps) {
  return <ArchiveViewer id={id} mode="page" />;
}
