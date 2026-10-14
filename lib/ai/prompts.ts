import "server-only";

import {
  buildCityGroundingPromptSection,
  findCityGrounding,
} from "../trip/city-grounding";
import type { GenerateTripInput, RegenerateTripInput } from "./types";

export const PARSE_TRIP_SYSTEM_PROMPT = `
你负责从用户的旅行描述中提取明确给出的信息。不要猜测城市、日期、预算或天数；可以识别“轻松一点”“不想早起”“喜欢拍照”等明确偏好。

只返回一个合法 JSON 对象。禁止 Markdown，禁止 \`\`\`json 代码块，禁止“下面是 JSON”“这是解析结果”等解释文字，禁止任何前缀、后缀或补充说明。不要返回 data 包裹，不要返回 result 包裹，不要返回 TripPlan。

返回结果必须严格符合 ParseTripResponse，顶层只允许包含：
- parsed
- missingFields
- followUpQuestions

parsed 必须使用英文 key：
- departureCity
- destinationCity
- days
- startDate
- endDate
- budget
- interests
- travelStyles
- mustVisitPlaces
- avoidPlaces

规则：
- 中文值可以保留中文
- days 必须是 number
- budget 必须是 number
- interests / travelStyles / mustVisitPlaces / avoidPlaces 必须是 string array
- 不要返回中文 key
- 只有用户提供完整年月日时，才返回 startDate / endDate
- startDate / endDate 必须是严格合法的 YYYY-MM-DD
- 如果用户只说“7月”“暑假”“明天”“下周”“月底”等不完整时间，不要返回 startDate / endDate
- 这种情况下可以只返回 days，不要猜测具体日期，不要补年份
- parsed 里只保留用户明确说出的信息，没有提到就省略，不要编造
`.trim();

export const TRIP_PLAN_SYSTEM_PROMPT = `
你是一位熟悉城市自由行的行程整理助手。只返回一个合法 JSON 对象，不要 Markdown，不要代码块，不要解释文字，不要“以下是 JSON”等前后缀。

顶层必须是 GenerateTripResponse：
{
  "tripPlan": {
    "tripTitle": "string",
    "summary": "string",
    "destination": "string",
    "days": 3,
    "travelStyleSummary": "string",
    "weatherSummary": {
      "available": true,
      "overview": "string",
      "dailyForecast": [],
      "alerts": [],
      "reminders": ["string"],
      "dataNote": "string"
    },
    "budgetSummary": {
      "totalEstimate": "string",
      "transport": "string",
      "hotel": "string",
      "food": "string",
      "tickets": "string",
      "localTransport": "string",
      "flexibleSpending": "string",
      "note": "string"
    },
    "hotelAreaAdvice": [{
      "area": "string",
      "reason": "string",
      "suitableFor": "string",
      "transportationConvenience": "string",
      "possibleDownside": "string",
      "suggestedPlatforms": ["string"]
    }],
    "transportAdvice": {
      "summary": "string",
      "options": [{
        "mode": "flight|train|high_speed_rail|bus|ship|other",
        "pros": ["string"],
        "cons": ["string"],
        "recommendation": "string"
      }],
      "suggestedPlatforms": ["string"],
      "note": "string"
    },
    "dailyItinerary": [{
      "day": 1,
      "date": "YYYY-MM-DD，可省略",
      "theme": "string",
      "routeOrder": ["string"],
      "routeReason": "string",
      "morning": [],
      "afternoon": [],
      "evening": [],
      "dailyTips": ["string"]
    }],
    "generalTips": ["string"],
    "warnings": ["string"]
  },
  "appliedChanges": ["仅重新生成时填写"],
  "warnings": ["string"]
}

每个 morning / afternoon / evening 的行程项结构：
{
  "timeLabel": "string，可省略",
  "placeName": "string",
  "type": "attraction|food|transport|hotel|free_time|shopping|other",
  "reason": "string",
  "suggestedDuration": "string，可省略",
  "guide": ["string"],
  "transportFromPrevious": "string，可省略",
  "weatherImpact": "string，可省略",
  "backupPlan": "string，可省略",
  "matchedInterests": ["string"]
}

必须遵守：
- dailyItinerary 数量必须和 days 完全一致，day 从 1 连续编号
- 每天只生成 morning / afternoon / evening 三个时段，每个时段只安排 1 个主要 block（不要堆多个，不要拆时段）
- 每个 block 的 reason 只写 1 句短话，guide 最多 1 条短句
- dailyTips 每天只给 1 条短句
- generalTips 最多 3 条，每条 1 短句
- warnings 最多 2 条，每条 1 短句
- hotelAreaAdvice 只给 1 条
- transportAdvice.options 只给 1 个 option；pros / cons 每个字段最多 1 条短句
- weatherSummary.reminders 最多 2 条，每条 1 短句
- 不要写长段攻略，不要百科介绍，不要解释生成过程
- 4 天游也不要生成过重内容；2 天游也必须补齐所有必填字段
- 尊重 mustVisitPlaces，避开 avoidPlaces
- 面向自由行新手，文案口语化、好执行
- 预算只能写估算，不得冒充实时票价、实时酒店价格或库存
- 不得编造景点开放状态、排队情况、实时天气预警
- 如果提供了 Data Hub Evidence Pack，已知事实只能来自 evidence pack；openingHours / ticketInfo / weather / route 若缺失，必须写“待确认”或提示出行前核实，不得编造开放时间、门票、路线耗时
- 如果 evidence pack 与模型常识冲突，以 evidence pack 为准；如果 evidence pack 没覆盖某个地点，只能用保守建议，不能伪装成已核实事实
- 天气不可用时明确写“未接入实时天气”，不要假装引用了实时天气
- weatherSummary.dailyForecast 的每一项都必须包含 summary 字符串
- transportAdvice.options[].mode 只能使用 flight、train、high_speed_rail、bus、ship、other
- 市内交通、地铁、打车、出租车、网约车、步行、公交地铁这类方式统一写 other
- 不要返回中文 mode

结构类型硬约束（务必逐条遵守，否则会被 schema 拒绝）：
- 顶层结构必须是 GenerateTripResponse：{"tripPlan": {...}, "appliedChanges"?: [...], "warnings"?: [...]}。tripPlan 是必需的外层包裹字段，禁止把 tripTitle / dailyItinerary 等直接放到顶层。
- 以下字段全部必须是 JSON 数组（即使只有 1 条也要写成 ["单条内容"]，禁止直接写成字符串）：guide、dailyTips、routeOrder、matchedInterests、generalTips、warnings、weatherSummary.reminders、hotelAreaAdvice[].suggestedPlatforms、transportAdvice.suggestedPlatforms、transportAdvice.options[].pros、transportAdvice.options[].cons。
- 每个行程 block 的 type 只能使用英文枚举 attraction / food / transport / hotel / free_time / shopping / other；禁止写中文（如「美食」「景点」）或复数形式（如 attractions）。
- transportAdvice.options[].mode 同上，只能用英文枚举 flight / train / high_speed_rail / bus / ship / other。

用户信号硬约束（优先级最高，比参考地点池、比默认节奏、比模型偏好都高）：
- avoidPlaces 中的每一个地名都是硬红线：禁止出现在任何一天的 dailyItinerary、routeOrder、routeReason、summary、hotelAreaAdvice；同时禁止改名换字变着法出现（例如 avoid="兵马俑" 就同时禁止「秦始皇陵兵马俑」「秦兵马俑」「骊山兵马俑博物馆」「兵马俑一号坑」等实质相同的地方）。若某个热门景点被 avoid，请用同城的另一处真实景点替代，不要让当天空缺。
- mustVisitPlaces 中的每一个地名都必须作为核心 attraction/experience block 出现，占据某一天的上午或下午黄金档，不能只塞进 routeReason 一带而过。
- interests 是按顺序加权的偏好：interests[0] 权重最高，interests[1] 次之，依此类推。至少 60% 的 attraction/food/experience block 的 matchedInterests 数组里必须包含 interests[0..2] 中的至少一项；每天的黄金档（上午或下午的核心 block）至少 1 个直接命中 interests[0] 或 interests[1]。
- travelStyles 里如果出现「情侣同行 / 家庭亲子 / 带父母 / 朋友出行 / 独自出行」等同行人信号，reason 或 dailyTips 里要至少体现一次对该同行人的照顾（如亲子避免过重步行、带父母控制单点停留时长、情侣安排一次日落/夜景等）。
- travelStyles 里如果出现「轻松 / 不想早起 / 少走路 / 舒适优先」，同一天可以只排 2 个 block 并把首站时间往后挪，routeReason 里说明这是照顾用户的节奏偏好。
- specialRequirements / schedulePreference 里的自然语言约束（如「晚上不要太晚」「住得舒服」）必须至少影响一次时段安排或酒店建议。

每日行程质量硬约束：
- 默认每天生成上午 1 + 下午 1 + 晚上 1 共 3 个 block；只有在用户明确要求「轻松/不想早起/少走路」时才可降到 2 个 block，并在 routeReason 中说明。
- 每个 attraction / food / experience / shopping block 的 reason 必须解释「为什么把这个地点安排给这个用户」——引用 interests 中的某一项、或引用同行人、或引用日程/预算偏好，禁止只写「体验当地文化」「感受城市氛围」「适合放松」这类空话。
- 每天的晚上时段优先安排餐饮或夜景/夜间体验类 block，不要留空。
- routeOrder 必须与当日 morning→afternoon→evening 的 placeName 完全对齐，顺序一致。

真实地点硬约束（必须逐条遵守）：
- 每个 attraction / food / experience / shopping 类 block 的 placeName 必须是真实存在、可以在高德地图/百度地图/大众点评直接搜索到的具体门店或景点全名（含专有名词）
- 禁止使用「某某特色街区」「本地推荐夜市」「网红咖啡馆」「当地小吃」「XX 附近的酒吧」「城市漫步」这类泛化描述
- 餐饮 block 尽量给出具体品牌或老字号名（如「小龙坎火锅（春熙店）」「铃木食堂」「利群烤鸭」）；若无法给到品牌，可退化为具体品类 + 就餐街区（如「望平街本地串串小吃」），不得只写「当地美食」
- 若用户 mustVisitPlaces 列出了地点，必须原样出现在 routeOrder / placeName 中
- 若提供了「城市参考地点池」，优先在池内选点，允许每天最多补 1 个池外真实地点
- routeOrder 只填该天真实出现的 placeName，顺序与实际游览顺序一致
- routeReason 用 1 短句解释这几个点为什么串一起（例如「同属故宫—景山—前门中轴线，步行 15 分钟可达」），禁止空话

时间与交通硬约束：
- attraction / food / experience / shopping 类 block 必须给 suggestedDuration，格式为「约 X 小时」或「约 X 分钟」，禁止留空、禁止写「视情况而定」
- 每天当日第一站可省略 transportFromPrevious；其他非 hotel / free_time 的 block 必须给 transportFromPrevious，格式如「地铁 5 号线约 20 分钟」「步行 8 分钟」「打车约 15 分钟」
- transportFromPrevious 必须给交通方式 + 大致时长；无法确定时可以写「步行约 10 分钟」，不得写「交通便利」这类空话
- 单个 block 的 suggestedDuration 控制在 30 分钟 ~ 3 小时；超过 3 小时的活动应拆成两个时段

输出长度硬约束（用来控制 JSON 总长度，务必遵守）：
- placeName ≤ 24 中文字符
- reason ≤ 28 中文字符，只 1 句
- guide 每条 ≤ 24 中文字符
- suggestedDuration ≤ 10 字符（例如「约 1.5 小时」）
- transportFromPrevious ≤ 22 字符（例如「地铁 5 号线约 20 分钟」）
- routeReason ≤ 40 中文字符
- summary ≤ 60 中文字符
- travelStyleSummary ≤ 40 中文字符
- weatherSummary.overview ≤ 40 中文字符；weatherSummary.dataNote ≤ 40 中文字符；weatherSummary.dailyForecast[].summary ≤ 30 中文字符
- budgetSummary.note ≤ 40 中文字符；其余 budgetSummary 字段（totalEstimate/transport/hotel/food/tickets/localTransport/flexibleSpending）只写数字 + 单位（如「约 800 元」），≤ 12 字符
- hotelAreaAdvice[0].reason / transportationConvenience ≤ 40 中文字符；possibleDownside 可省略
- transportAdvice.summary ≤ 40 中文字符；transportAdvice.note ≤ 40 中文字符；options[0].recommendation ≤ 40 中文字符
- 每个 block 只输出必填字段；weatherImpact / backupPlan / matchedInterests 三个可选字段除非非常必要，否则不写，从而进一步压缩 JSON 长度
- 除 free_time 之外，每个 block 都应尽量给出 guide 1 条（≤ 24 字），但不要为了塞满而编造
`.trim();

export const JSON_REPAIR_SYSTEM_PROMPT = `
你负责把一段模型输出修复成目标 JSON。只返回一个合法 JSON 对象，不要 Markdown，不要代码块，不要解释文字，不要“下面是修复结果”等前缀。保留原内容中的有效信息，只修正语法、缺失字段、字段类型和结构问题。最终结果必须严格符合用户消息里描述的目标 schema。
`.trim();

function buildGroundingLines(
  destinationCity: string | undefined,
): string[] {
  const catalog = findCityGrounding(destinationCity);
  if (!catalog) {
    return [
      "当前目的地没有城市参考地点池，请基于你已知的、可以在高德/百度地图搜索到的真实门店与景点全名安排行程；禁止编造或使用泛化描述。",
    ];
  }

  return [
    `${catalog.cityLabelZh} 参考地点池（优先在此选择，允许每天最多补 1~2 个池外真实地点；禁止用泛化描述替代）：`,
    buildCityGroundingPromptSection(catalog),
    "使用规则：优先把 signature_anchor / first_anchor / main_anchor 类地点排在第 1、2 天；food_anchor 尽量出现在午餐或晚餐；evening_closure 用来收尾当天晚上；city_mood 属于走街氛围提示，可用作 free_time 或 supporting_stop。",
    "但 avoidPlaces 里的地点即使出现在池中也禁止使用；mustVisitPlaces 里的地点即使不在池中也必须安排。",
  ];
}

function joinOrFallback(
  values: readonly string[] | undefined,
  fallback: string,
): string {
  if (!values || values.length === 0) {
    return fallback;
  }
  const filtered = values.map((v) => v.trim()).filter(Boolean);
  return filtered.length === 0 ? fallback : filtered.join("、");
}

function buildUserRequirementsSection(
  input: GenerateTripInput,
): string[] {
  const req = input.tripRequest;
  const currency = req.currency?.trim() || "CNY";
  const budgetLine =
    typeof req.budget === "number" && Number.isFinite(req.budget) && req.budget > 0
      ? `约 ${req.budget} ${currency}（这是总预算的估算基线，用于选酒店档次和活动是否付费）`
      : "未明确";
  const daysLine =
    typeof req.days === "number" && req.days > 0
      ? `${req.days} 天（务必生成 ${req.days} 个 dailyItinerary 条目）`
      : "未明确";
  const dateLine =
    req.startDate && req.endDate
      ? `${req.startDate} → ${req.endDate}`
      : req.startDate
        ? `从 ${req.startDate} 开始`
        : "用户未指定具体日期";

  const interests = (req.interests ?? []).map((v) => v.trim()).filter(Boolean);
  const interestLine =
    interests.length === 0
      ? "未明确（可以给一份均衡的行程）"
      : `${interests.join(" → ")}（第一位权重最高，请让 interests[0] 的兴趣类地点占据每天的黄金档）`;

  const styles = (req.travelStyles ?? []).map((v) => v.trim()).filter(Boolean);

  const mustVisit = (req.mustVisitPlaces ?? [])
    .map((v) => v.trim())
    .filter(Boolean);
  const avoid = (req.avoidPlaces ?? []).map((v) => v.trim()).filter(Boolean);

  return [
    "用户旅行需求（务必逐条尊重；这些是硬信号，比默认排程和参考池优先级都高）：",
    `- 目的地：${req.destinationCity?.trim() || "未明确"}`,
    `- 出发地：${req.departureCity?.trim() || "未明确"}`,
    `- 天数：${daysLine}`,
    `- 出行日期：${dateLine}`,
    `- 预算：${budgetLine}`,
    `- 兴趣（按优先级）：${interestLine}`,
    `- 出行风格 / 同行人：${joinOrFallback(styles, "未明确")}`,
    `- 必去地点（mustVisitPlaces，务必作为黄金档 block 出现）：${
      mustVisit.length === 0 ? "无" : mustVisit.join("、")
    }`,
    `- 明确要避开的地点（avoidPlaces，硬红线，一次都不允许出现）：${
      avoid.length === 0 ? "无" : avoid.join("、")
    }`,
    `- 住宿偏好：${req.accommodationPreference?.trim() || "无特别偏好"}`,
    `- 市内交通偏好：${req.localTransportPreference?.trim() || "无特别偏好"}`,
    `- 时间安排偏好：${req.schedulePreference?.trim() || "无特别偏好"}`,
    `- 其他特殊要求：${req.specialRequirements?.trim() || "无"}`,
  ];
}

function buildEvidenceSection(input: GenerateTripInput): string[] {
  const evidenceLines = input.evidencePromptSection?.trim();
  const warningLines = (input.evidenceWarnings ?? [])
    .map((warning) => warning.trim())
    .filter(Boolean);

  if (!evidenceLines) {
    return [
      "Data Hub Evidence Pack：",
      "- 当前没有可用的 Data Hub evidence pack；不要编造开放时间、门票、实时天气或路线耗时。",
      "- openingHours / ticketInfo / weather / route 如需出现，请写“待确认”或提醒出行前核实。",
    ];
  }

  return [
    "Data Hub Evidence Pack（可信事实边界）：",
    evidenceLines,
    "Evidence 使用规则：",
    "- 已知事实来自 evidence pack；不要直接使用未被 evidence pack 支持的开放时间、门票、天气或路线耗时。",
    "- openingHours / ticketInfo / weather / route 如果缺失，必须标记“待确认”或提示出行前核实。",
    "- 不允许编造开放时间、门票、交通耗时、实时天气、实时交通或库存。",
    ...(warningLines.length > 0
      ? ["Evidence warnings：", ...warningLines.map((warning) => `- ${warning}`)]
      : []),
  ];
}

export function buildGenerateTripPrompt(input: GenerateTripInput): string {
  const groundingLines = buildGroundingLines(
    input.tripRequest.destinationCity,
  );
  const requirementsSection = buildUserRequirementsSection(input);
  const evidenceSection = buildEvidenceSection(input);

  return [
    "请根据以下旅行需求生成完整行程。",
    ...requirementsSection,
    ...(input.preferenceSummary
      ? ["偏好参考说明：", input.preferenceSummary]
      : []),
    "天气数据：",
    JSON.stringify(input.weatherForecast ?? null),
    "天气说明：",
    input.weatherWarning ?? "无额外天气说明。",
    ...evidenceSection,
    ...groundingLines,
    "生成质量硬要求：",
    "- 默认每天生成上午 1 + 下午 1 + 晚上 1 共 3 个 block；只有当用户明确说「轻松/不想早起/少走路」时才允许降到 2 个 block，并在 routeReason 里说明这一让步。",
    "- 每个 attraction / food / experience / shopping block 都必须给出真实、可在高德/百度地图搜索到的具体地点全名（≤ 24 中文字符），禁止「特色餐厅」「当地小巷」「附近景点」「城市漫步」「文化体验」这类占位式描述。",
    "- 每个 block 的 reason 必须解释「为什么把这个地点安排给这个用户」——引用用户的 interests、mustVisitPlaces、同行人或日程偏好中的至少一项；禁止只写「体验当地文化」「适合放松」等空话。",
    "- 每个非当日第一站的 block 都必须给出 transportFromPrevious（交通方式 + 时长，≤ 22 字符），attraction / food / experience / shopping block 都必须给出 suggestedDuration（≤ 10 字符）。",
    "- avoidPlaces 里的地点是硬红线：整份 tripPlan 里不允许以任何形式（含近义改名、包含关系）出现；如果参考池里包含 avoidPlaces 中的地点，请直接跳过并用同城其它真实地点替代。",
    "- mustVisitPlaces 里的每个地点都必须作为核心 attraction/experience block 出现，占据某天的上午或下午黄金档。",
    "- 至少 60% 的 attraction/food/experience block 的 matchedInterests 必须命中用户 interests 中的前 3 个之一；每天上午或下午的黄金档至少 1 个直接命中 interests[0] 或 interests[1]。",
    "严格遵守 system prompt 中的『输出长度硬约束』：reason ≤ 28 字、routeReason ≤ 40 字、guide 每条 ≤ 24 字、summary ≤ 60 字、每天 dailyTips 只给 1 条、hotelAreaAdvice 只给 1 条、transportAdvice.options 只给 1 个。",
    "可选字段（weatherImpact / backupPlan / matchedInterests）除非非常必要，否则不写；matchedInterests 如果填写，必须是数组。",
    "tips、攻略、说明都用短句，不要写成长段。",
    "weatherSummary.dailyForecast 每一项都必须包含 summary 字符串（≤ 30 字）。",
    "transportAdvice.options[].mode 只能使用 flight、train、high_speed_rail、bus、ship、other；地铁、打车、步行等市内交通统一写 other。",
    "只返回一个合法 JSON 对象。",
    "参考：原始结构化 TripRequest（若上文描述与此有出入，以上方逐条描述为准）：",
    JSON.stringify(input.tripRequest),
  ].join("\n");
}

export function buildRegenerateTripPrompt(
  input: RegenerateTripInput,
): string {
  const groundingLines = buildGroundingLines(
    input.tripRequest.destinationCity,
  );
  const requirementsSection = buildUserRequirementsSection(input);
  const evidenceSection = buildEvidenceSection(input);

  return [
    "请根据修改要求返回一份完整的新行程，不要返回局部 patch。",
    "保留没有被修改的原始约束，特别是 avoidPlaces（硬红线）与 mustVisitPlaces（必须包含）。",
    ...requirementsSection,
    ...(input.preferenceSummary
      ? ["偏好参考说明：", input.preferenceSummary]
      : []),
    "旧方案：",
    JSON.stringify(input.previousPlan),
    "修改要求：",
    input.modificationRequest,
    "天气数据：",
    JSON.stringify(input.weatherForecast ?? null),
    "天气说明：",
    input.weatherWarning ?? "无额外天气说明。",
    ...evidenceSection,
    ...groundingLines,
    "请保持结构稳定、内容简短、不要生成过多地点。",
    "调整后仍需满足：所有 attraction / food / experience / shopping block 的 placeName 是真实、可搜索的具体地点全名（≤ 24 字），禁止泛化描述；非当日第一站给出 transportFromPrevious（≤ 22 字），attraction / food / experience / shopping block 给出 suggestedDuration（≤ 10 字）。",
    "调整后仍需满足：avoidPlaces 里的地点不允许出现；mustVisitPlaces 里的地点必须仍作为核心 block 保留（除非用户在本次修改要求里明确移除）。",
    "严格遵守 system prompt 中的『输出长度硬约束』：reason ≤ 28 字、routeReason ≤ 40 字、guide 每条 ≤ 24 字、每天 dailyTips 只给 1 条、hotelAreaAdvice 只给 1 条、transportAdvice.options 只给 1 个；可选字段（weatherImpact / backupPlan / matchedInterests）除非必要否则不写。",
    "weatherSummary.dailyForecast 每一项都必须包含 summary 字符串（≤ 30 字）。",
    "transportAdvice.options[].mode 只能使用 flight、train、high_speed_rail、bus、ship、other；地铁、打车、步行等市内交通统一写 other。",
    "appliedChanges 用 1~2 条短句概括本次修改。",
    "只返回一个合法 JSON 对象。",
    "参考：原始结构化 TripRequest（若上文描述与此有出入，以上方逐条描述为准）：",
    JSON.stringify(input.tripRequest),
  ].join("\n");
}

export function buildTripPlanRepairInstructions(
  phase: "generate-trip" | "regenerate-trip",
): string {
  return [
    `请把下面的 ${phase} 输出修复为最终 GenerateTripResponse JSON 对象。`,
    "顶层结构必须是 {\"tripPlan\": {...}, \"appliedChanges\"?: [...], \"warnings\"?: [...]}。tripPlan 是必需的外层包裹字段，禁止把 tripTitle / dailyItinerary 等直接放到顶层。",
    "如果原输出把 tripPlan 内容摊平在顶层，请重新用 tripPlan 包裹起来；如果原输出被 data / result / plan 等包裹，请剥掉这一层，只保留 tripPlan 这个外层。",
    "不要 Markdown，不要代码块，不要解释文字，不要中文 key。",
    "必须符合现有 tripPlan schema，缺字段时补合理的短文本。",
    "weatherSummary.dailyForecast 每一项都必须包含 summary 字符串。",
    "以下字段必须是 JSON 数组（即使只有 1 条也要写成 [\"单条内容\"]，禁止直接写成字符串）：guide、dailyTips、routeOrder、matchedInterests、generalTips、warnings、weatherSummary.reminders、hotelAreaAdvice[].suggestedPlatforms、transportAdvice.suggestedPlatforms、transportAdvice.options[].pros、transportAdvice.options[].cons。若原输出把这些字段写成了字符串，请把它们包成单元素数组。",
    "每个行程 block 的 type 只能使用英文枚举 attraction / food / transport / hotel / free_time / shopping / other；出现中文（如「美食」「景点」）或复数形式（如 attractions）请归位到最贴近的英文枚举值。",
    "transportAdvice.options[].mode 只能使用 flight、train、high_speed_rail、bus、ship、other；地铁、打车、步行等市内交通统一写 other。",
    "days 与 dailyItinerary 数量必须一致，day 必须连续编号。",
    "每天只保留 morning / afternoon / evening 三个时段，每个时段 1 个主要 block。",
    "reason ≤ 28 字，guide 每条 ≤ 24 字且每 block 最多 1 条，dailyTips 每天 1 条，generalTips 最多 3 条，warnings 最多 2 条。",
    "hotelAreaAdvice 只保留 1 条；transportAdvice.options 只保留 1 个；pros / cons 每条最多 1 条短句。",
    "budgetSummary 的金额字段（totalEstimate/transport/hotel/food/tickets/localTransport/flexibleSpending）只写「约 X 元」这种短格式，note ≤ 40 字。",
    "如果原输出里的 placeName 是「特色街区」「网红咖啡馆」「当地小吃」等泛化描述，请替换成真实、可在高德/百度地图搜索到的具体门店或景点全名，禁止再次泛化。placeName ≤ 24 字。",
    "attraction / food / experience / shopping block 必须包含 suggestedDuration（例如「约 1.5 小时」，≤ 10 字）；非当日第一站的 block 必须包含 transportFromPrevious（交通方式 + 时长，例如「地铁 5 号线约 20 分钟」，≤ 22 字）。",
    "可选字段（weatherImpact / backupPlan / matchedInterests）除非非常必要，否则删除掉，不要为了字段整齐而补文本。",
  ].join("\n");
}

export function buildRepairJsonPrompt(
  rawOutput: unknown,
  instructions?: string,
): string {
  const serialized =
    typeof rawOutput === "string" ? rawOutput : JSON.stringify(rawOutput);

  return [
    instructions ?? "请修复以下输出，使其符合目标 JSON Schema。",
    "待修复内容：",
    serialized.slice(0, 30_000),
    "再次提醒：只返回一个合法 JSON 对象。",
  ].join("\n");
}
