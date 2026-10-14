export type AdminRegionLevel =
  | "country"
  | "province"
  | "prefecture"
  | "county";

export interface AdminRegion {
  id: string;
  adcode: string;
  name: string;
  level: AdminRegionLevel;
  admin_type: string | null;
  parent_adcode: string | null;
  province_adcode: string | null;
  prefecture_adcode: string | null;
  center_lng: number | null;
  center_lat: number | null;
  label_lng: number | null;
  label_lat: number | null;
  boundary: unknown | null;
  bbox_min_lng: number | null;
  bbox_min_lat: number | null;
  bbox_max_lng: number | null;
  bbox_max_lat: number | null;
  source: string | null;
  source_id: string | null;
  source_updated_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type AdminRegionInsert = Omit<
  AdminRegion,
  "id" | "created_at" | "updated_at"
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type AdminRegionUpdate = Partial<
  Omit<AdminRegion, "id" | "adcode" | "created_at">
>;
