import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { createEvidencePackService } from "@/src/server/data-hub/evidencePackService";
import { stripUnsafeProductData } from "@/src/server/data-hub/productDataHubService";

const placeInputSchema = z.object({
  placeId: z.string().trim().min(1).optional(),
  provider: z.string().trim().min(1).max(80).optional(),
  externalId: z.string().trim().min(1).max(200).optional(),
  name: z.string().trim().min(1).max(160).optional(),
});

const bodySchema = z.object({
  destination: z.string().trim().max(120).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  selectedPlaces: z.array(placeInputSchema).max(20).optional(),
  candidatePlaces: z.array(placeInputSchema).max(50).optional(),
  travelDates: z.object({
    startDate: z.string().trim().max(40).nullable().optional(),
    endDate: z.string().trim().max(40).nullable().optional(),
  }).nullable().optional(),
  userPreferences: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
});

export function createEvidencePackPostHandler(serviceFactory = createEvidencePackService) {
  return async function POST(request: Request) {
    try {
      const body = bodySchema.parse(await request.json());
      const evidencePack = await serviceFactory().buildEvidencePack(body);
      const hasMissingPlaces = evidencePack.missingFields.some((field) => field.reason === "unresolved_place");
      return NextResponse.json(stripUnsafeProductData({
        ok: true,
        evidencePack,
        missingFields: evidencePack.missingFields,
        sources: evidencePack.sourceList,
        error: hasMissingPlaces
          ? { code: "missing_facts", message: "部分地点暂时没有匹配到 Data Hub normalized 证据。" }
          : undefined,
      }));
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof ZodError) {
        return NextResponse.json({ ok: false, error: { code: "INVALID_INPUT", message: "证据包参数不完整。" } }, { status: 400 });
      }
      return NextResponse.json({ ok: false, error: { code: "database_error", message: "Data Hub 证据包暂时不可用。" } }, { status: 500 });
    }
  };
}

export const POST = createEvidencePackPostHandler();
