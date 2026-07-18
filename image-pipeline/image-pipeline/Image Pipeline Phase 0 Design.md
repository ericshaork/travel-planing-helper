# Image Pipeline Phase 0 Design

## 1. System Architecture Design

### 1.1 Positioning

`image-pipeline` is an independent downstream module in Wanderly.

It does not participate in travel content generation, does not modify `travel-content-pipeline`, and does not depend on unstable field names from the current `plan.json`.

Its responsibility begins only after a future stable travel plan artifact is available.

Core principle:

`travel-content-pipeline` owns travel content.

`image-pipeline` owns visual asset demand modeling, generation orchestration, asset storage, and asset metadata management.

### 1.2 Module Boundary

Future flow:

```text
Travel Plan Generator
        |
        v
   stable plan.json
        |
        v
    Image Pipeline
        |
        v
   visual assets
```

The Image Pipeline should be structured as five internal layers:

```text
Input Layer
    |
    v
Demand Parsing Layer
    |
    v
Prompt Construction Layer
    |
    v
Model Invocation Layer
    |
    v
Asset Management Layer
```

### 1.3 Layer Responsibilities

#### Input Layer

Responsibilities:

- Receive stable travel plan input from file, queue, or service boundary
- Validate source document presence and version compatibility
- Normalize source reference metadata such as trip id, locale, and source version
- Keep source ingestion separate from content interpretation

Output:

- `source_document`
- raw travel-plan payload
- pipeline execution context

#### Demand Parsing Layer

Responsibilities:

- Interpret the travel plan into abstract visual demand units
- Extract entities and experiences without relying on specific upstream field names
- Build a provider-agnostic `image_request`
- Determine which assets are required, optional, or deferred

Key abstraction concepts:

- destination
- travel concept
- POI entity
- food entity
- itinerary scene
- experience

Output:

- normalized `image_request`

#### Prompt Construction Layer

Responsibilities:

- Convert image demand into visual instructions
- Apply Wanderly style profiles
- Generate structured prompt inputs instead of directly coupling business logic to one model format
- Separate subject facts from style facts

Output:

- provider-agnostic prompt spec
- style profile reference
- composition hints
- output specs such as ratio and orientation

#### Model Invocation Layer

Responsibilities:

- Route requests to a configured provider adapter
- Translate normalized prompt spec into provider-specific request payloads
- Handle retries, timeouts, and provider response normalization
- Remain replaceable across OpenAI Image, Flux, Midjourney workflows, Stable Diffusion pipelines, and domestic providers

Output:

- normalized generation result
- provider metadata
- raw asset file references

#### Asset Management Layer

Responsibilities:

- Persist generated files and derived thumbnails or web variants
- Record asset lineage, status, review state, and replacement history
- Publish a provider-agnostic `asset_manifest`
- Make assets readable by downstream website or content-serving systems

Output:

- stored image files
- `asset_manifest`
- website-readable asset references

## 2. Data Flow Design

### 2.1 Future Stable Input

When `plan.json` becomes stable, Image Pipeline should consume it as a content artifact, not as a hard-coded object contract embedded in generation logic.

The parser should read semantic concepts such as:

- destination
- title
- summary
- travel concept
- daily itinerary
- route
- POI
- food
- experience
- itinerary scene

The parser should not assume that these concepts appear under specific current keys. Instead, it should map the stable plan into an internal semantic layer first.

### 2.2 Recommended Future Flow

```text
stable plan.json
    |
    v
source ingestion
    |
    v
semantic normalization
    |
    v
image_request generation
    |
    v
prompt spec generation
    |
    v
provider adapter execution
    |
    v
asset storage
    |
    v
asset_manifest generation
    |
    v
travel plan asset binding
```

### 2.3 Semantic Normalization Concept

The parser should build a normalized internal representation like:

- Trip Context
- Destination Context
- Narrative Concept
- Place Entities
- Food Entities
- Scene Units
- Experience Units

This normalization layer protects Image Pipeline from:

- future plan schema refactors
- content quality rewrites in Travel Plan Generator V2
- changes in route depth or itinerary richness
- addition of new content blocks

### 2.4 Demand Mapping Logic

Recommended mapping:

- One trip produces one or more cover-image requests
- Each important POI entity may produce place-image requests
- Each important food entity may produce food-image requests
- Each day or route segment may produce scene-image requests
- Each highlighted activity or emotional memory point may produce experience-image requests

This lets the image system scale from lightweight cards to richer travel guides without changing its architecture.

## 3. Image Request Schema Draft

### 3.1 Design Principles

The future `image_request` schema should:

- describe visual demand rather than upstream content structure
- avoid storing image URLs
- support multiple asset types
- allow batch generation
- remain stable when the travel plan schema evolves
- separate source object identity from visual generation intent

### 3.2 Required Asset Types

The schema should support:

1. Cover Image
2. Place Images
3. Food Images
4. Daily Scene Images
5. Experience Images

### 3.3 Recommended Top-Level Shape

```json
{
  "schema_version": "1.0.0",
  "request_id": "imgreq_trip_001",
  "source_document": {},
  "global_context": {},
  "asset_requests": []
}
```

### 3.4 Recommended Core Fields

Top-level fields:

- `schema_version`: version of the image request schema
- `request_id`: request batch id
- `source_document`: source artifact metadata
- `global_context`: destination, audience, themes, style direction
- `asset_requests`: list of visual generation requests
- `metadata`: extensible operational metadata

Per asset request fields:

- `asset_request_id`: unique asset demand id
- `asset_role`: `cover | place | food | scene | experience`
- `source_object_type`: abstract source object type
- `source_object_ref`: stable source reference or semantic reference
- `usage`: where the image will be used
- `visual_intent`: style and realism requirements
- `output_spec`: ratio, orientation, minimum dimensions
- `priority`: generation priority
- `variants_requested`: desired candidate count

### 3.5 Abstract Source Object Types

Recommended values for `source_object_type`:

- `trip`
- `destination`
- `travel_concept`
- `poi_entity`
- `food_entity`
- `scene_unit`
- `experience_unit`

This is safer than binding to current Explore-only fields.

### 3.6 Usage Positions

Recommended values for `usage`:

- `card_cover`
- `detail_header`
- `poi_gallery`
- `food_section`
- `day_section`
- `experience_section`
- `social_share`

### 3.7 Style and Output Fields

`visual_intent` should include:

- style family
- style keywords
- mood keywords
- authenticity level
- must-include elements
- avoid elements
- cultural notes

`output_spec` should include:

- aspect ratio
- orientation
- minimum width
- minimum height
- transparency requirement if ever needed

## 4. Image Asset Directory Design

### 4.1 Proposed Directory Layout

```text
images/
  trip_xxx/
    cover/
    places/
    food/
    scenes/
    experiences/
    manifest/
    review/
```

### 4.2 Directory Semantics

- `cover/`: final and candidate cover images
- `places/`: POI-related assets
- `food/`: food-related assets
- `scenes/`: daily itinerary atmosphere assets
- `experiences/`: activity and emotional-moment assets
- `manifest/`: asset manifest and metadata snapshots
- `review/`: review exports, flags, or moderation records

### 4.3 Naming and Versioning

Recommended rules:

- Organize by `trip_id`
- Keep stable `asset_id` per stored image
- Support replacement by new version rather than overwriting history silently
- Store original and web-ready derivatives separately when needed

Example:

```text
images/
  trip_tokyo_family_001/
    cover/
      cover_main_v1.png
      cover_main_v2.png
    places/
      poi_sensoji_01_v1.png
    food/
      food_monjayaki_01_v1.png
    scenes/
      day_01_evening_scene_v1.png
    experiences/
      exp_sumida_river_walk_v1.png
    manifest/
      asset_manifest.json
```

### 4.4 Operational Goals

This structure should support:

- batch generation
- candidate storage
- human replacement
- moderation and review
- website asset lookup
- future CDN or object-storage mapping

## 5. Image Style System Design

### 5.1 Brand Direction

Wanderly visual identity should combine:

- travel magazine
- private travel journal

The style system should therefore preserve both editorial attractiveness and personal memory warmth.

### 5.2 Style Profiles

#### Cover

Primary direction:

- watercolor
- hand drawn
- collage
- vintage travel magazine

Desired qualities:

- strong destination personality
- narrative hook
- editorial composition
- collectible feeling

#### Place

Primary direction:

- realistic photography
- location identity

Desired qualities:

- recognizable landmarks or spatial character
- elevated but believable realism
- place-first framing rather than generic tourism stock feeling

#### Food

Primary direction:

- professional food photography

Desired qualities:

- food texture clarity
- regional identity
- table atmosphere
- appetite appeal with cultural context

#### Scene

Primary direction:

- travel diary
- emotional atmosphere

Desired qualities:

- time-of-day mood
- walking, resting, wandering, or transition feeling
- support reading rhythm across itinerary sections

#### Experience

Primary direction:

- immersive travel moment

Desired qualities:

- human-scale participation
- sensory and emotional focus
- memory-like intimacy
- experience-first rather than landmark-first composition

### 5.3 Style Profile Structure

A reusable style profile can contain:

- `profile_id`
- `asset_role`
- `style_family`
- `style_keywords`
- `mood_keywords`
- `composition_rules`
- `avoid_rules`
- `color_tendency`
- `realism_level`

This should remain independent from any single image model's prompt syntax.

## 6. Image API Abstraction Plan

### 6.1 Goal

The provider layer should expose one stable interface while allowing multiple model providers underneath.

No provider should leak directly into upstream business logic.

### 6.2 Provider Interface

Suggested interface:

```ts
interface ImageProvider {
  providerId: string;
  generate(request: ProviderGenerationRequest): Promise<ProviderGenerationResult>;
  getJob?(jobId: string): Promise<ProviderJobStatus>;
  cancelJob?(jobId: string): Promise<void>;
  supports(capability: ProviderCapability): boolean;
}
```

### 6.3 Normalized Request Shape

Suggested provider request contract:

```ts
interface ProviderGenerationRequest {
  requestId: string;
  assetRequestId: string;
  assetRole: "cover" | "place" | "food" | "scene" | "experience";
  subject: Record<string, unknown>;
  promptSpec: Record<string, unknown>;
  outputSpec: {
    aspectRatio?: string;
    width?: number;
    height?: number;
  };
  options?: Record<string, unknown>;
}
```

### 6.4 Normalized Result Shape

```ts
interface ProviderGenerationResult {
  providerId: string;
  modelId?: string;
  jobId?: string;
  status: "queued" | "completed" | "failed";
  files?: Array<{
    kind: string;
    tempRef: string;
    mimeType: string;
    width?: number;
    height?: number;
  }>;
  error?: {
    code: string;
    message: string;
    retryable?: boolean;
  };
  raw?: Record<string, unknown>;
}
```

### 6.5 Adapter Strategy

Each provider should live behind its own adapter:

- OpenAI Image adapter
- Flux adapter
- Midjourney adapter
- Stable Diffusion adapter
- Domestic model adapter

The rest of the pipeline should only depend on the normalized interface.

## 7. Integration Plan with Travel Plan Generator V2

### 7.1 Integration Timing

Integration should begin only after Travel Plan Generator V2 publishes a stable plan artifact contract.

Before that point, Image Pipeline should stay focused on architecture, schema, asset conventions, and provider abstraction.

### 7.2 Future Integration Flow

```text
stable plan.json
    |
    v
semantic parser
    |
    v
image_request
    |
    v
image generation orchestration
    |
    v
asset manifest
    |
    v
bind asset refs back to travel plan
```

### 7.3 Binding Strategy

Recommended binding model:

1. Travel Plan Generator produces a stable content artifact with durable entity references.
2. Image Pipeline reads the artifact and creates `image_request`.
3. Image Pipeline generates assets and records them in `asset_manifest`.
4. A binding layer maps asset records back to trip-level and entity-level references.
5. Downstream website or API reads the enriched plan plus asset manifest, or a merged delivery artifact.

### 7.4 Why Asset Binding Should Be Indirect

Do not write generation assumptions back into the content generator itself.

Instead:

- content system owns semantic entities
- image system owns visual assets
- binding layer owns reference association

This keeps both modules independently replaceable.

### 7.5 Recommended Delivered Artifacts

Future delivery artifacts may include:

- original stable `plan.json`
- derived `image_request.json`
- generated `asset_manifest.json`
- optional merged delivery payload for website rendering

## Phase 0 Outcome

Phase 0 should end with:

- independent module boundary defined
- abstract data flow defined
- `image_request` draft stabilized
- `asset_manifest` draft stabilized
- asset directory strategy defined
- style profile system defined
- provider interface defined

Phase 0 should not include:

- bulk image generation
- provider API integration
- test image production
- coupling to unstable current `plan.json`
- modifications to `travel-content-pipeline`
