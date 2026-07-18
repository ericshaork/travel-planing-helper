# City Knowledge Schema

## Purpose

City Knowledge Layer is a provider-independent destination knowledge layer for Image Pipeline.

It does not:
- generate prompts
- generate images
- choose providers
- manage assets

It does:
- define destination identity
- describe non-replaceable visual assets
- provide bilingual visual grounding
- support human review, CMS display, and future prompt construction
- reduce generic travel-image collapse

## Position In Future Flow

```text
plan.json
  ↓
destination
  ↓
City Knowledge Pack
  ↓
Scene
  ↓
Prompt Builder
  ↓
Image Provider
```

## Why Bilingual

City Knowledge Pack must now support three parallel use cases:

1. Product display and editorial review
2. Prompt grounding for image generation
3. Visual explanation of why an asset matters

Recommended interpretation:
- `zh` fields:
  For website display, Chinese editors, manual review, and internal management
- `en` fields:
  For future prompt builder, provider adapters, and image-model grounding
- `visual_description_*` fields:
  For explaining what the asset looks like visually, not just naming it

## Schema Overview

Each city knowledge pack should contain:

1. Base identity
2. City identity
3. Core visual assets
4. Generative constraints
5. Optional editorial notes
6. Metadata

## Suggested Structure

```json
{
  "city_id": "hangzhou",
  "city_name": {
    "zh": "杭州",
    "en": "Hangzhou"
  },
  "province": {
    "zh": "浙江",
    "en": "Zhejiang"
  },
  "country": {
    "zh": "中国",
    "en": "China"
  },
  "identity": {
    "identity_keywords": [
      {
        "zh": "",
        "en": ""
      }
    ],
    "visual_character": [
      {
        "zh": "",
        "en": ""
      }
    ]
  },
  "visual_assets": {
    "landmarks": [
      {
        "name_zh": "",
        "name_en": "",
        "visual_description_zh": "",
        "visual_description_en": ""
      }
    ],
    "architecture": [],
    "food": [],
    "craft_and_culture": [],
    "nature": []
  },
  "generation_constraints": {
    "must_include_when_relevant": [
      {
        "zh": "",
        "en": ""
      }
    ],
    "avoid_generic_patterns": [
      {
        "zh": "",
        "en": ""
      }
    ]
  },
  "editorial_notes": {
    "cover_bias": [
      {
        "zh": "",
        "en": ""
      }
    ],
    "scene_balance_notes": [
      {
        "zh": "",
        "en": ""
      }
    ]
  },
  "metadata": {
    "version": "v2",
    "source_type": "manual_curated_bilingual"
  }
}
```

## Base Fields

```json
{
  "city_id": "string",
  "city_name": {
    "zh": "string",
    "en": "string"
  },
  "province": {
    "zh": "string",
    "en": "string"
  },
  "country": {
    "zh": "string",
    "en": "string"
  }
}
```

- `city_id`:
  Stable internal identifier for loaders and mappers
- `city_name.zh`:
  Product-facing Chinese destination name
- `city_name.en`:
  Prompt-facing English destination name
- `province` / `country`:
  Stored in bilingual form for both display and generation contexts

## Identity Fields

```json
{
  "identity": {
    "identity_keywords": [
      {
        "zh": "江南水城",
        "en": "jiangnan water city"
      }
    ],
    "visual_character": [
      {
        "zh": "雾气中的横向水面层次",
        "en": "misty horizontal water layers"
      }
    ]
  }
}
```

- `identity_keywords`:
  Short semantic identity tags
- `visual_character`:
  Image-oriented appearance phrases

These are not scene instructions yet.
They are city-level identity anchors.

## Visual Asset Object Structure

All core visual asset categories now use object arrays.

```json
{
  "name_zh": "龙井茶园",
  "name_en": "Longjing tea terraces",
  "visual_description_zh": "层叠茶垄、山坡小径、晨雾和柔和绿色",
  "visual_description_en": "layered tea fields, hillside paths, morning mist and soft green tones"
}
```

### Why This Structure

- `name_zh`:
  Useful for editors, reviewers, content managers
- `name_en`:
  Useful for prompt grounding and model-facing text generation
- `visual_description_zh`:
  Helps human reviewers understand visual intent quickly
- `visual_description_en`:
  Helps future prompt builder enrich sparse scene prompts with concrete visual detail

## Core Visual Asset Categories

```json
{
  "visual_assets": {
    "landmarks": [VisualAsset],
    "architecture": [VisualAsset],
    "food": [VisualAsset],
    "craft_and_culture": [VisualAsset],
    "nature": [VisualAsset]
  }
}
```

- `landmarks`:
  Destination-defining spatial icons
- `architecture`:
  Built-form and material identity
- `food`:
  Visually distinctive dishes, ingredients, tableware, or food scenes
- `craft_and_culture`:
  Ritual, performance, craft, objects, and material culture
- `nature`:
  Terrain, vegetation, atmosphere, and non-urban visual identity

## Generation Constraints

```json
{
  "generation_constraints": {
    "must_include_when_relevant": [
      {
        "zh": "",
        "en": ""
      }
    ],
    "avoid_generic_patterns": [
      {
        "zh": "",
        "en": ""
      }
    ]
  }
}
```

- `must_include_when_relevant`:
  Guardrails for preventing destination drift when a scene depends on a specific local asset
- `avoid_generic_patterns`:
  Destination-specific failure modes and cliches

These are bilingual because both reviewers and prompt builders need them.

## Editorial Notes

```json
{
  "editorial_notes": {
    "cover_bias": [
      {
        "zh": "",
        "en": ""
      }
    ],
    "scene_balance_notes": [
      {
        "zh": "",
        "en": ""
      }
    ]
  }
}
```

- `cover_bias`:
  What tends to work well for Explore covers
- `scene_balance_notes`:
  Manual editorial guidance for keeping cover sets diverse

## Authoring Principles

- Write for image generation and editorial review, not travel-guide narration.
- Prefer concrete visual nouns over abstract tourism phrasing.
- Make every asset understandable in both Chinese and English.
- Use `visual_description` to explain appearance, texture, color, shape, or atmosphere.
- Avoid generic phrases like `beautiful scenery`.

## Old vs New

Old:

```json
"landmarks": [
  "West Lake causeways"
]
```

New:

```json
"landmarks": [
  {
    "name_zh": "西湖长堤",
    "name_en": "West Lake causeways",
    "visual_description_zh": "横向延展的长堤、垂柳、水雾和远山层次",
    "visual_description_en": "long linear causeways with willow edges, light mist, calm water, and distant hills"
  }
]
```

## Relationship To Scene Layer

City Knowledge Layer answers:
- `What visually belongs to this city?`

Scene Layer answers:
- `Which specific cover scene are we selecting this time?`

Future reading pattern:
- Scene chooses the local story unit
- City Knowledge supplies validated visual vocabulary
- Prompt Builder can read:
  - `zh` for UI/editor display
  - `en` for provider/model prompt grounding
  - `visual_description_en` to enrich composition detail

## Future Integration Ideas

When integration starts, City Knowledge can support:
- scene validation against destination truth
- scene enrichment with local visual details
- bilingual review workflows
- provider-agnostic prompt grounding
- anti-generic city safeguards
