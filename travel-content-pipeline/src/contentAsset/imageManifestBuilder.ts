import type {
  ImageManifestTask,
  ImageRequirementStatus,
  ImageRequirementType,
  ImageSlot,
} from "./types.js";

interface BuildImageManifestTaskOptions {
  city: string;
  asset_id: string;
  asset_name: string;
  image_slot: ImageSlot;
  type: ImageRequirementType;
  source_preference: ImageManifestTask["source_preference"];
  generation_mode: ImageManifestTask["generation_mode"];
  decision_reason: string;
  prompt: string;
  status: ImageRequirementStatus;
  editorial_roles?: string[];
}

interface AssetIdentity {
  district: string;
  poi: string;
  aliases: string[];
  subject: string;
  secondary: string[];
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function inferAssetIdentity(assetId: string, assetName: string, editorialRoles: string[]): AssetIdentity {
  const pool = normalize([assetId, assetName, ...editorialRoles].join(" "));

  if (pool.includes("forbidden_city") || pool.includes("故宫")) {
    return {
      district: "Dongcheng",
      poi: "故宫博物院",
      aliases: ["Forbidden City Beijing", "Palace Museum Beijing", "Forbidden City courtyard"],
      subject: "historic palace architecture",
      secondary: ["courtyard", "red walls", "visitors"],
    };
  }

  if (pool.includes("jingshan")) {
    return {
      district: "Xicheng",
      poi: "景山公园",
      aliases: ["Jingshan Park Beijing", "Jingshan Park viewpoint", "Beijing imperial hill park"],
      subject: "imperial city viewpoint",
      secondary: ["hilltop view", "park walkway", "visitors"],
    };
  }

  if (pool.includes("beihai")) {
    return {
      district: "Xicheng",
      poi: "北海公园",
      aliases: ["Beihai Park Beijing", "Beihai Park lake", "Beijing royal garden"],
      subject: "royal garden landscape",
      secondary: ["lake", "pavilion", "park visitors"],
    };
  }

  if (pool.includes("temple_of_heaven") || pool.includes("天坛")) {
    return {
      district: "Dongcheng",
      poi: "天坛公园",
      aliases: ["Temple of Heaven Beijing", "Temple of Heaven Hall of Prayer", "Beijing imperial altar"],
      subject: "imperial ceremonial architecture",
      secondary: ["blue roof", "stone terrace", "visitors"],
    };
  }

  if (pool.includes("shichahai")) {
    return {
      district: "Xicheng",
      poi: "什刹海",
      aliases: ["Shichahai Beijing", "Shichahai lakeside", "Beijing hutong waterfront"],
      subject: "historic waterfront streetscape",
      secondary: ["lake edge", "hutong walk", "pedestrians"],
    };
  }

  if (pool.includes("gulou") || pool.includes("鼓楼")) {
    return {
      district: "Dongcheng",
      poi: "鼓楼",
      aliases: ["Drum Tower Beijing", "Gulou Beijing", "Beijing old city axis"],
      subject: "old city landmark streetscape",
      secondary: ["tower facade", "street life", "pedestrians"],
    };
  }

  if (pool.includes("yangmeizhu")) {
    return {
      district: "Xicheng",
      poi: "杨梅竹斜街",
      aliases: ["Yangmeizhu Xiejie Beijing", "Dashilar hutong street", "Beijing old alley street"],
      subject: "hutong street texture",
      secondary: ["shopfronts", "alleyway", "pedestrians"],
    };
  }

  if (pool.includes("niujie")) {
    return {
      district: "Xicheng",
      poi: "牛街",
      aliases: ["Niujie Beijing", "Niujie food street", "Beijing halal food"],
      subject: "traditional food street scene",
      secondary: ["shop signs", "food counters", "street crowd"],
    };
  }

  if (pool.includes("huguosi")) {
    return {
      district: "Xicheng",
      poi: "护国寺小吃",
      aliases: ["Huguosi Snack Street Beijing", "Huguosi snacks", "Beijing traditional snacks"],
      subject: "traditional snack market scene",
      secondary: ["food stall", "serving counter", "diners"],
    };
  }

  if (pool.includes("qianmen")) {
    return {
      district: "Dongcheng",
      poi: "前门传统美食区",
      aliases: ["Qianmen food street Beijing", "Qianmen Beijing snacks", "Beijing old commercial street food"],
      subject: "historic food district streetscape",
      secondary: ["shopfronts", "food stalls", "street crowd"],
    };
  }

  if (pool.includes("wudaoying")) {
    return {
      district: "Dongcheng",
      poi: "五道营胡同",
      aliases: ["Wudaoying Hutong Beijing", "Wudaoying Beijing cafes", "Beijing hutong walk"],
      subject: "slow hutong streetscape",
      secondary: ["cafes", "alleyway", "walkers"],
    };
  }

  if (pool.includes("baita")) {
    return {
      district: "Xicheng",
      poi: "白塔寺",
      aliases: ["Baita Temple Beijing", "White Pagoda Temple Beijing", "Beijing pagoda courtyard"],
      subject: "historic temple courtyard",
      secondary: ["white pagoda", "courtyard", "visitors"],
    };
  }

  if (pool.includes("798")) {
    return {
      district: "Chaoyang",
      poi: "798艺术区",
      aliases: ["798 Art District Beijing", "798 Beijing galleries", "Beijing contemporary art district"],
      subject: "contemporary art district",
      secondary: ["industrial facade", "gallery entrance", "visitors"],
    };
  }

  if (pool.includes("liangma")) {
    return {
      district: "Chaoyang",
      poi: "亮马河夜景",
      aliases: ["Liangma River Beijing", "Liangma River night view", "Beijing riverside lights"],
      subject: "urban riverside night scene",
      secondary: ["river lights", "walkway", "night pedestrians"],
    };
  }

  if (pool.includes("culture_pause")) {
    return {
      district: "Dongcheng",
      poi: assetName,
      aliases: ["Beijing cultural space", "Beijing art bookstore", "Beijing quiet gallery"],
      subject: "quiet cultural interior",
      secondary: ["bookshelves", "reading corner", "visitors"],
    };
  }

  return {
    district: "N/A",
    poi: assetName,
    aliases: [`${assetName} Beijing`, `${assetName} travel photo`, `${assetName} streetscape`],
    subject: "place-based travel scene",
    secondary: ["visitors", "ambient light"],
  };
}

function buildSearchKeywords(identity: AssetIdentity, imageSlot: ImageSlot, type: ImageRequirementType): string[] {
  const base = [...identity.aliases];

  if (type === "food") {
    base.push(`${identity.poi} food`, `${identity.poi} Beijing food photo`);
  } else if (imageSlot === "explore_cover") {
    base.push(`${identity.poi} architecture`, `${identity.poi} landmark photo`);
  } else if (imageSlot === "poi_gallery") {
    base.push(`${identity.poi} street view`, `${identity.poi} visitor photo`);
  } else if (imageSlot === "day_cover") {
    base.push(`${identity.poi} evening view`, `${identity.poi} atmosphere`);
  } else if (imageSlot === "detail_image") {
    base.push(`${identity.poi} detail`, `${identity.poi} close-up`);
  }

  return uniqueStrings(base).slice(0, 5);
}

function buildVisualSubject(identity: AssetIdentity, type: ImageRequirementType): ImageManifestTask["visual_subject"] {
  if (type === "food") {
    return {
      main_subject: "local food presentation",
      secondary_elements: uniqueStrings(["serving counter", "tableware", ...identity.secondary]).slice(0, 4),
    };
  }

  return {
    main_subject: identity.subject,
    secondary_elements: identity.secondary.slice(0, 4),
  };
}

function buildImageUsageProfile(imageSlot: ImageSlot): ImageManifestTask["image_usage_profile"] {
  if (imageSlot === "explore_cover" || imageSlot === "trip_cover") {
    return "cover";
  }

  if (imageSlot === "food_gallery") {
    return "food";
  }

  if (imageSlot === "poi_gallery") {
    return "place";
  }

  return "experience";
}

function buildReviewRequirement(
  usageProfile: ImageManifestTask["image_usage_profile"],
  type: ImageRequirementType,
): ImageManifestTask["review_requirement"] {
  if (usageProfile === "cover") {
    return {
      required: true,
      reason: "cover asset requires visual quality review",
    };
  }

  if (type === "food") {
    return {
      required: true,
      reason: "food asset requires realism and appetite check",
    };
  }

  return {
    required: false,
    reason: "standard asset can enter normal pipeline QA",
  };
}

export function buildImageManifestTask(options: BuildImageManifestTaskOptions): ImageManifestTask {
  const identity = inferAssetIdentity(options.asset_id, options.asset_name, options.editorial_roles ?? []);
  const searchKeywords = buildSearchKeywords(identity, options.image_slot, options.type);
  const usageProfile = buildImageUsageProfile(options.image_slot);

  return {
    asset_instance_id: `${options.asset_id}_${options.image_slot}`,
    asset_id: options.asset_id,
    asset_name: options.asset_name,
    image_slot: options.image_slot,
    type: options.type,
    source_preference: options.source_preference,
    generation_mode: options.generation_mode,
    decision_reason: options.decision_reason.trim(),
    prompt: options.prompt.trim(),
    location_context: {
      city: options.city,
      district: identity.district,
      poi: identity.poi,
      keywords: identity.aliases.slice(0, 3),
    },
    search_keywords: searchKeywords,
    visual_subject: buildVisualSubject(identity, options.type),
    image_usage_profile: usageProfile,
    review_requirement: buildReviewRequirement(usageProfile, options.type),
    status: options.status,
  };
}
