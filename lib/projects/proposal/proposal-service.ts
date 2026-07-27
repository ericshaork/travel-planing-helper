import { normalizeTripRequestDraft } from "../../trip/normalize";
import type { UserSettings } from "../../settings/types";
import { simpleParseTripText } from "../../trip/simpleParser";
import type { TripRequestDraft } from "../../trip/types";
import { AppError } from "../../utils/errors";
import type { FlowService } from "../flow/flow-service";
import type { ProjectService } from "../service";
import type { TravelProjectMessage, TravelProjectSource, TravelProjectVersion } from "../types";
import { planTrip } from "../../trip/planner";
import { applyInterviewDefaults } from "./interview-defaults";
import type {
  ProposalBuildResult,
  ProposalGenerationResult,
  TravelProposal,
} from "./proposal-types";

type TripPlanner = typeof planTrip;

interface ProposalServiceDependencies {
  planner?: TripPlanner;
  resolveUserSettings?: () => Promise<UserSettings | null>;
}

export interface ProposalService {
  createProposal(projectId: string): Promise<ProposalBuildResult>;
  markProposalAdjusting(projectId: string): Promise<void>;
  generateFromProposal(projectId: string): Promise<ProposalGenerationResult>;
}

function mergeUnique(values: Array<string | undefined | null>) {
  return [
    ...new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter((value) => value.length > 0),
    ),
  ];
}

function mergeDraft(base: TripRequestDraft, patch: TripRequestDraft): TripRequestDraft {
  return {
    ...base,
    ...patch,
    interests: mergeUnique([...(base.interests ?? []), ...(patch.interests ?? [])]),
    travelStyles: mergeUnique([
      ...(base.travelStyles ?? []),
      ...(patch.travelStyles ?? []),
    ]),
    mustVisitPlaces: mergeUnique([
      ...(base.mustVisitPlaces ?? []),
      ...(patch.mustVisitPlaces ?? []),
    ]),
    avoidPlaces: mergeUnique([...(base.avoidPlaces ?? []), ...(patch.avoidPlaces ?? [])]),
  };
}

function parseEnglishTripHints(message: string): TripRequestDraft {
  const next: TripRequestDraft = {};
  const destinationMatch =
    /(?:go to|visit|travel to)\s+([A-Za-z][A-Za-z\s]{1,40}?)(?=\s+for\b|[,.!?]|$)/i.exec(
      message,
    );
  const daysMatch = /(\d{1,2})\s*days?/i.exec(message);
  const budgetMatch =
    /(?:budget(?:\s+is|\s+around)?|under)\s*[A-Za-z$¥]*\s*(\d{2,6})/i.exec(message);

  if (destinationMatch?.[1]) {
    next.destinationCity = destinationMatch[1].trim().replace(/\s+/g, " ");
  }

  if (daysMatch?.[1]) {
    next.days = Number(daysMatch[1]);
  }

  if (budgetMatch?.[1]) {
    next.budget = Number(budgetMatch[1]);
  }

  const lower = message.toLowerCase();

  if (lower.includes("food")) {
    next.interests = mergeUnique([...(next.interests ?? []), "food"]);
  }

  if (lower.includes("culture")) {
    next.interests = mergeUnique([...(next.interests ?? []), "culture"]);
  }

  if (lower.includes("relaxed") || lower.includes("slow")) {
    next.travelStyles = mergeUnique([...(next.travelStyles ?? []), "relaxed"]);
  }

  if (lower.includes("balanced")) {
    next.travelStyles = mergeUnique([...(next.travelStyles ?? []), "balanced"]);
  }

  return next;
}

function buildDraftFromSource(source: TravelProjectSource): TripRequestDraft {
  const payload = source.payload ?? {};
  const parseResult = payload.parseResult as
    | {
        parsed?: TripRequestDraft;
      }
    | undefined;
  const rawInput =
    typeof payload.parseText === "string"
      ? payload.parseText
      : typeof payload.rawInput === "string"
        ? payload.rawInput
        : "";

  let draft = parseResult?.parsed ?? {};

  if (rawInput) {
    draft = mergeDraft(draft, simpleParseTripText(rawInput));
    draft = mergeDraft(draft, parseEnglishTripHints(rawInput));
  }

  if (Array.isArray(payload.selectedInterests)) {
    draft = mergeDraft(draft, {
      interests: payload.selectedInterests.filter(
        (value): value is string => typeof value === "string" && value.trim().length > 0,
      ),
    });
  }

  if (Array.isArray(payload.selectedTravelStyles)) {
    draft = mergeDraft(draft, {
      travelStyles: payload.selectedTravelStyles.filter(
        (value): value is string => typeof value === "string" && value.trim().length > 0,
      ),
    });
  }

  return draft;
}

function buildDraftFromMessages(messages: TravelProjectMessage[]) {
  return messages
    .filter((message) => message.role === "user")
    .reduce<TripRequestDraft>((draft, message) => {
      let next = mergeDraft(draft, simpleParseTripText(message.content));
      next = mergeDraft(next, parseEnglishTripHints(message.content));
      return next;
    }, {});
}

function buildProposalFromDraft(draft: TripRequestDraft): TravelProposal {
  return {
    destination: draft.destinationCity?.trim() || "Pending destination",
    duration: {
      ...(typeof draft.days === "number" ? { days: draft.days } : {}),
      ...(draft.startDate ? { startDate: draft.startDate } : {}),
      ...(draft.endDate ? { endDate: draft.endDate } : {}),
    },
    preferences: mergeUnique([
      ...(draft.interests ?? []),
      ...(draft.travelStyles ?? []),
      draft.schedulePreference,
      draft.accommodationPreference,
      draft.localTransportPreference,
    ]),
    highlights: mergeUnique([...(draft.mustVisitPlaces ?? []), draft.destinationCity]),
    notes: mergeUnique([draft.specialRequirements, draft.schedulePreference]),
  };
}

function buildProposalSeedPlan(proposal: TravelProposal) {
  const days = proposal.duration.days && proposal.duration.days > 0 ? proposal.duration.days : 1;

  return {
    tripTitle: `${proposal.destination} proposal`,
    summary: `Proposal draft for ${proposal.destination}.`,
    destination: proposal.destination,
    days,
    travelStyleSummary:
      proposal.preferences.length > 0
        ? `Proposal focus: ${proposal.preferences.join(", ")}.`
        : "Proposal draft is still collecting preferences.",
    weatherSummary: {
      available: false,
      overview: "Weather will be added after full generation.",
      dailyForecast: [],
      alerts: [],
      reminders: [],
      dataNote: "Proposal stage does not include live weather.",
    },
    budgetSummary: {
      totalEstimate: "Pending",
      transport: "Pending",
      hotel: "Pending",
      food: "Pending",
      tickets: "Pending",
      localTransport: "Pending",
      flexibleSpending: "Pending",
      note: "Proposal stage only stores planning direction.",
    },
    hotelAreaAdvice: [],
    transportAdvice: {
      summary: "Transport details will be created after generation.",
      options: [
        {
          mode: "other" as const,
          pros: ["Keeps proposal lightweight."],
          cons: ["No final route yet."],
          recommendation: "Confirm the proposal and generate the full trip.",
        },
      ],
      suggestedPlatforms: [],
      note: "Proposal draft only.",
    },
    dailyItinerary: Array.from({ length: days }, (_, index) => ({
      day: index + 1,
      theme: `Day ${index + 1} proposal`,
      routeOrder:
        proposal.highlights.length > 0 ? proposal.highlights.slice(0, 3) : ["Pending highlight"],
      routeReason: "This is a proposal placeholder before full generation.",
      morning: [],
      afternoon: [],
      evening: [],
      dailyTips:
        proposal.notes.length > 0
          ? proposal.notes.slice(0, 2)
          : ["Continue adjusting or generate the full trip."],
    })),
    generalTips: ["Proposal snapshot only. Generate the full trip for Workspace."],
    warnings: [],
  };
}

function resolveVersionReason(
  currentVersion: TravelProjectVersion | null,
): "ai_generate" | "ai_adjust" {
  return currentVersion ? "ai_adjust" : "ai_generate";
}

async function loadProposalInputs(projectService: ProjectService, projectId: string) {
  const detail = await projectService.getProject(projectId);

  if (!detail) {
    throw new AppError("UNKNOWN_ERROR", `Travel project not found: ${projectId}`);
  }

  const messages = await projectService.listProjectMessages(projectId, {
    limit: 50,
  });
  const sourceDraft = detail.sources.reduce<TripRequestDraft>(
    (draft, source) => mergeDraft(draft, buildDraftFromSource(source)),
    {},
  );
  const messageDraft = buildDraftFromMessages(messages);
  const mergedDraft = mergeDraft(sourceDraft, messageDraft);

  return {
    detail,
    mergedDraft,
    proposal: buildProposalFromDraft(mergedDraft),
  };
}

export function createProposalService(
  projectService: ProjectService,
  flowService: FlowService,
  dependencies: ProposalServiceDependencies = {},
): ProposalService {
  const planner = dependencies.planner ?? planTrip;
  const resolveUserSettings =
    dependencies.resolveUserSettings ?? (async () => null);

  return {
    async createProposal(projectId) {
      const { detail, mergedDraft, proposal } = await loadProposalInputs(
        projectService,
        projectId,
      );

      await projectService.createProjectVersion(projectId, {
        versionStatus: "proposed",
        createdFrom: resolveVersionReason(detail.currentVersion),
        tripPlan: buildProposalSeedPlan(proposal),
        tripRequestSnapshot: null,
        proposalSummary: proposal as unknown as Record<string, unknown>,
        createdBy: "assistant",
        setAsCurrent: false,
      });

      return {
        proposal,
        tripRequestDraft: mergedDraft,
      };
    },

    async markProposalAdjusting(projectId) {
      await flowService.moveFlowStage(projectId, "proposal_adjusting");
    },

    async generateFromProposal(projectId) {
      const { detail, mergedDraft, proposal } = await loadProposalInputs(
        projectService,
        projectId,
      );
      const { draft: filledDraft } = applyInterviewDefaults(mergedDraft);
      const normalized = normalizeTripRequestDraft(filledDraft);

      if (!normalized.success) {
        throw new AppError(
          "INVALID_INPUT",
          "The proposal is not complete enough to generate a full plan yet.",
          {
            missingFields: normalized.missingFields,
            issues: normalized.issues,
          },
        );
      }

      await flowService.moveFlowStage(projectId, "generating");

      const result = await planner(
        {
          tripRequest: normalized.tripRequest,
        },
        {
          userSettings: await resolveUserSettings(),
        },
      );
      const versionReason = resolveVersionReason(detail.currentVersion);
      const version = await projectService.createProjectVersion(projectId, {
        versionStatus: "accepted",
        createdFrom: versionReason,
        tripPlan: result.tripPlan,
        tripRequestSnapshot: normalized.tripRequest,
        proposalSummary: proposal as unknown as Record<string, unknown>,
        createdBy: "assistant",
        setAsCurrent: true,
      });

      await projectService.updateProjectState(projectId, {
        lifecycleState: "workspace",
        currentFlowStage: "workspace_ready",
        touchActivity: true,
      });

      return {
        proposal,
        tripRequest: normalized.tripRequest,
        tripPlan: result.tripPlan,
        versionReason,
        versionId: version.id,
      };
    },
  };
}
