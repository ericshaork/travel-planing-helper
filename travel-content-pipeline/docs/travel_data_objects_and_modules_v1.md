# Travel Data Objects And Modules V1

## Purpose

This document defines the V3.4 Step2 object model and module boundary design for the future AI travel generation system in `travel-content-pipeline`.

It is a design document only.

It does not:

- modify code
- modify schema
- modify prompts
- modify batch generation
- modify city JSON files

This document expands on [travel_data_architecture_v1.md](/C:/Users/10200/Desktop/travel-content-pipeline/docs/travel_data_architecture_v1.md).

Its goal is to make the future system concrete at four levels:

- recommended directory structure
- core data objects
- data flow from request to output
- API integration priority

The main question is no longer only:

- what layers exist

It is now:

- what modules should own them
- what objects should represent them
- how data should move between them

## Core Design Principle

The future system should separate:

- editorial knowledge
- factual integrations
- generation inputs
- generation outputs
- validation logic
- review logic
- media logic

This prevents one object or one module from trying to do too much.

## 1. Recommended Future Directory Structure

The future project structure should be organized around responsibility boundaries rather than implementation accidents.

At minimum:

```text
knowledge/
  cities/
  scenes/
  routes/
  food/
  motivations/
  themes/
  strategies/
  quality_rules/

integrations/
  maps/
  pois/
  restaurants/
  seasonal/
  weather/
  media/
  cache/

generation/
  requests/
  context/
  ranking/
  prompts/
  composers/
  providers/
  outputs/

validation/
  schema/
  factual/
  route/
  quality/

review/
  manual/
  reports/
  rubrics/

media/
  image_prompts/
  covers/
  gallery/
```

### Directory intent

#### `knowledge/`

Owns manually curated travel judgment.

This is where premium quality is protected.

#### `integrations/`

Owns external API fetching, normalization, caching, and freshness control.

This is where real-world truth enters the system.

#### `generation/`

Owns generation-time assembly.

This is where request, knowledge, strategy, external data, and AI composition meet.

#### `validation/`

Owns post-assembly and post-generation correctness checks.

This is where the system says:

- structurally valid
- factually safe enough
- route-feasible enough
- quality-acceptable enough

#### `review/`

Owns human review workflows, reports, and editorial approval surfaces.

This is where premium standards remain enforceable.

#### `media/`

Owns image-oriented assets and future image-API preparation.

This is where route identity can later connect to cover generation and visual consistency.

## 2. Core Data Object List

The future system should define clear object types for each major data responsibility.

At minimum:

- `CityKnowledge`
- `SceneKnowledge`
- `RouteKnowledge`
- `POIKnowledge`
- `FoodKnowledge`
- `CityContentStrategy`
- `TravelMotivation`
- `PlanTheme`
- `MapData`
- `POIData`
- `RestaurantData`
- `SeasonalData`
- `GenerationRequest`
- `GenerationContext`
- `ExplorePlanOutput`

## 3. Object Definitions

Each object below defines:

- purpose
- layer
- manual or API ownership
- AI generation permission

### 1. `CityKnowledge`

Purpose:

- represent the city's stable editorial identity
- define city personality, major contrasts, strong districts, and premium route logic

Belongs to:

- Content Knowledge Layer

Manually maintained:

- yes

Comes from API:

- no

Can AI generate it freely:

- no

Notes:

- AI may help draft or summarize, but final ownership should remain human-curated
- this object should define what kind of city product is even worth making

### 2. `SceneKnowledge`

Purpose:

- define scene-level building blocks such as dusk walks, breakfast streets, ceremonial openings, or local-life moments

Belongs to:

- Content Knowledge Layer

Manually maintained:

- yes

Comes from API:

- no

Can AI generate it freely:

- no

Notes:

- this object helps route generation move beyond POI lists
- scenes are one of the strongest premium-quality levers

### 3. `RouteKnowledge`

Purpose:

- define reusable route logic, district pairings, pacing guidance, and route anti-patterns

Belongs to:

- Content Knowledge Layer

Manually maintained:

- yes

Comes from API:

- no

Can AI generate it freely:

- no

Notes:

- route knowledge is editorial and strategic
- map APIs can support feasibility, but not route taste

### 4. `POIKnowledge`

Purpose:

- store premium editorial interpretation of POIs
- explain why a POI matters, what experience it creates, and when it is worth using

Belongs to:

- Content Knowledge Layer

Manually maintained:

- yes

Comes from API:

- partially supported by API, but not owned by API

Can AI generate it freely:

- no

Notes:

- this is different from raw `POIData`
- `POIKnowledge` says why a place matters
- `POIData` says what the place is and whether it is operationally usable

### 5. `FoodKnowledge`

Purpose:

- store food-culture intelligence, meal roles, district eating rhythms, and memory-worthy food logic

Belongs to:

- Content Knowledge Layer

Manually maintained:

- yes

Comes from API:

- partially supported by restaurant APIs, but not owned by them

Can AI generate it freely:

- no

Notes:

- this object should prevent food from collapsing into cuisine labels
- it is one of the strongest anti-generic objects in the future system

### 6. `CityContentStrategy`

Purpose:

- define which motivation-theme-traveler-season combinations are worth generating for a city
- define route bias, must-include logic, avoid logic, food strategy, and memory strategy

Belongs to:

- Content Knowledge Layer

Manually maintained:

- yes

Comes from API:

- no

Can AI generate it freely:

- no

Notes:

- this is the city-level product strategy object
- it should directly guide generation context building

### 7. `TravelMotivation`

Purpose:

- represent why the trip begins
- define the trigger behind traveler intent

Belongs to:

- Content Knowledge Layer

Manually maintained:

- yes

Comes from API:

- no

Can AI generate it freely:

- AI may infer from request, but should not redefine the taxonomy

Notes:

- the taxonomy should be human-defined
- per-request selection may be AI-assisted

### 8. `PlanTheme`

Purpose:

- represent the trip experience type the plan should become

Belongs to:

- Content Knowledge Layer

Manually maintained:

- yes

Comes from API:

- no

Can AI generate it freely:

- AI may select or infer from an approved set, but should not invent unstable theme taxonomies

Notes:

- the theme library should remain controlled
- AI can choose among it, not replace it

### 9. `MapData`

Purpose:

- represent routing, coordinates, travel times, district adjacency, and movement feasibility

Belongs to:

- External Data Layer

Manually maintained:

- no

Comes from API:

- yes

Can AI generate it freely:

- no

Notes:

- this is one of the highest-priority future external objects
- route quality will stay capped without it

### 10. `POIData`

Purpose:

- represent raw factual POI information such as name, coordinates, open status, ticket signals, category, and popularity

Belongs to:

- External Data Layer

Manually maintained:

- no

Comes from API:

- yes

Can AI generate it freely:

- no

Notes:

- this supports candidate selection and operational filtering
- it does not define product worth by itself

### 11. `RestaurantData`

Purpose:

- represent restaurant-level factual data such as location, cuisine, hours, price, reservations, and rating signals

Belongs to:

- External Data Layer

Manually maintained:

- no

Comes from API:

- yes

Can AI generate it freely:

- no

Notes:

- restaurant APIs improve feasibility and freshness
- they do not replace food strategy

### 12. `SeasonalData`

Purpose:

- represent seasonal windows, event timing, weather-sensitive opportunities, and periodic constraints

Belongs to:

- External Data Layer

Manually maintained:

- partially

Comes from API:

- yes, ideally

Can AI generate it freely:

- no

Notes:

- some seasonal framing can be knowledge-based
- timing truth should come from APIs or verified feeds

### 13. `GenerationRequest`

Purpose:

- represent the user-facing generation request
- define traveler, city, days, pace, budget, preferences, and optional strategy hints

Belongs to:

- AI Generation Layer

Manually maintained:

- user-provided or system-created

Comes from API:

- no

Can AI generate it freely:

- no

Notes:

- this object is the entrypoint
- it should stay compact and stable

### 14. `GenerationContext`

Purpose:

- represent the merged generation-time input package
- combine request, knowledge, strategy, and external data into one trusted context object

Belongs to:

- AI Generation Layer

Manually maintained:

- assembled by system, not manually maintained

Comes from API:

- partially, through merged dependencies

Can AI generate it freely:

- no

Notes:

- this is one of the most important future objects
- the model should generate from this object, not from raw disconnected sources

### 15. `ExplorePlanOutput`

Purpose:

- represent the final generated plan artifact
- store the structured travel product returned to the pipeline

Belongs to:

- AI Generation Layer

Manually maintained:

- no

Comes from API:

- no

Can AI generate it:

- yes, but only from trusted context

Notes:

- this is the main AI-produced object
- it should always remain downstream of knowledge and factual checks

## 4. Object Summary Table

```text
Object               | Layer                     | Manual | API | AI Free Generate
CityKnowledge        | Content Knowledge Layer   | Yes    | No  | No
SceneKnowledge       | Content Knowledge Layer   | Yes    | No  | No
RouteKnowledge       | Content Knowledge Layer   | Yes    | No  | No
POIKnowledge         | Content Knowledge Layer   | Yes    | Part| No
FoodKnowledge        | Content Knowledge Layer   | Yes    | Part| No
CityContentStrategy  | Content Knowledge Layer   | Yes    | No  | No
TravelMotivation     | Content Knowledge Layer   | Yes    | No  | Partial select only
PlanTheme            | Content Knowledge Layer   | Yes    | No  | Partial select only
MapData              | External Data Layer       | No     | Yes | No
POIData              | External Data Layer       | No     | Yes | No
RestaurantData       | External Data Layer       | No     | Yes | No
SeasonalData         | External Data Layer       | Part   | Yes | No
GenerationRequest    | AI Generation Layer       | Input  | No  | No
GenerationContext    | AI Generation Layer       | System | Part| No
ExplorePlanOutput    | AI Generation Layer       | No     | No  | Yes, constrained
```

## 5. Data Flow From User Request To Final `plan.json`

The future system should move through a predictable flow.

### Target flow

1. load request
2. load knowledge
3. load city strategy
4. fetch external data
5. build generation context
6. call model
7. validate output
8. save result

### Flow detail

#### 1. Load request

Input object:

- `GenerationRequest`

Responsibility:

- capture traveler type
- capture city
- capture duration
- capture budget
- capture pace
- capture preferences
- capture optional theme or motivation hints

#### 2. Load knowledge

Input objects:

- `CityKnowledge`
- `SceneKnowledge`
- `RouteKnowledge`
- `POIKnowledge`
- `FoodKnowledge`
- `TravelMotivation`
- `PlanTheme`

Responsibility:

- provide stable editorial intelligence
- determine quality constraints before generation starts

#### 3. Load city strategy

Input object:

- `CityContentStrategy`

Responsibility:

- choose the relevant city slice
- choose the best combination pattern
- apply `route_bias`
- apply `must_include`
- apply `avoid`
- apply `food_strategy`
- apply `memory_strategy`

#### 4. Fetch external data

Input objects:

- `MapData`
- `POIData`
- `RestaurantData`
- `SeasonalData`

Responsibility:

- check factual feasibility
- retrieve current candidates
- adjust route possibilities based on reality

#### 5. Build generation context

Output object:

- `GenerationContext`

Responsibility:

- merge the request
- merge the relevant knowledge
- merge the relevant city strategy
- merge the external data
- produce a clean, bounded, model-ready input

This is where trust hierarchy should be resolved before model call.

#### 6. Call model

Input object:

- `GenerationContext`

Output object:

- `ExplorePlanOutput`

Responsibility:

- compose route
- explain choices
- shape summaries
- personalize the plan
- design daily storylines
- express food and memory value

#### 7. Validate output

Input object:

- `ExplorePlanOutput`

Validation modules:

- schema validation
- factual validation
- route validation
- quality validation

Responsibility:

- ensure structure is valid
- ensure output did not violate known constraints
- ensure route is plausible
- ensure premium quality baseline is met

#### 8. Save result

Output artifact:

- final `plan.json`

Responsibility:

- persist validated output
- support downstream review
- support later import or publishing

## 6. Module Ownership Suggestion

To keep the system clean, each object should have a primary owning module.

### Suggested ownership map

```text
knowledge/
  owns: CityKnowledge, SceneKnowledge, RouteKnowledge, POIKnowledge, FoodKnowledge, TravelMotivation, PlanTheme, CityContentStrategy

integrations/
  owns: MapData, POIData, RestaurantData, SeasonalData

generation/
  owns: GenerationRequest, GenerationContext, ExplorePlanOutput

validation/
  owns: validation logic against GenerationContext and ExplorePlanOutput

review/
  owns: human judgment reports and editorial review artifacts

media/
  owns: visual prompts and future cover-generation assets derived from ExplorePlanOutput
```

This should prevent ambiguous ownership such as:

- strategy logic hiding in prompt files only
- route feasibility hiding inside raw model behavior
- food intelligence mixing with restaurant API noise

## 7. API Integration Priority Recommendation

The future system should not integrate all APIs at once.

It should follow priority by product impact.

### `P0` Map API

Why first:

- route feasibility is foundational
- transfer discipline is one of the biggest current quality ceilings
- district clustering and movement logic depend on this layer

What it should unlock:

- walking time
- transfer time
- route adjacency
- route fallback feasibility

### `P1` POI API

Why next:

- stronger POI truth
- better candidate retrieval
- better closure and ticket filtering

What it should unlock:

- factual POI inventory
- operational POI filtering
- current availability awareness

### `P2` Restaurant API

Why after POI:

- food quality is essential, but restaurant freshness matters after route feasibility is stabilized

What it should unlock:

- real restaurant matching
- price-band accuracy
- dining-hours awareness
- reservation and popularity filtering

### `P3` Weather / Seasonal API

Why later:

- very valuable for seasonal plans, but depends on base route and POI infrastructure already being stable

What it should unlock:

- better seasonal timing
- weather-aware route adjustment
- event-driven opportunity selection

### `P4` Image API

Why last:

- image generation improves presentation, not route truth
- it should come after plan quality and factual grounding are reliable

What it should unlock:

- cover-image workflows
- scene-aware visual generation
- media consistency with route identity

## 8. Boundary Rules Before API Integration

Before the future APIs are connected, the system should already know:

- which module would own the data
- which object would represent the data
- whether that data is truth or judgment
- whether AI may speak creatively about it

If these boundaries are not clear first, API integration will create more confusion instead of more capability.

## 9. Success Standard

Travel Data Objects And Modules V1 is successful if future implementation work becomes able to answer:

- where should this data live
- what object should represent it
- who owns its truth
- whether AI can compose it, infer it, or must not touch it

It is not successful if future work still needs to ask:

- should this live in city JSON or prompt text
- is this map truth or editorial knowledge
- can the model invent this field if data is missing

The point of this document is not to make implementation rigid.

It is to make future implementation coherent before maps, POIs, restaurants, weather, and images all start entering the system.
