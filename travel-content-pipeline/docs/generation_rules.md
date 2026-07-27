# Generation Rules

## Goal

The generator should produce executable Explore travel plans, not generic travel攻略.

Each output should help a reader understand:

- where to go
- in what order
- at what pace
- for which traveler type
- with what budget expectations

## Core Principles

### 1. Generate a plan, not a list

- Output should feel like a route with narrative flow
- The user should understand the recommended sequence of the day
- Each day should have a clear rhythm instead of a pile of disconnected POIs

### 2. Avoid ordinary攻略写法

- Do not write broad city introductions that could fit any trip
- Do not produce “必打卡景点清单” style content without route logic
- Do not fill space with generic food or shopping mentions that lack trip relevance

### 3. Emphasize execution

- Route structure must be explicit in `daily_itinerary`
- Day arrangement should reflect realistic movement between areas
- Time blocks should imply a feasible day rather than an overloaded checklist
- POI and food references should support the actual route, not sit outside it

### 4. Show traveler differences

- `family` plans should reduce friction and favor comfort, safety, and kid-friendly pacing
- `couple` plans should emphasize atmosphere, shared moments, and emotional scenes
- `student` plans should be cost-aware, lively, and socially usable
- `solo` plans should feel flexible, clear, and independently manageable

### 5. Show budget differences

- `low` should feel deliberate and affordable, not deprived
- `medium` should balance experience quality and practicality
- `high` should improve comfort or distinctiveness without becoming empty luxury language

### 6. Show city specificity

- The plan should reflect the city’s local texture, not only famous landmarks
- Include neighborhood feel, local food logic, and route mood where relevant
- If the same structure could be copied to another city with only POI names swapped, it is not strong enough

## Required Output Characteristics

- Clear title with scene and angle
- Concise summary that states who the plan is for and why it works
- Structured daily itinerary
- POI selection with explicit recommendation reasons
- Food recommendations tied to route context
- Stable tags that support later filtering and analysis

## Prohibited Tendencies

- Generic template copy with weak city identity
- Excessive slogan-like wording
- Overpacked routes that ignore travel time
- POIs chosen only for fame without relevance to traveler type
- Food suggestions that are too broad to act on
- Text that sounds like scraped攻略 rather than crafted Explore content

## Practical Writing Standard

Good generation should make an editor think:

- “I can imagine the actual route.”
- “I know who this is for.”
- “This feels like this city, not any city.”
- “The plan has a reason for existing.”
