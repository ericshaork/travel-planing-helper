# Travel Data Architecture V1

## Purpose

This document defines the V3.4 Step1 data architecture direction for the future AI travel plan generation system in `travel-content-pipeline`.

It is a design document only.

It does not:

- modify code
- modify schema
- modify prompts
- modify batch generation
- modify city JSON files

The goal is to establish a clean architecture before later integration of:

- map APIs
- image APIs
- POI APIs
- restaurant APIs
- real-time travel constraint feeds

This document should answer:

- what data should be manually curated
- what data should be fetched from external systems
- what work should be done by the generation model
- what information must never be left to free AI invention

## Why V3.4 Is Needed

V3.3 improved content quality through:

- better content structure
- stronger city strategy
- clearer generation guidance
- stronger editorial selectivity

But the future system cannot scale on prompt and city JSON alone.

A premium travel generation system will need three different kinds of intelligence:

- stable editorial knowledge
- dynamic real-world data
- generative composition ability

If these are mixed together carelessly, the system will fail in predictable ways:

- AI will invent operational facts
- external API data will overwhelm editorial quality
- manually curated strategy will become too shallow or too expensive to maintain
- route generation will confuse truth, recommendation, and narrative

So V3.4 needs a formal data architecture layer.

## Core Architecture Principle

The future system should not ask one model to do everything.

It should separate:

- what must be known
- what must be checked
- what may be composed

In simple terms:

- human knowledge defines quality
- external data defines reality
- AI generation defines product expression

## 1. Three-Layer Data System

The future system should be built on three layers:

- Content Knowledge Layer
- External Data Layer
- AI Generation Layer

These layers are not interchangeable.
Each has a different responsibility boundary.

## 2. Content Knowledge Layer

This is the premium-quality layer.

It contains the knowledge that should be manually maintained because it determines whether the final product feels editorially strong or generic.

This layer should be relatively stable, reusable, and opinionated.

It is not mainly about live facts.
It is mainly about travel product judgment.

### Purpose of this layer

- define what kind of trip a city is good at
- define what kind of route logic is premium
- define what kind of scenes are worth building around
- define what kind of food or experience carries memory value
- define what should be avoided, even if it is popular

### This layer should include

#### 1. `city_personality`

This defines the city's strongest editorial identity.

Examples:

- what this city feels like at its best
- what kind of traveler desire it serves best
- what generic framing should be avoided
- what contrasts make the city memorable

This is a human judgment layer.
It should not be delegated to map APIs or free-form model inference.

#### 2. `scene_knowledge`

This defines the kinds of scenes the city can produce.

Examples:

- imperial-scale opening scene
- hutong dusk walking scene
- breakfast-street local scene
- lakeside night atmosphere scene
- industrial-art contrast scene

This is important because premium plans are often built around scenes, not only around POIs.

#### 3. `route_knowledge`

This defines route logic that is worth preserving.

Examples:

- which district pairings feel natural
- what should open a day
- what should close a day
- what route shapes are realistic
- what sequences create emotional payoff
- what sequences look valid on a map but feel weak in product terms

This layer is where editorial route intelligence lives.

#### 4. `experience_knowledge`

This defines what kind of travel experience each place or scene actually creates.

Examples:

- first-arrival grandeur
- local belonging
- relaxed wandering
- couple atmosphere
- family-friendly ease
- destination-worthy food anticipation

This should help the system understand not only where to go, but what the user gets from going there.

#### 5. `food_culture_knowledge`

This defines food as part of travel identity rather than as utility only.

Examples:

- what dishes matter
- what meal types matter
- which districts create strong eating sequences
- what food is memory-worthy
- what food is iconic but low-value
- what dining styles suit different travelers and seasons

This is critical because premium travel planning often fails when food is reduced to cuisine labels.

### What this layer should not try to do

- store every live restaurant detail
- store live queue times
- store live opening hours
- store full map geometry
- store high-frequency operational changes

That kind of data belongs in the external layer.

### Why this layer must be manually maintained

Because this layer decides:

- editorial taste
- product selectivity
- route philosophy
- memory design quality

If this layer is weak, better APIs will only produce more accurate mediocre plans.

## 3. External Data Layer

This is the reality-check layer.

It contains dynamic or semi-dynamic data that should be fetched through APIs or external services rather than manually maintained in prompt-heavy knowledge files.

### Purpose of this layer

- provide live or structured factual data
- reduce unsupported AI guessing
- keep routes grounded in operational reality
- provide scalable POI and restaurant coverage

### This layer should include

#### 1. `map_data`

Examples:

- coordinates
- district boundaries
- transfer distance
- routing time
- walking time
- transit connections

This data should be used for:

- route feasibility
- transfer control
- district clustering
- fallback routing

#### 2. `poi_data`

Examples:

- POI names
- categories
- coordinates
- basic descriptions
- ticket requirement
- opening windows
- popularity signals

This data should support:

- candidate selection
- operational filtering
- route assembly

But it should not define the final editorial value on its own.

#### 3. `restaurant_data`

Examples:

- restaurant names
- cuisine type
- coordinates
- price band
- business hours
- reservation signals
- user rating summaries

This data should support:

- dining feasibility
- price matching
- neighborhood food coverage
- meal decision support

But it should not decide by itself what meal is most worth building around.

#### 4. `seasonal_events`

Examples:

- blossom periods
- foliage windows
- local festivals
- exhibition cycles
- seasonal markets
- weather-sensitive experience windows

This layer is necessary because seasonal content should change route value, not just route wording.

#### 5. `real_time_constraints`

Examples:

- temporary closures
- ticket sellout risk
- event-driven crowd spikes
- weather disruption
- transport interruptions
- queue abnormality

This is the highest-volatility part of the system.
It should override weaker or older knowledge when necessary.

### What this layer should not try to do

- decide editorial theme
- decide what kind of memory a trip should create
- decide whether a route is emotionally worth saving
- replace city content strategy

External data improves truth.
It does not automatically improve taste.

## 4. AI Generation Layer

This is the composition layer.

This is where DeepSeek or a future model should operate.

Its job is not to invent the world.
Its job is to turn structured knowledge plus real-world data into a coherent travel product.

### DeepSeek should be responsible for

#### 1. `route_composition`

The model should:

- choose among valid candidate areas
- compose route order
- balance pace and density
- adapt route logic to traveler, motivation, and theme
- convert guidance into a usable itinerary

This is composition, not factual invention.

#### 2. `explanation`

The model should:

- explain why a route works
- explain why a stop belongs
- explain why a meal matters
- explain trade-offs clearly

This is where AI adds usability and confidence.

#### 3. `storytelling`

The model should:

- shape daily arcs
- create readable summaries
- design memory points
- connect city scenes into a coherent trip feeling

This is where AI turns data into product.

#### 4. `personalization`

The model should:

- adapt the route to traveler type
- adapt framing to motivation
- adapt density to pace
- adapt food role to traveler need
- adapt emphasis to seasonal context

This is where the same city becomes different products for different users.

### DeepSeek should not be responsible for

- inventing POIs
- inventing restaurants
- inventing opening hours
- inventing route durations
- inventing ticket requirements
- inventing seasonal windows
- inventing district-level truth

The model should compose from inputs, not hallucinate reality.

## 5. Data Priority Rules

The future system should follow one explicit trust hierarchy:

- real-time API
- curated knowledge base
- AI inference

In short:

`real-time API > manual knowledge base > AI guess`

### Priority interpretation

#### 1. Real-time API wins on volatile facts

If live data says a place is closed, crowded, moved, or seasonally inactive, that should override older editorial assumptions.

#### 2. Manual knowledge wins on product judgment

If live data says ten restaurants are open, the knowledge layer still decides which kind of meal is worth structuring the route around.

#### 3. AI inference is fallback only

AI may connect dots when information is incomplete.
It may not silently replace unavailable truth with confident fabrication.

### Example rule

- live API can say whether a museum is open today
- knowledge base can say whether that museum is actually worth a first-time couple itinerary
- AI can decide whether today is the right day to place it in the route

## 6. Future Module Boundaries

The future system should be divided into clear modules.

At minimum:

- `knowledge`
- `integrations`
- `generation`

### 1. `knowledge`

This module should manage:

- city personality
- scene knowledge
- route knowledge
- experience knowledge
- food culture knowledge
- content matrix
- city content strategy
- quality rules

Its job is to protect premium taste and reusable editorial logic.

### 2. `integrations`

This module should manage:

- map API clients
- POI API clients
- restaurant API clients
- weather and seasonal feeds
- event feeds
- real-time constraint aggregation

Its job is to fetch, normalize, cache, and rank factual external data.

### 3. `generation`

This module should manage:

- prompt assembly
- structured input packaging
- model invocation
- route composition logic
- explanation generation
- output validation

Its job is to convert trustworthy inputs into a travel product.

### Optional future submodules

- `ranking`: score candidate routes or POIs before generation
- `validation`: run factual and structural checks after generation
- `memory_design`: explicitly control memorable moments and trip-retell quality
- `media`: connect image prompts and later image APIs to route identity

## 7. Information That Must Not Be Freely Generated By AI

Some information should never be left to free AI invention.

This is one of the most important architecture boundaries.

### The model must not freely generate

#### 1. live operational facts

Examples:

- opening hours
- queue lengths
- live pricing
- closure status
- reservation availability

#### 2. unsupported place existence

Examples:

- restaurants that may not exist
- POIs that are mislocated
- invented scene names
- fabricated venue-level details

#### 3. route feasibility facts

Examples:

- exact transfer time
- exact walking duration
- exact transit sequence

These should come from maps or be described conservatively.

#### 4. seasonal availability

Examples:

- blossom timing
- foliage peak
- temporary exhibitions
- seasonal food availability

#### 5. safety-critical or compliance-critical guidance

Examples:

- accessibility claims
- child-safety assumptions
- transport closure assumptions
- weather-risk certainty

### The model may generate

- recommendation framing
- route trade-off explanation
- summary language
- traveler-specific prioritization
- day story arcs
- memory point wording

So the model is allowed to generate product expression.
It is not allowed to generate unstable facts as if they were verified.

## 8. Suggested Data Flow For Future System

A future generation request should ideally flow like this:

1. Load traveler request.
2. Load content knowledge for city and relevant themes.
3. Fetch external data for current route candidates.
4. Merge and rank candidate city slices.
5. Pass trusted inputs into the generation layer.
6. Generate route, explanation, food framing, and storytelling.
7. Validate output against known constraints.
8. Save structured product output.

This means generation should happen after knowledge selection and data retrieval, not before.

## 9. Architecture Success Standard

Travel Data Architecture V1 is successful if the future system becomes able to say:

- this part is editorial truth
- this part is live factual truth
- this part is AI composition

It is not successful if the system still blurs:

- facts and recommendations
- APIs and taste
- dynamic data and static strategy
- human knowledge and model hallucination

The final goal is not just a smarter generator.

It is a generator that knows:

- what must be curated
- what must be checked
- what may be composed

That is the foundation required before connecting maps, POIs, restaurants, images, and other future travel data systems.
