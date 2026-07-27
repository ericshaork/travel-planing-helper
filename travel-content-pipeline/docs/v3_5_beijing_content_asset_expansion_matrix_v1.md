# V3.5 Step1-E2-A Beijing Content Asset Expansion Matrix V1

## 1. Purpose

This document defines the first expansion matrix for:

`input/content_assets_v1/beijing/`

It does not create a large new JSON batch.

It does not modify:

- selector logic
- `GenerationContext`
- output schema
- validation
- prompt
- generation flow

The goal is to answer one planning question before expansion work starts:

- what kinds of Beijing content assets are still missing
- which missing assets matter most for sample differentiation
- how large Beijing Content Asset Library V1 should become

## 2. Background

The Wanderly content pipeline already has:

```text
Request
-> Context Selector
-> GenerationContext
-> DeepSeek
-> Validation
-> Output
```

It also already has a map-grounding layer:

```text
Map Asset
-> Map Resolver
-> GenerationContext
```

And it now has a seed editorial layer:

```text
Content Asset Library v1
```

Current Beijing seed assets:

- `forbidden_city.json`
- `baita_temple.json`
- `niujie.json`
- `art_798.json`

These four assets are directionally useful, but not yet enough to materially reduce sample repetition across:

- couple
- student
- solo

## 3. Why Expansion Matrix Is Needed

If the team expands assets ad hoc, two risks appear quickly:

- random place accumulation without role balance
- more assets, but not meaningfully more route variation

So Beijing should not expand by “adding more places.”

It should expand by “filling editorial role gaps.”

This matrix is meant to make the expansion controlled, explainable, and directly useful for future selector upgrades.

## 4. Content Asset vs Map Asset

The distinction should remain explicit:

```text
Content Asset = why go
Map Asset = how to get there
```

### Content Asset

Content Asset answers:

- why this place should enter a premium route
- which traveler it fits
- what editorial role it fills
- in which season or pacing condition it becomes strong

### Map Asset

Map Asset answers:

- where it is
- whether it is verified
- how movement works between places
- what transfer burden the route creates

The expansion matrix only concerns the content layer.

It does not expand the map layer.

## 5. Current 4-Seed Coverage Analysis

### Current seed assets

1. `Forbidden City`
2. `White Pagoda Temple`
3. `Niujie`
4. `798 Art District`

### What these four already cover

- one strong first-visit imperial signature anchor
- one slower historic texture slice
- one food-backbone asset
- one modern contrast asset

### What they do not cover yet

- sunset / romantic closure assets for couple routes
- alternate old-city texture assets beyond one quiet neighborhood slice
- multiple food systems beyond Niujie
- solo-specific reflective assets beyond one cultural texture node
- seasonal assets that change Beijing route behavior
- enough route clusters to create genuinely different 3-day sample structures

### Why repetition still happens

The current seed set is role-diverse but numerically too small.

That means future selection still tends to collapse toward:

- one landmark default
- one food default
- one modern default

This is enough to prove the schema, but not enough to support route diversity.

## 6. Beijing Content Asset Classification System

Beijing Content Asset Library V1 should expand around at least these six classes:

1. Signature Anchor
2. Historic Texture
3. Food Backbone
4. Modern Contrast
5. Slow / Solo Assets
6. Seasonal Assets

These classes are not mutually exclusive in schema terms.

An asset may belong to one primary class while also supporting a secondary role.

But for expansion planning, each asset should have one dominant editorial job.

## 7. Expansion Matrix

### 7.1 Signature Anchor

#### Content role

- carries first-impression clarity
- gives the route recognizable Beijing identity
- anchors opener or major half-day structure

#### Recommended quantity

- 5 assets

#### Current already present

- Forbidden City

#### Gap

- current signature layer is too dependent on one imperial anchor
- first-visit routes need more than one high-confidence symbolic backbone

#### Candidate assets

- Temple of Heaven
- Jingshan Park
- Summer Palace
- Qianmen Central Axis Edge

### 7.2 Historic Texture

#### Content role

- makes Beijing feel lived-in rather than checklist-driven
- supports side-street rhythm, old-city grain, and editorial pacing contrast
- prevents routes from becoming landmark stacking

#### Recommended quantity

- 7 assets

#### Current already present

- White Pagoda Temple

#### Gap

- too few old-city texture options
- not enough alternate neighborhood logic for couple vs solo vs revisit behavior

#### Candidate assets

- Shichahai Lakeside
- Gulou
- Nanluoguxiang peripheral hutong texture
- Dashilar side streets
- Yangmeizhuxie street texture
- Fayuan Temple edge / old south-city calm slice

### 7.3 Food Backbone

#### Content role

- lets food shape route structure instead of becoming filler
- supports student differentiation strongly
- provides day-value anchors beyond sightseeing

#### Recommended quantity

- 6 assets

#### Current already present

- Niujie

#### Gap

- one food cluster cannot support enough route variation
- couple / student / solo need different food logic

#### Candidate assets

- Guijie late-day food strip
- Huguosi snack cluster
- Qianmen traditional snack / noodle cluster
- Sanlitun casual social food cluster
- Cafe / bakery micro-cluster in Dashilar

### 7.4 Modern Contrast

#### Content role

- prevents Beijing from reading only as imperial or historic
- gives younger, student, and solo routes a second city face
- creates tonal contrast in multi-day sequencing

#### Recommended quantity

- 4 assets

#### Current already present

- 798 Art District

#### Gap

- one creative district is not enough to support multiple modern route expressions

#### Candidate assets

- Sanlitun urban energy slice
- Liangma River evening modern walk
- CBD skyline / contemporary city window

### 7.5 Slow / Solo Assets

#### Content role

- supports solitary rhythm
- provides reflection, pause, browsing, and observation value
- reduces pressure to make every segment a sightseeing climax

#### Recommended quantity

- 4 assets

#### Current already present

- White Pagoda Temple partially covers this

#### Gap

- solo routes still lack enough “linger” assets
- current pool is too eventful and not pause-oriented enough

#### Candidate assets

- National Art Museum / contemporary exhibition pause
- Bookstore-cafe texture cluster
- Temple-side quiet walk asset
- Museum / courtyard calm slice with strong browse value

### 7.6 Seasonal Assets

#### Content role

- gives selector explicit assets that become much stronger in one season
- helps prevent same-route behavior across spring, autumn, and winter
- turns season from copywriting detail into selection logic

#### Recommended quantity

- 4 assets

#### Current already present

- Niujie has winter strength
- Forbidden City has broad four-season viability

#### Gap

- no explicit seasonal pool yet
- current assets are not enough to drive season-aware route branching

#### Candidate assets

- Ginkgo-focused autumn walk asset
- Winter warming food-and-street asset
- Spring blossom / lighter walking asset
- Summer evening water-edge relief asset

## 8. Suggested V1 Library Size

Beijing Content Asset Library V1 should target:

- about 30 assets

This is large enough to:

- support real variation
- cover multiple editorial roles
- let selector logic branch

But still small enough to:

- remain manually curated
- remain quality-controlled
- remain interpretable

### Suggested count by class

- Signature Anchor: 5
- Historic Texture: 7
- Food Backbone: 6
- Modern Contrast: 4
- Slow / Solo Assets: 4
- Seasonal Assets: 4

Total:

- 30 assets

This number is appropriate for a first usable city asset library.

## 9. Priority Plan

### P0: Support regeneration of the three Beijing premium samples

P0 is for assets that most directly help couple / student / solo diverge more clearly.

#### P0 goals

- reduce over-reliance on one landmark backbone
- give student routes more food-led variety
- give solo routes more slow / texture-led choices
- give couple routes more evening / mood / closure options

#### Recommended P0 asset types

- additional signature anchors
- historic texture anchors
- food backbone assets
- one or two slow / solo anchors

#### Recommended P0 candidate focus

- Temple of Heaven
- Jingshan Park
- Shichahai
- Dashilar side streets
- Gulou
- Qianmen food / texture edge
- Huguosi snack cluster
- one romantic evening asset

#### Recommended P0 size

- 10 to 12 assets total

### P1: Enrich route variation

P1 is for widening editorial combinations after the core regeneration problem is improved.

#### P1 goals

- support more distinct 3-day and 5-day route mixes
- strengthen modern / old-city contrast handling
- expand non-first-visit and alternative slices

#### Recommended P1 candidate focus

- Sanlitun
- Liangma River
- alternate hutong texture zones
- additional food-led micro-clusters
- museum / browsing / culture pause assets

#### Recommended P1 size

- 10 more assets

### P2: Future-oriented expansion

P2 is for assets that are useful later but not required to unlock immediate sample differentiation.

#### P2 goals

- expand seasonal depth
- support family or broader traveler expansion
- add narrower niche slices

#### Recommended P2 candidate focus

- season-specific walks
- additional outer-city or low-frequency assets
- special-use reflective or neighborhood slices

#### Recommended P2 size

- remaining 8 to 10 assets

## 10. Recommended First 30-Asset Shape

Below is one reasonable first-pass shape for Beijing V1.

### Signature Anchor

- Forbidden City
- Temple of Heaven
- Jingshan Park
- Summer Palace
- Qianmen Central Axis Edge

### Historic Texture

- White Pagoda Temple
- Shichahai Lakeside
- Gulou
- Dashilar Side Streets
- Yangmeizhuxie
- Nanluo Peripheral Hutong Texture
- Old South-City Calm Slice

### Food Backbone

- Niujie
- Huguosi Snack Cluster
- Qianmen Traditional Food Cluster
- Guijie
- Dashilar Cafe / Bakery Cluster
- Sanlitun Casual Social Food Cluster

### Modern Contrast

- 798 Art District
- Sanlitun Urban Energy Slice
- Liangma River Evening Modern Walk
- CBD Contemporary Window

### Slow / Solo Assets

- White Pagoda Temple
- Bookstore-Cafe Texture Slice
- Quiet Temple-Side Walk
- Museum / Courtyard Browse Asset

### Seasonal Assets

- Autumn Ginkgo Walk Asset
- Winter Warming Street Asset
- Spring Blossom Walk Asset
- Summer Evening Water-Edge Relief Asset

Note:

- some assets can conceptually overlap across categories
- the matrix is about planning balance, not forcing one-to-one taxonomy purity

## 11. How This Supports The Three Beijing Samples

### Couple

Needs stronger access to:

- mood transition
- sunset closure
- evening walk assets
- low-friction symbolic anchors

Current four-seed set is too weak on romantic closure and evening memory.

### Student

Needs stronger access to:

- food backbone variety
- budget-value clusters
- lively but flexible urban energy
- compact half-day assets

Current four-seed set is too narrow on food and youth-oriented route branching.

### Solo

Needs stronger access to:

- slower texture
- pause assets
- browse / observe / wander assets
- less-scripted neighborhood logic

Current four-seed set proves the direction but does not yet provide enough solo branching options.

## 12. Relationship To Existing Architecture

The intended future architecture remains:

```text
Request
-> Context Selector
   -> City Strategy
   -> Content Asset Library
   -> Map Asset Library
-> GenerationContext
-> DeepSeek
-> Validation
-> Output
```

This matrix only affects:

- what content assets should exist

It does not yet affect:

- how selector scores them
- how generation context serializes them
- how validation interprets them

That separation is intentional.

## 13. Success Standard

This expansion matrix is successful if it gives the next implementation step a clear answer to:

- what classes are missing
- how many assets each class should contain
- which assets are urgent for sample regeneration
- how Beijing reaches a first usable 30-asset library

It is not successful if the next step still expands by:

- random interesting places
- landmark accumulation
- unbalanced category growth

The matrix exists to make the expansion editorially structured, not merely larger.

