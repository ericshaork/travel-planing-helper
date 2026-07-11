"use client";

import type { ExploreTripListFilters } from "@/lib/explore/types";

import { ExploreFeed } from "./ExploreFeed";

interface ExploreGridProps {
  filters?: ExploreTripListFilters;
}

export function ExploreGrid({ filters = {} }: ExploreGridProps) {
  return <ExploreFeed filters={filters} />;
}
