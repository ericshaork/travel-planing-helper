import { NextResponse } from "next/server";

import {
  createProductionJob,
  listProductionJobs,
} from "@/lib/admin/explore-production/store";
import type { ExploreProductionRequest } from "@/lib/admin/explore-production/types";

export const runtime = "nodejs";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => asString(item)).filter(Boolean)
    : [];
}

function parseRequestPayload(value: unknown): ExploreProductionRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("请求体必须是对象。");
  }

  const record = value as Record<string, unknown>;
  const city = asString(record.city);
  const days = Number(record.days);
  const travelerType = asString(record.travelerType);
  const budget = asString(record.budget);
  const pace = asString(record.pace);
  const season = asString(record.season) || "autumn";
  const theme = asString(record.theme);
  const motivation = asString(record.motivation) || theme || "首次到访";
  const preferences = asStringArray(record.preferences);

  if (!city) throw new Error("城市不能为空。");
  if (!Number.isInteger(days) || days < 1 || days > 14) {
    throw new Error("天数必须是 1-14 的整数。");
  }
  if (!["family", "couple", "student", "solo"].includes(travelerType)) {
    throw new Error("人群类型无效。");
  }
  if (!["low", "medium", "high"].includes(budget)) {
    throw new Error("预算级别无效。");
  }
  if (!["slow", "balanced", "dense"].includes(pace)) {
    throw new Error("节奏无效。");
  }
  if (!theme) throw new Error("主题不能为空。");

  return {
    city,
    days,
    travelerType: travelerType as ExploreProductionRequest["travelerType"],
    budget: budget as ExploreProductionRequest["budget"],
    pace: pace as ExploreProductionRequest["pace"],
    season,
    theme,
    motivation,
    preferences: preferences.length > 0 ? preferences : ["citywalk"],
    extraRequirement: asString(record.extraRequirement) || undefined,
  };
}

export async function GET() {
  const jobs = await listProductionJobs();

  return NextResponse.json({
    ok: true,
    jobs,
  });
}

export async function POST(request: Request) {
  try {
    const payload = parseRequestPayload(await request.json());
    const job = await createProductionJob(payload);

    return NextResponse.json({
      ok: true,
      job,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    );
  }
}

