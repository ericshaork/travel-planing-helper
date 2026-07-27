import type { GenerationContext } from "../context/types.js";
import type { ExplorePlan } from "../types.js";

const genericPhrases = ["值得一去", "感受当地文化", "不容错过", "打卡", "随便逛逛"];
const burdenSofteningPhrases = ["轻松步行", "随意步行", "顺路走到", "低负担", "很近"];
const weakFoodReasons = ["解决吃饭", "附近用餐", "简单吃点"];

export function validatePlanQuality(input: {
  plan: ExplorePlan;
  generationContext: GenerationContext;
}): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const { plan, generationContext } = input;
  const errors: string[] = [];
  const warnings: string[] = [];
  const text = JSON.stringify(plan);
  const travelerType = generationContext.request_context.traveler_type;

  const genericMatches = genericPhrases.filter((phrase) => text.includes(phrase));
  if (genericMatches.length >= 2) {
    warnings.push(`generic phrasing detected: ${genericMatches.join(", ")}`);
  }

  const burdenLevels = new Set(
    generationContext.map_context.transfer_burden
      .map((item) => item.burden_level)
      .filter((level) =>
        ["long_walk", "moderate_burden", "high_burden", "not_recommended_walk"].includes(level),
      ),
  );
  if (burdenLevels.size > 0) {
    for (const phrase of burdenSofteningPhrases) {
      if (text.includes(phrase)) {
        errors.push(`map burden ignored: route marked ${Array.from(burdenLevels).join(",")} but plan says ${phrase}`);
      }
    }
  }

  if (travelerType === "couple") {
    requireAny(text, ["故宫", "地标"], "couple plan missing landmark anchor signal", errors);
    requireAny(text, ["黄昏"], "couple plan missing dusk signal", errors);
    requireAny(text, ["晚餐"], "couple plan missing dinner signal", errors);
    forbidAny(text, ["轻松步行到什刹海", "随意步行到什刹海"], errors);
  }

  if (travelerType === "student") {
    requireAny(text, ["牛街", "南城"], "student plan missing south-city food anchor", errors);
    requireAny(text, ["早餐"], "student plan missing breakfast anchor", errors);
    requireAny(text, ["涮肉", "暖胃"], "student plan missing warm main meal signal", errors);
    requireAny(text, ["低预算", "高性价比"], "student plan missing budget-value signal", errors);
    forbidAny(text, ["高价精致餐厅", "奢华餐厅", "情侣晚餐", "一个人的随时停顿"], errors);
  }

  if (travelerType === "solo") {
    requireAny(text, ["慢行", "街区"], "solo plan missing slow-walk or district texture signal", errors);
    requireAny(text, ["咖啡", "书店", "看展"], "solo plan missing pause-place signal", errors);
    requireAny(text, ["自由停顿"], "solo plan missing free-pause signal", errors);
    forbidAny(text, ["情侣晚间收尾", "浪漫晚餐", "两人", "约会感"], errors);
  }

  let hasStudentBudgetFoodReason = false;
  let hasCoupleAtmosphereFoodReason = false;
  let hasSoloPauseFoodReason = false;

  for (const food of plan.food) {
    if (food.reason.length < 12) {
      warnings.push(`food reason too short: ${food.id}`);
    }

    if (weakFoodReasons.some((phrase) => food.reason.includes(phrase))) {
      warnings.push(`weak food reason: ${food.id}`);
    }

    if (containsAny(food.reason, ["低预算", "高性价比", "便宜", "预算友好"])) {
      hasStudentBudgetFoodReason = true;
    }

    if (containsAny(food.reason, ["收尾", "氛围", "记忆", "慢聊"])) {
      hasCoupleAtmosphereFoodReason = true;
    }

    if (containsAny(food.reason, ["停顿", "自由", "观察", "发呆"])) {
      hasSoloPauseFoodReason = true;
    }
  }

  if (travelerType === "student" && !hasStudentBudgetFoodReason) {
    errors.push("student food reasons missing budget-value language");
  }

  if (travelerType === "couple" && !hasCoupleAtmosphereFoodReason) {
    warnings.push("couple food reasons missing atmosphere or closing language");
  }

  if (travelerType === "solo" && !hasSoloPauseFoodReason) {
    warnings.push("solo food reasons missing pause or observation language");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function containsAny(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => text.includes(phrase));
}

function requireAny(text: string, phrases: string[], message: string, errors: string[]): void {
  if (!containsAny(text, phrases)) {
    errors.push(message);
  }
}

function forbidAny(text: string, phrases: string[], errors: string[]): void {
  for (const phrase of phrases) {
    if (text.includes(phrase)) {
      errors.push(`forbidden phrase found: ${phrase}`);
    }
  }
}
