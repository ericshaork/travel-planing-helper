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

interface DevelopmentProjectStore {
  projects: Map<string, TravelProjectRow>;
  versions: Map<string, TravelProjectVersionRow[]>;
  sources: Map<string, TravelProjectSourceRow[]>;
  messages: Map<string, TravelProjectMessageRow[]>;
}

const globalStore = globalThis as typeof globalThis & {
  __wanderlyDevelopmentProjectStore?: DevelopmentProjectStore;
};

function getDevelopmentProjectStore(): DevelopmentProjectStore {
  if (!globalStore.__wanderlyDevelopmentProjectStore) {
    globalStore.__wanderlyDevelopmentProjectStore = {
      projects: new Map(),
      versions: new Map(),
      sources: new Map(),
      messages: new Map(),
    };
  }

  return globalStore.__wanderlyDevelopmentProjectStore;
}

function cloneRow<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso() {
  return new Date().toISOString();
}

export function createDevelopmentProjectRepository() {
  const store = getDevelopmentProjectStore();

  return {
    async insertProject(input: TravelProjectInsert) {
      const timestamp = nowIso();
      const row: TravelProjectRow = {
        id: crypto.randomUUID(),
        user_id: input.user_id,
        title: input.title,
        lifecycle_state: input.lifecycle_state ?? "new",
        current_flow_stage: input.current_flow_stage ?? null,
        current_version_id: input.current_version_id ?? null,
        last_activity_at: input.last_activity_at ?? timestamp,
        created_at: timestamp,
        updated_at: timestamp,
      };

      store.projects.set(row.id, row);
      return cloneRow(row);
    },

    async getProjectById(projectId: string) {
      return cloneRow(store.projects.get(projectId) ?? null);
    },

    async updateProjectState(projectId: string, patch: TravelProjectUpdate) {
      const current = store.projects.get(projectId);

      if (!current) {
        return null;
      }

      const next: TravelProjectRow = {
        ...current,
        ...patch,
        updated_at: nowIso(),
      };
      store.projects.set(projectId, next);
      return cloneRow(next);
    },

    async insertVersion(input: TravelProjectVersionInsert) {
      const timestamp = nowIso();
      const row: TravelProjectVersionRow = {
        id: crypto.randomUUID(),
        project_id: input.project_id,
        version_number: input.version_number,
        version_status: input.version_status ?? "accepted",
        created_from: input.created_from ?? null,
        trip_plan_json: cloneRow(input.trip_plan_json),
        trip_request_snapshot_json: cloneRow(
          input.trip_request_snapshot_json ?? null,
        ),
        proposal_summary_json: cloneRow(input.proposal_summary_json ?? null),
        created_by: input.created_by ?? null,
        created_at: timestamp,
        updated_at: timestamp,
      };
      const versions = store.versions.get(input.project_id) ?? [];
      versions.push(row);
      store.versions.set(input.project_id, versions);
      return cloneRow(row);
    },

    async listVersions(projectId: string) {
      const versions = [...(store.versions.get(projectId) ?? [])].sort(
        (left, right) => right.version_number - left.version_number,
      );
      return cloneRow(versions);
    },

    async getVersionById(projectId: string, versionId: string) {
      const version =
        (store.versions.get(projectId) ?? []).find((item) => item.id === versionId) ??
        null;
      return cloneRow(version);
    },

    async insertSource(input: TravelProjectSourceInsert) {
      const timestamp = nowIso();
      const row: TravelProjectSourceRow = {
        id: crypto.randomUUID(),
        project_id: input.project_id,
        source_type: input.source_type,
        source_title: input.source_title ?? null,
        source_payload_json: cloneRow(input.source_payload_json ?? {}),
        created_at: timestamp,
        updated_at: timestamp,
      };
      const sources = store.sources.get(input.project_id) ?? [];
      sources.push(row);
      store.sources.set(input.project_id, sources);
      return cloneRow(row);
    },

    async listSources(projectId: string) {
      const sources = [...(store.sources.get(projectId) ?? [])].sort((left, right) =>
        right.created_at.localeCompare(left.created_at),
      );
      return cloneRow(sources);
    },

    async insertMessage(input: TravelProjectMessageInsert) {
      const row: TravelProjectMessageRow = {
        id: crypto.randomUUID(),
        project_id: input.project_id,
        role: input.role,
        content: input.content,
        created_at: nowIso(),
      };
      const messages = store.messages.get(input.project_id) ?? [];
      messages.push(row);
      store.messages.set(input.project_id, messages);
      return cloneRow(row);
    },

    async listMessages(projectId: string, options?: { limit?: number }) {
      const messages = [...(store.messages.get(projectId) ?? [])].sort((left, right) =>
        left.created_at.localeCompare(right.created_at),
      );
      return cloneRow(messages.slice(0, options?.limit));
    },
  };
}
