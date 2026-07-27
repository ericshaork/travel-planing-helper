# Beijing City Content Strategy V1

## Purpose

This document defines the first premium Explore content strategy for Beijing in `travel-content-pipeline`.

It is a design document only.

It does not:

- modify code
- modify schema
- modify prompts
- modify batch generation

The goal is to make future Beijing Explore generation strategy-led rather than random.

This document should help later generation answer:

- what kind of city Beijing should be packaged as
- which content combinations are most worth generating first
- which combinations should be deprioritized or avoided
- how each high-value combination should behave

## Why Beijing Needs A City Strategy Layer

Beijing is not a difficult city because it lacks content.
It is difficult because it has too much content and too many default-generation traps.

Common failure modes include:

- turning Beijing into a famous-landmark checklist
- treating all districts as interchangeable sightseeing zones
- using food as a weak supporting note
- generating the same imperial route for every traveler type
- producing routes that are structurally correct but emotionally flat

So Beijing needs one more layer above city context and matrix rules:

- city-level premium content strategy

This layer should decide not only what Beijing contains, but what kind of travel product Beijing should become.

## 1. Beijing Content Positioning

Beijing should not be packaged as:

- a pile of famous attractions
- a generic history city
- a standard capital-city weekend

Beijing is strongest when packaged as a city of layered contrast and editorially chosen experiences.

Its premium value comes from combining:

- imperial scale
- lived neighborhood texture
- meaningful citywalking
- serious food identity
- strong day-to-night atmosphere change
- deep revisit potential

### Beijing's strongest travel experience directions

#### 1. First-time capital impression

Beijing is one of the best cities in China for building a strong first-arrival memory.

What it sells:

- city gravity
- historic scale
- recognizable symbols
- a feeling of "this trip counts"

What it should avoid:

- landmark stacking without rhythm

#### 2. Hutong and lake texture

Beijing is unusually strong at selling urban texture through hutong, side streets, courtyard rhythm, and lakeside transitions.

What it sells:

- neighborhood atmosphere
- walking pleasure
- retellable local details
- relaxed but not empty city experience

What it should avoid:

- vague lifestyle drift with no route backbone

#### 3. Food-led city desire

Beijing can support food-first content better than a generic "try local dishes" frame suggests.

What it sells:

- ritual meals
- regional classics
- snack-to-dinner progression
- food tied to district mood

What it should avoid:

- cuisine labels without actual eating strategy

#### 4. Day-to-night urban contrast

Beijing is strong when a route uses contrast intentionally.

What it sells:

- imperial and modern
- quiet lane and nightlife energy
- museum calm and dinner scene payoff
- broad capital image and intimate neighborhood memory

What it should avoid:

- random juxtaposition with long transfers

#### 5. Seasonal symbolic experience

Beijing has strong seasonal packaging power when timing actually changes the route.

What it sells:

- autumn city color and crisp walking weather
- winter monument atmosphere and warming meals
- spring parks and open-air pacing

What it should avoid:

- unchanged route plus decorative seasonal wording

#### 6. Revisit and deeper-cut Beijing

Beijing has unusually high revisit value because mainstream symbols and deeper layers are clearly separable.

What it sells:

- second-trip confidence
- less obvious districts
- more selective rhythm
- stronger editorial taste

What it should avoid:

- repeating first-visit classics with softer wording

## 2. Beijing Strategy Principles

### 1. Beijing should be selective, not comprehensive

A premium Beijing plan should not try to "cover Beijing."

It should choose a clear slice of Beijing and make that slice feel worth the trip.

### 2. Beijing is strongest when memory is designed through contrast

Strong Beijing plans should often create contrast between:

- grand and intimate
- day and night
- heritage and contemporary
- formal landmark and casual food texture

### 3. Food must be upgraded from support layer to route layer

Weak Beijing plans mention food.
Strong Beijing plans organize parts of the day around food payoff.

### 4. Transfer discipline is part of premium quality

Beijing is large.
So route ambition without transfer control creates fake premium output.

### 5. Autumn should be treated as Beijing's flagship season

Beijing can generate in all seasons, but autumn should be treated as the highest-confidence premium season for first-wave content.

## 3. First Batch Of 20 High-Value Content Combinations

The first batch should prioritize combinations that are:

- clearly differentiated
- strongly Beijing-specific
- likely to create save-worthy output
- reusable as future series anchors

Each combination below follows:

- City x Motivation x Theme x Traveler x Season

### 1. Beijing x First Visit x First-Time City Signature x Solo x Autumn

- priority: `A`
- route_bias: signature-first, district-clustered, high-impression but not overloaded
- must_include: one imperial anchor, one city-view or symbolic closing moment, one hutong texture segment
- avoid: Forbidden City plus too many additional heavy-ticket sites in one day, far-district zigzagging, generic shopping filler
- food_strategy: one reliable Beijing classic meal plus one lighter snack stop near a walking segment
- memory_strategy: strong first-arrival capital memory with one unmistakable Beijing image

### 2. Beijing x First Visit x First-Time City Signature x Couple x Autumn

- priority: `A`
- route_bias: city-signature route with stronger atmosphere and dusk emphasis
- must_include: one landmark anchor, one scenic dusk transition, one dinner-worthy finish
- avoid: efficiency-first museum stacking, overly early closure, rushed east-west cross-city movement
- food_strategy: one atmosphere-led dinner plus one low-friction daytime food pause
- memory_strategy: "this is how we first saw Beijing together" memory

### 3. Beijing x Weekend Escape x Local Texture Citywalk x Couple x Autumn

- priority: `A`
- route_bias: low-transfer, walkable, mood-first, afternoon-to-night rhythm
- must_include: one hutong-walk core, one lake or street atmosphere close, one worthwhile dinner
- avoid: checklist landmarks, heavy reservation dependency, overpacked morning
- food_strategy: one casual local snack layer plus one atmosphere-driven dinner anchor
- memory_strategy: shared neighborhood atmosphere and night-walk memory

### 4. Beijing x Weekend Escape x Local Texture Citywalk x Solo x Autumn

- priority: `A`
- route_bias: slow urban observation, independent walking comfort, flexible stop-in rhythm
- must_include: one texture-rich neighborhood block, one quiet coffee or pause point, one dusk visual moment
- avoid: couple-coded romantic packaging, long-ticket dependencies, route over-structuring
- food_strategy: solo-friendly small eating sequence rather than one oversized formal meal
- memory_strategy: personal city-belonging and self-paced walking memory

### 5. Beijing x Food Hunting x Food-Led Exploration x Friends x Winter

- priority: `A`
- route_bias: meal-anchored, warmth-seeking, short-transfer, appetite-first routing
- must_include: one destination-worthy meal, one snack cluster, one evening food scene
- avoid: food stops separated by inefficient district jumps, weak "nearby can eat" filler, long cold outdoor gaps
- food_strategy: layered eating from snacks to strong dinner with winter-appropriate comfort value
- memory_strategy: "we came for this bite" memory with strong post-trip retell value

### 6. Beijing x Food Hunting x Food-Led Exploration x Couple x Winter

- priority: `A`
- route_bias: food-first with atmosphere, slower pace, dinner payoff stronger than attraction count
- must_include: one date-worthy dinner, one warming daytime food stop, one walkable pre-dinner district
- avoid: attraction overload that weakens appetite, generic chain-safe fallback tone, late-night far transfer
- food_strategy: one serious meal as trip anchor plus one texture-rich snack or dessert stop
- memory_strategy: meal-centered winter Beijing memory

### 7. Beijing x Anniversary / Special Moment x Romance and Atmosphere x Couple x Autumn

- priority: `A`
- route_bias: memory-first, low-friction, dusk-to-night strengthened, scenic pacing over coverage
- must_include: one celebratory dinner, one photo-worthy atmospheric walk, one strong closing scene
- avoid: educational-route tone, multi-museum density, hard logistical choreography
- food_strategy: reservation-worthy dinner or meal experience with occasion value
- memory_strategy: one highly stable couple memory and one image worth keeping

### 8. Beijing x Anniversary / Special Moment x Romance and Atmosphere x Couple x Winter

- priority: `A`
- route_bias: compact, warm, intimate, indoors-outdoors balance with night finish
- must_include: one winter-atmosphere walk, one warm meal anchor, one low-effort scenic close
- avoid: long exposed outdoor blocks, daytime-only route logic, tourist-crowd crush points at peak hours
- food_strategy: warmth and intimacy first, with dinner carrying emotional payoff
- memory_strategy: enclosed winter-city intimacy memory

### 9. Beijing x Family Holiday x Family Ease and Shared Experience x Family with Kids x Autumn

- priority: `A`
- route_bias: low-friction, restable, broad-space plus light landmark mix
- must_include: one child-tolerable big scene, one open or low-pressure movement block, one easy meal setup
- avoid: queue-heavy monument stacking, all-day walking punishment, adult-aesthetic-only choices
- food_strategy: predictable waiting time, family-safe dishes, seating-friendly meal design
- memory_strategy: everyone participated, no one collapsed family memory

### 10. Beijing x Family Holiday x Family Ease and Shared Experience x Multi-generation x Autumn

- priority: `A`
- route_bias: comfort-controlled, symbolic-but-not-exhausting, seating and mobility aware
- must_include: one recognizably Beijing scene, one low-intensity shared stroll, one easy-access meal
- avoid: stairs-heavy sequencing, multiple transfer stress, niche scenes with low shared payoff
- food_strategy: broad acceptability, reservation-aware, rest-oriented pacing support
- memory_strategy: family-together capital memory rather than niche taste display

### 11. Beijing x Seasonal Experience x Seasonal Limited-Time Experience x Couple x Autumn

- priority: `A`
- route_bias: season-first, walking-friendly, photo-timed, low-overstuffing
- must_include: one clear autumn-value scene, one visually rewarding walk, one seasonal atmosphere dinner zone
- avoid: generic all-season route with autumn adjectives, indoor-heavy substitution, multiple distant foliage gambles
- food_strategy: food supports seasonal pacing and dusk close rather than dominating the day
- memory_strategy: limited-time autumn Beijing memory

### 12. Beijing x Seasonal Experience x Seasonal Limited-Time Experience x Solo x Autumn

- priority: `A`
- route_bias: season-sensitive solo wandering with strong scenic timing discipline
- must_include: one autumn anchor, one reflective citywalk section, one calm closing stop
- avoid: family-oriented crowd magnets at peak time, itinerary over-density, too many photo-stop claims
- food_strategy: lightweight but intentional, with one seasonally suitable sit-down recovery meal
- memory_strategy: solitary seasonal immersion memory

### 13. Beijing x Revisit / Deep Exploration x Local Texture Citywalk x Solo x Spring

- priority: `A`
- route_bias: deeper-cut neighborhood exploration, slower observation, no obligation to replay icons
- must_include: one less-default district angle, one lived-city texture segment, one food stop with local credibility
- avoid: first-visit classic core route, symbolic overcorrection, generic "hidden gem" language
- food_strategy: food as local proof rather than spectacle
- memory_strategy: "I know Beijing more deeply now" memory

### 14. Beijing x Revisit / Deep Exploration x Urban Contrast Journey x Solo x Autumn

- priority: `A`
- route_bias: contrast-led, editorially sharp, one old-city layer plus one modern-city counterpoint
- must_include: one heritage texture block, one contemporary contrast block, one thoughtful transition
- avoid: contrast for contrast's sake, cross-city fatigue, too many contrast claims in one day
- food_strategy: one meal that marks the urban shift clearly
- memory_strategy: layered-city contrast memory

### 15. Beijing x Revisit / Deep Exploration x Urban Contrast Journey x Couple x Autumn

- priority: `A`
- route_bias: selective contrast with stronger atmosphere and dinner payoff
- must_include: one intimate old-city section, one polished modern-night section, one evening transition
- avoid: tourist-core repetition, office-district dead zones, contrast without emotional progression
- food_strategy: dinner should complete the contrast narrative, not sit outside it
- memory_strategy: "old Beijing to new Beijing in one trip" shared memory

### 16. Beijing x First Visit x Urban Contrast Journey x Friends x Autumn

- priority: `B`
- route_bias: iconic introduction plus one modern-energy layer
- must_include: one recognizable capital scene, one social-energy night block, one easy group meal
- avoid: trying to represent all of Beijing's contrasts at once, multiple heavy daytime ticket sites
- food_strategy: one group-friendly dinner that benefits from night-scene adjacency
- memory_strategy: broad first-impression plus social city-energy memory

### 17. Beijing x Weekend Escape x Romance and Atmosphere x Couple x Spring

- priority: `B`
- route_bias: light, scenic, low-pressure, couple-first pacing
- must_include: one scenic walking window, one soft evening close, one meal with atmosphere value
- avoid: route logic copied from anniversary plans without occasion value, crowd-heavy midday landmark core
- food_strategy: one date-friendly meal plus one lighter scenic stop
- memory_strategy: relaxed spring closeness memory

### 18. Beijing x Food Hunting x Food-Led Exploration x Solo x Winter

- priority: `B`
- route_bias: efficient solo eating path with minimal cold-transfer waste
- must_include: one signature meal, one snack-rich segment, one warm indoor reset point
- avoid: friend-group sharing logic, oversized route radius, attraction filler to justify meals
- food_strategy: smaller but sharper food sequence optimized for solo execution
- memory_strategy: food-quest accomplishment memory

### 19. Beijing x Family Holiday x First-Time City Signature x Parents x Autumn

- priority: `B`
- route_bias: symbolic and respectful, slower pace, comfort-first first-visit structure
- must_include: one major Beijing symbol, one manageable walk, one stable sit-down meal
- avoid: youth-coded nightlife substitution, aggressive museum density, late-evening transfer burden
- food_strategy: dependable classic meal with low confusion and low waiting risk
- memory_strategy: first Beijing capital impression with ease and dignity

### 20. Beijing x Seasonal Experience x First-Time City Signature x Friends x Winter

- priority: `B`
- route_bias: iconic winter-city framing with compact execution
- must_include: one cold-season visual landmark moment, one warming meal, one early-night close
- avoid: long outdoor exposure, all-day monument marching, spring-autumn route reuse
- food_strategy: warming and social, with one stronger communal meal
- memory_strategy: dramatic winter-capital first impression

## 4. Which Combinations Should Be Prioritized

The first-wave generation priority should be:

- `A` combinations first
- `B` combinations after the `A` library becomes stable
- `C` combinations only for controlled expansion or gap-filling

### Priority generation groups for Beijing

#### Group 1: First-visit flagship content

Generate first:

- Combination 1
- Combination 2

Reason:

- they define Beijing's broadest premium entry point
- they are highly save-worthy
- they can become baseline quality references for later variants

#### Group 2: Weekend texture content

Generate first:

- Combination 3
- Combination 4

Reason:

- they solve the "not just landmark list" problem directly
- they are highly reusable for urban premium positioning

#### Group 3: Food-first Beijing content

Generate first:

- Combination 5
- Combination 6

Reason:

- they upgrade food from support layer to motivation layer
- they create stronger differentiation versus generic Beijing guides

#### Group 4: Occasion and atmosphere content

Generate first:

- Combination 7
- Combination 8

Reason:

- they create high save intent
- they force stronger memory design and anti-template discipline

#### Group 5: Family-safe premium content

Generate first:

- Combination 9
- Combination 10

Reason:

- family routes are often weak in default generation
- these combinations can become strong quality-control anchors

#### Group 6: Seasonal and revisit premium content

Generate first:

- Combination 11
- Combination 12
- Combination 13
- Combination 14
- Combination 15

Reason:

- they create higher editorial depth
- they are important for avoiding one-version-only Beijing

## 5. Which Combinations Are Not Recommended

Beijing should not generate every logical combination.

The following types should generally be treated as `C` or avoided entirely unless there is a clear product need.

### 1. Weak motivation-theme mismatch

Examples:

- `Anniversary / Special Moment` x `First-Time City Signature` when the route becomes checklist-heavy
- `Family Holiday` x `Urban Contrast Journey` when contrast logic creates transfer fatigue
- `Revisit / Deep Exploration` x `First-Time City Signature` when it simply repeats mainstream classics

### 2. Traveler-theme mismatch

Examples:

- solo routes written with couple-coded atmosphere logic
- family routes built around nightlife closure
- parents routes using youth-energy evening structure by default

### 3. Season-theme mismatch

Examples:

- summer routes that copy autumn walking density
- winter routes that overuse long outdoor scenic walking
- seasonal routes with no actual seasonal route change

### 4. Transfer-heavy contrast content

Avoid:

- plans that try to show imperial core, 798, Olympic Park, and Sanlitun in one compressed day
- plans that mistake geographic sprawl for editorial richness

### 5. Generic hidden-gem packaging

Avoid:

- "小众北京" outputs with weak actual route logic
- revisit routes that only swap famous landmarks for random minor POIs

## 6. Suggested Non-Priority Combination Patterns

The following patterns should usually not enter the first-wave premium generation library:

- Beijing x Anniversary / Special Moment x Family Ease and Shared Experience x Solo x any season
- Beijing x Revisit / Deep Exploration x First-Time City Signature x any traveler x any season
- Beijing x Family Holiday x Romance and Atmosphere x family with kids x any season
- Beijing x Seasonal Experience x Seasonal Limited-Time Experience x all travelers x all season
- Beijing x Weekend Escape x First-Time City Signature x all travelers x peak summer

These patterns are not impossible.
They are simply weak uses of Beijing's premium content potential.

## 7. Strategy Success Standard

Beijing City Content Strategy V1 is successful if later generation no longer feels like:

- random Beijing guide output
- same landmarks with different titles
- same citywalk with different adjectives
- same food mentions attached to every route

It is successful if Beijing output starts to feel like:

- a curated first-visit capital product
- a real hutong-and-texture city product
- a food-motivated city product
- a strong seasonal city product
- a deep revisit city product

If future Beijing plans still read like:
"famous places, reasonable route, generic copy"
then the strategy layer is still not strong enough.
