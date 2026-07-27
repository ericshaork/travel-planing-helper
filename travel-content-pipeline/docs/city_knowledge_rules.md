# City Knowledge Rules

## Purpose

This document defines how `travel-content-pipeline` should understand a city when generating Explore travel plans.

The goal is to reduce three common failure modes:

- repeated landmark selection
- weak differences between traveler types
- missing city character

This is a knowledge rule document only. It does not change current code, schema, or prompts by itself.

## Core Principle

A city cannot be understood only through hot attractions.

Good Explore generation should understand at least four layers:

- the city’s core temperament
- its distinctive districts and neighborhood roles
- its food culture and eating patterns
- which areas fit which traveler types

If generation only knows “top attractions,” outputs will quickly become repetitive and generic.

## What City Understanding Should Cover

### 1. Core city temperament

Each city should be understood as a specific urban experience, not just a destination name.

Examples of useful questions:

- Is the city historic, leisurely, modern, rugged, coastal, mountainous, commercial, or slow-living?
- Does the city feel best in the morning, at night, in old streets, by the waterfront, or through food scenes?
- Is its strongest appeal culture, everyday life, scenery, atmosphere, or lifestyle?

This layer helps avoid flat plans built only around famous POIs.

### 2. District structure

A city should be broken into meaningful areas, not just administrative names.

Useful district understanding includes:

- historic core
- daily-life neighborhoods
- food-heavy areas
- nightlife zones
- shopping and youth areas
- family-friendly zones
- scenic waterfront or mountain areas

The generator should know not only what is in a district, but what kind of trip that district supports.

### 3. Food culture

Food should not be treated as a generic add-on.

City food understanding should include:

- signature flavors or styles
- meal timing patterns
- snack culture vs sit-down meal culture
- whether food scenes are best in morning markets, lunch streets, late-night alleys, or destination restaurants
- which districts are best for different food experiences

This helps avoid repetitive “recommended food area” output with little local meaning.

### 4. Traveler-type fit by area

Different traveler types should map to different urban zones and rhythms.

The same city should not produce nearly identical plans for all audiences.

## Trip Type Selection Logic

### family

Primary priorities:

- comfort
- safety
- low movement cost
- predictable rhythm
- easy meal access

Area preference:

- places with convenient transport and low route friction
- parks, waterfronts, broad walking areas, family-friendly museums, and gentle cultural stops
- districts where rest, food, and toilets are easy to access

Avoid:

- overly dense transfers
- nightlife-centered routing
- long cross-city jumps
- too many niche stops with low payoff

### couple

Primary priorities:

- atmosphere
- shared experience
- photogenic scenes
- memorable pacing
- evening value

Area preference:

- waterfronts, historic streets, scenic walking zones, view points, intimate food areas, and night scenes
- neighborhoods with mood, texture, and date-friendly rhythm

Avoid:

- purely functional sightseeing lists
- too many similar museum or landmark stops
- routes with weak emotional flow

### student

Primary priorities:

- budget awareness
- lively neighborhoods
- local fun
- flexible and social pacing

Area preference:

- youth districts, affordable food streets, local hangout areas, creative neighborhoods, low-cost citywalk zones
- places where spending can stay moderate without losing experience quality

Avoid:

- luxury-heavy recommendations
- overly formal or premium experiences with weak youth relevance
- routes that feel like standard textbook tourism

### solo

Primary priorities:

- freedom
- clarity
- manageable route design
- citywalk value
- niche discovery

Area preference:

- walkable districts
- layered neighborhoods
- places that reward observation, wandering, and independent pacing
- areas with strong everyday life texture or exploratory value

Avoid:

- plans that depend on “shared atmosphere” as the only value
- family-style comfort routing
- excessive transfer complexity

## Anti-Repetition Rules

To reduce repeated POI selection, city knowledge should distinguish between:

- must-know landmarks
- strong-but-secondary city character spots
- neighborhood texture areas
- food-driven areas
- mood or atmosphere zones

A city plan should not always start from the same two or three famous places.

Useful diversity mechanisms include:

- rotating between landmark-led and neighborhood-led routes
- changing day focus by traveler type
- varying between culture-heavy, food-heavy, and atmosphere-heavy structures
- using different districts as route anchors

## City Character Rules

A strong city plan should answer:

- What makes this city feel like itself?
- Which parts of the city best express that feeling?
- How does that change for family, couple, student, and solo travelers?

Weak city understanding usually looks like:

- famous attractions only
- no neighborhood texture
- no food culture logic
- same routing skeleton for all trip types

## Future City Context Requirements

Future city context should contain more than simple POI lists.

Recommended structure:

### City summary

- city temperament summary
- strongest Explore-worthy qualities
- what kind of trip the city is best at

### District map

- district name
- district role
- best for which traveler types
- best time of day
- route pairing suggestions

### POI knowledge

- landmark level
- mood or experience type
- best traveler fit
- nearby route pairings
- realistic recommended duration

### Food knowledge

- signature food styles
- best districts for food
- snack vs full meal scenes
- morning, afternoon, evening, late-night suitability
- best fit by traveler type

### Traveler-type notes

- family route guidance
- couple route guidance
- student route guidance
- solo route guidance

### Route strategy

- easy district combinations
- high-friction combinations to avoid
- good half-day anchors
- best one-day and two-day route structures

### Seasonal or timing notes

- day vs night strengths
- weekday vs weekend crowd differences when relevant
- weather-sensitive areas when relevant

## Practical Standard

Better city knowledge should make generation more likely to produce:

- less repetitive POI choices
- clearer traveler-specific differences
- stronger local identity
- more believable route design

If a city context cannot support those outcomes, it is not rich enough for strong Explore generation.
