export interface RequestContext {
  city: string;
  traveler_type: string;
  days: number;
  season: string;
  budget: string;
  pace: string;
  motivation: string;
  theme: string;
}

export interface RelevantDistrict {
  id: string;
  name: string;
  city_role: string;
  signature_experiences: string[];
  mobility_notes: string[];
}

export interface RelevantPoi {
  id: string;
  name: string;
  district_id: string;
  description: string;
  recommended_duration_minutes: number;
  route_roles: string[];
  risks: string[];
}

export interface RelevantFoodKnowledge {
  id: string;
  name: string;
  district_id: string;
  recommended_foods: string[];
  dining_scenarios: string[];
  route_roles: string[];
  note: string;
}

export interface ContentContext {
  city_personality: {
    one_line_summary: string;
    explore_strengths: string[];
    signature_contrasts: string[];
    avoid_generic_framing: string[];
  };
  relevant_districts: RelevantDistrict[];
  relevant_scenes: string[];
  relevant_pois: RelevantPoi[];
  relevant_food_knowledge: RelevantFoodKnowledge[];
}

export interface CityStrategyContext {
  city_positioning: string;
  priority_combination: string;
  not_recommended_patterns: string[];
}

export interface GenerationGuidance {
  route_bias: string;
  must_include: string[];
  avoid: string[];
  food_strategy: string;
  memory_strategy: string;
}

export interface VerifiedPoi {
  name: string;
  district_name: string;
  latitude: number;
  longitude: number;
  source_provider: string;
  confidence?: string;
  asset_id?: string;
}

export interface RouteFact {
  from: string;
  to: string;
  transport_mode: string;
  distance_meters: number;
  duration_minutes: number;
  source_provider: string;
  confidence?: string;
  id?: string;
}

export interface TransferBurdenFact {
  from: string;
  to: string;
  transport_mode: string;
  burden_level: string;
  reason: string;
}

export interface MapContext {
  verified_pois: VerifiedPoi[];
  route_facts: RouteFact[];
  transfer_burden: TransferBurdenFact[];
  cluster_warnings: string[];
  route_feasibility_notes: string[];
}

export interface QualityContext {
  active_tradeoff_rules: string[];
  daily_storyline_rules: string[];
  food_depth_rules: string[];
  memory_point_rules: string[];
  anti_template_rules: string[];
}

export interface GenerationContext {
  request_context: RequestContext;
  content_context: ContentContext;
  city_strategy_context: CityStrategyContext;
  generation_guidance: GenerationGuidance;
  map_context: MapContext;
  quality_context: QualityContext;
}
