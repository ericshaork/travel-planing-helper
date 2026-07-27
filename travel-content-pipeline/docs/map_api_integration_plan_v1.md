# Map API Integration Plan V1

## Purpose

This document defines the V3.4 Step2 preparation plan for future Amap API integration in `travel-content-pipeline`.

The current preferred target is:

- Amap Open Platform Web Service API

This is a design document only.

It does not:

- modify code
- modify schema
- modify prompts
- modify batch generation
- modify city JSON files

The goal is to define the responsibility boundary of the map layer before implementation starts.

This document should answer:

- why map API should be the first external integration
- what map facts the system should rely on
- what normalized objects should exist
- what AI should and should not do once map data is available

## 1. Why Map API Comes First

Map API should be the first external integration because route quality depends on movement truth.

Today, many premium-quality failures are not caused by lack of language quality.
They are caused by weak spatial truth.

Without a map layer, the system can still produce:

- interesting plans
- city-specific plans
- better food framing
- stronger editorial positioning

But it still cannot reliably control:

- actual transfer burden
- district clustering quality
- cross-district overreach
- realistic fallback movement

So map API is the first integration with the highest structural value.

### The map API mainly solves

#### 1. POI coordinate confirmation

The system needs verified coordinates for real places.

This is necessary for:

- POI existence checking
- route clustering
- district assignment support
- transfer estimation

#### 2. Point-to-point distance

The system needs measured distance between places.

This is necessary for:

- route sequencing
- transfer burden detection
- walking feasibility checks

#### 3. Route time

The system needs realistic movement time, not guessed movement time.

This is necessary for:

- daily density control
- route rhythm
- pace validation
- fallback planning

#### 4. Area clustering

The system needs help grouping nearby POIs into meaningful route zones.

This is necessary for:

- district-based planning
- half-day clustering
- low-friction route assembly

#### 5. Cross-district over-distance detection

The system needs to detect when a route looks reasonable in text but is spatially weak.

This is necessary for:

- preventing fake premium routes
- preventing east-west route abuse
- protecting family and slow-pace outputs

#### 6. Fallback route support

The system needs alternative movement logic when the ideal route changes.

This is necessary for:

- weather fallback
- energy fallback
- closure fallback
- crowd-avoidance rerouting

## 2. API Type

The preferred future map integration target is:

- Amap Open Platform Web Service API

Why this is the preferred first choice:

- strong China coverage
- practical POI and routing fit for domestic travel planning
- suitable for city-scale route generation
- likely better aligned with Chinese user movement reality than a global-first map stack

This document does not lock the implementation forever.
It defines the current preferred direction.

## 3. Future Capabilities To Use

The future system does not need every map API feature at once.

The first implementation should focus on a small number of high-value capabilities.

### 1. Geocoding

Use case:

- convert known POI or area names into coordinates

Why it matters:

- helps verify manually curated places
- supports POI normalization
- supports place existence checking

### 2. Reverse Geocoding

Use case:

- convert coordinates into area or address context

Why it matters:

- supports area labeling
- supports district confirmation
- supports cluster explanation

### 3. Search API

Use case:

- search real POIs by keyword, district, or category

Why it matters:

- expands candidate retrieval
- verifies manually known POIs
- supports scalable city growth

### 4. Route Planning API

Use case:

- estimate movement route and duration between points

Why it matters:

- improves route feasibility
- improves transfer realism
- improves fallback route design

### 5. Distance Measurement API

Use case:

- measure direct or route-based distance between points

Why it matters:

- helps detect overreach
- helps score route compactness
- helps compare multiple candidate route orders

## 4. Environment Variable Design

The future integration should keep credentials isolated from code and prompt logic.

### Minimum environment variable

```text
AMAP_API_KEY=
```

### Possible future variables

```text
AMAP_API_BASE_URL=
AMAP_TIMEOUT_MS=
AMAP_POI_CACHE_TTL_SECONDS=
AMAP_ROUTE_CACHE_TTL_SECONDS=
```

### Design principle

- credentials should stay outside code
- timeouts should be configurable
- cache behavior should be configurable
- provider-specific settings should not leak into prompt files

## 5. Data Normalization Object Design

Raw API payloads should not be passed directly into generation logic.

The system should define normalized internal objects first.

At minimum:

- `NormalizedPOI`
- `NormalizedRouteDistance`
- `NormalizedRoutePlan`
- `NormalizedRouteStep`

### 1. `NormalizedPOI`

Purpose:

- represent a verified place after API lookup

Suggested fields:

```text
id
name
source_name
city_code
district_name
address
latitude
longitude
category
source_provider
source_poi_id
confidence_level
```

Why it matters:

- gives the system one internal POI shape
- separates internal usage from raw Amap response structure
- supports future multi-provider flexibility

### 2. `NormalizedRouteDistance`

Purpose:

- represent normalized distance and travel-time facts between two points

Suggested fields:

```text
origin_poi_id
destination_poi_id
transport_mode
linear_distance_meters
route_distance_meters
estimated_duration_minutes
source_provider
retrieved_at
```

Why it matters:

- supports route scoring
- supports over-distance detection
- supports pace validation

### 3. `NormalizedRouteStep`

Purpose:

- represent route-planning output in structured step form

Suggested fields:

```text
origin_poi_id
destination_poi_id
transport_mode
step_index
instruction_summary
distance_meters
duration_minutes
major_transfer_flag
```

Why it matters:

- supports fallback route design
- supports explanation-ready movement summaries
- supports future route validation

### 4. `NormalizedRoutePlan`

Purpose:

- represent one complete normalized route-planning result between two points

Suggested fields:

```text
origin_poi_id
destination_poi_id
transport_mode
route_distance_meters
estimated_duration_minutes
steps
major_transfer_count
cross_district_flag
source_provider
retrieved_at
```

Why it matters:

- gives the system one reusable route object instead of scattered step fragments
- supports fallback comparison
- supports route validation and generation context packaging

### Optional future normalized objects

- `NormalizedAreaCluster`
- `NormalizedTransitOption`
- `NormalizedFallbackRoute`

These do not need to be first-wave objects, but they are likely useful later.

## 6. AI Usage Boundary

Once map API is connected, the system must keep a hard boundary between:

- factual movement truth
- editorial route expression

### Map API is responsible for facts

Map API should own:

- coordinates
- point-to-point distance
- estimated route duration
- route reachability
- area adjacency support
- whether a POI exists in the provider search result

In simple terms:

- where things are
- how far apart they are
- whether movement is realistic

### DeepSeek is responsible for expression

DeepSeek should own:

- route explanation
- experience packaging
- trade-off logic
- why a route feels right
- how the day should be narrated
- why a meal belongs in the route
- copy generation

In simple terms:

- what the route means
- why it is worth doing

### Boundary summary

Map API answers:

- can this route work
- how far is it
- how long does it take

DeepSeek answers:

- why this route is better
- why this stop matters
- what experience this movement supports

## 7. Do Not Let AI Freely Invent

This is the most important safety rule for future map integration.

The model should not freely invent:

- exact distance
- exact duration
- subway line details
- coordinates
- whether a POI is real

### Specifically prohibited free invention

#### 1. Exact distance

The model must not output precise numeric distance unless it comes from verified map data.

#### 2. Exact time

The model must not output precise transfer time unless it comes from verified routing data.

#### 3. Subway line truth

The model must not confidently invent:

- line numbers
- interchange details
- station sequences

unless they are explicitly provided by trusted map data.

#### 4. Coordinates

The model must never fabricate latitude or longitude.

#### 5. POI existence

The model must not assume a place is real just because it sounds plausible.

This is especially important for:

- restaurants
- niche museums
- small alleys or venues

## 8. Suggested Future Module Ownership

The future map layer should sit primarily inside:

- `integrations/maps/`

But its outputs should flow into:

- `generation/context/`
- `validation/route/`

### Module ownership suggestion

#### `integrations/maps/`

Should own:

- raw Amap client
- request building
- response parsing
- retry logic
- cache integration
- normalization into internal map objects

#### `generation/context/`

Should own:

- selecting which route facts are relevant for a request
- merging map data into `GenerationContext`

#### `validation/route/`

Should own:

- cross-district distance checks
- same-day route overload checks
- fallback feasibility checks

## 9. Suggested Future Use Cases In Planning

Once map API is available, the system should gradually use it for:

### 1. POI verification

- confirm a POI exists
- confirm a POI belongs to the expected city

### 2. Route compactness scoring

- compare multiple route orders
- reject inefficient sequences

### 3. Pace protection

- detect when a "balanced" route behaves like a "dense" route
- detect when family or slow-pace routes exceed movement tolerance

### 4. District integrity protection

- identify when the route breaks a district cluster too early
- identify when the system jumps too far for too little value

### 5. Fallback generation support

- provide nearby substitute zones
- recommend lower-friction reroutes

## 10. Integration Success Standard

Map API Integration Plan V1 is successful if the future system becomes able to clearly say:

- this coordinate came from the map provider
- this transfer estimate came from routing data
- this route explanation came from the model

It is not successful if the future system still blurs:

- guessed time and real time
- guessed distance and verified distance
- editorial route judgment and spatial feasibility

The purpose of this document is not to define implementation detail yet.

It is to make one thing explicit before coding starts:

- map API owns movement truth
- AI owns travel-product meaning
