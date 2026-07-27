import type {
  TravelProjectRow,
  TravelProjectSourceRow,
  TravelProjectUpdate,
  TravelProjectVersionRow,
} from "../../supabase/types";

const projectSelectFields =
  "id,user_id,title,lifecycle_state,current_flow_stage,current_version_id,last_activity_at,created_at,updated_at";
const versionSelectFields =
  "id,project_id,version_number,version_status,created_from,trip_plan_json,trip_request_snapshot_json,proposal_summary_json,created_by,created_at,updated_at";
const sourceSelectFields =
  "id,project_id,source_type,source_title,source_payload_json,created_at,updated_at";

type ProjectTripsClient = {
  from: (
    table: "travel_projects" | "travel_project_versions" | "travel_project_sources",
  ) => {
    select: (fields: string) => unknown;
  };
};

export function createProjectTripsRepository(client: ProjectTripsClient) {
  return {
    async listProjectsByUser(userId: string) {
      const builder = client
        .from("travel_projects")
        .select(projectSelectFields) as {
          eq: (
            column: string,
            value: unknown,
          ) => {
            order: (
              column: string,
              options?: { ascending?: boolean; nullsFirst?: boolean },
            ) => Promise<{ data: unknown; error: unknown }>;
          };
        };
      const { data, error } = await builder.eq("user_id", userId).order(
        "last_activity_at",
        {
          ascending: false,
          nullsFirst: false,
        },
      );

      if (error) {
        throw error;
      }

      return (data as TravelProjectRow[] | null) ?? [];
    },

    async getCurrentVersion(projectId: string, versionId: string) {
      const selected = client
        .from("travel_project_versions")
        .select(versionSelectFields) as {
          eq: (
            column: string,
            value: unknown,
          ) => {
            eq: (
              column: string,
              value: unknown,
            ) => {
              maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
            };
          };
        };
      const { data, error } = await selected
        .eq("project_id", projectId)
        .eq("id", versionId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return (data as TravelProjectVersionRow | null) ?? null;
    },

    async listSources(projectId: string) {
      const builder = client
        .from("travel_project_sources")
        .select(sourceSelectFields) as {
          eq: (
            column: string,
            value: unknown,
          ) => {
            order: (
              column: string,
              options?: { ascending?: boolean; nullsFirst?: boolean },
            ) => Promise<{ data: unknown; error: unknown }>;
          };
        };
      const { data, error } = await builder.eq("project_id", projectId).order(
        "created_at",
        {
          ascending: false,
        },
      );

      if (error) {
        throw error;
      }

      return (data as TravelProjectSourceRow[] | null) ?? [];
    },

    async updateProject(projectId: string, patch: TravelProjectUpdate) {
      const builder = client.from("travel_projects") as unknown as {
        update: (payload: TravelProjectUpdate) => {
          eq: (column: string, value: unknown) => {
            select: (fields: string) => {
              maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
            };
          };
        };
      };
      const { data, error } = await builder
        .update(patch)
        .eq("id", projectId)
        .select(projectSelectFields)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return (data as TravelProjectRow | null) ?? null;
    },
  };
}
