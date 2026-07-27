import type {
  TravelProjectInsert,
  TravelProjectMessageInsert,
  TravelProjectMessageRow,
  TravelProjectRow,
  TravelProjectSourceInsert,
  TravelProjectSourceRow,
  TravelProjectUpdate,
  TravelProjectVersionInsert,
  TravelProjectVersionRow,
} from "../supabase/types";

const projectSelectFields =
  "id,user_id,title,lifecycle_state,current_flow_stage,current_version_id,last_activity_at,created_at,updated_at";

const versionSelectFields =
  "id,project_id,version_number,version_status,created_from,trip_plan_json,trip_request_snapshot_json,proposal_summary_json,created_by,created_at,updated_at";

const sourceSelectFields =
  "id,project_id,source_type,source_title,source_payload_json,created_at,updated_at";

const messageSelectFields = "id,project_id,role,content,created_at";

type ProjectClient = {
  from: (
    table:
      | "travel_projects"
      | "travel_project_versions"
      | "travel_project_sources"
      | "travel_project_messages",
  ) => {
    insert: (payload: unknown) => {
      select: (fields: string) => {
        single: () => Promise<{ data: unknown; error: unknown }>;
      };
    };
    select: (fields: string) => {
      eq: (column: string, value: unknown) => {
        eq: (
          chainedColumn: string,
          chainedValue: unknown,
        ) => {
          maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
        };
        maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
        order: (
          column: string,
          options?: { ascending?: boolean; nullsFirst?: boolean },
        ) => Promise<{ data: unknown; error: unknown }>;
      };
    };
    update: (payload: unknown) => {
      eq: (column: string, value: unknown) => {
        select: (fields: string) => {
          maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
        };
      };
    };
  };
};

export function createProjectRepository(client: ProjectClient) {
  return {
    async insertProject(input: TravelProjectInsert) {
      const { data, error } = await client
        .from("travel_projects")
        .insert(input)
        .select(projectSelectFields)
        .single();

      if (error || !data) {
        throw error ?? new Error("INSERT_PROJECT_FAILED");
      }

      return data as TravelProjectRow;
    },

    async getProjectById(projectId: string) {
      const { data, error } = await client
        .from("travel_projects")
        .select(projectSelectFields)
        .eq("id", projectId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return (data as TravelProjectRow | null) ?? null;
    },

    async updateProjectState(projectId: string, patch: TravelProjectUpdate) {
      const { data, error } = await client
        .from("travel_projects")
        .update(patch)
        .eq("id", projectId)
        .select(projectSelectFields)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return (data as TravelProjectRow | null) ?? null;
    },

    async insertVersion(input: TravelProjectVersionInsert) {
      const { data, error } = await client
        .from("travel_project_versions")
        .insert(input)
        .select(versionSelectFields)
        .single();

      if (error || !data) {
        throw error ?? new Error("INSERT_PROJECT_VERSION_FAILED");
      }

      return data as TravelProjectVersionRow;
    },

    async listVersions(projectId: string) {
      const table = client.from("travel_project_versions");
      const selected = table.select(versionSelectFields);
      const scoped = selected.eq("project_id", projectId);
      const { data, error } = await scoped.order("version_number", {
        ascending: false,
      });

      if (error) {
        throw error;
      }

      return (data as TravelProjectVersionRow[] | null) ?? [];
    },

    async getVersionById(projectId: string, versionId: string) {
      const { data, error } = await client
        .from("travel_project_versions")
        .select(versionSelectFields)
        .eq("project_id", projectId)
        .eq("id", versionId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return (data as TravelProjectVersionRow | null) ?? null;
    },

    async insertSource(input: TravelProjectSourceInsert) {
      const { data, error } = await client
        .from("travel_project_sources")
        .insert(input)
        .select(sourceSelectFields)
        .single();

      if (error || !data) {
        throw error ?? new Error("INSERT_PROJECT_SOURCE_FAILED");
      }

      return data as TravelProjectSourceRow;
    },

    async listSources(projectId: string) {
      const table = client.from("travel_project_sources");
      const selected = table.select(sourceSelectFields);
      const scoped = selected.eq("project_id", projectId);
      const { data, error } = await scoped.order("created_at", {
        ascending: false,
      });

      if (error) {
        throw error;
      }

      return (data as TravelProjectSourceRow[] | null) ?? [];
    },

    async insertMessage(input: TravelProjectMessageInsert) {
      const { data, error } = await client
        .from("travel_project_messages")
        .insert(input)
        .select(messageSelectFields)
        .single();

      if (error || !data) {
        throw error ?? new Error("INSERT_PROJECT_MESSAGE_FAILED");
      }

      return data as TravelProjectMessageRow;
    },

    async listMessages(projectId: string, options?: { limit?: number }) {
      const table = client.from("travel_project_messages");
      const selected = table.select(messageSelectFields);
      const scoped = selected.eq("project_id", projectId);
      const { data, error } = await scoped.order("created_at", {
        ascending: true,
      });

      if (error) {
        throw error;
      }

      const rows = ((data as TravelProjectMessageRow[] | null) ?? []).slice(
        0,
        options?.limit,
      );

      return rows;
    },
  };
}
