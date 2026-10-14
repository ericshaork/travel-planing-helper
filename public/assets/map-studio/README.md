# Map Studio Assets

This directory reserves replaceable asset slots for Wanderly Map Studio. The
current phase should not store generated images or 3D models here; the files
listed below are naming targets for future design handoff.

## Directory Roles

- `icons/`: Map Studio tool and command icons, such as region, place, route,
  import, AI, favorite, food, hotel, layers, filter, measure, lasso, reset, and
  help.
- `cities/`: city entry cover images, such as Shenzhen, Beijing, Shanghai,
  Hangzhou, Xian, Chengdu, Guangzhou, and Xiamen.
- `regions/`: travel hotspot detail images, such as shekou_sea_world,
  shenzhen_bay_houhai, oct_huaqiaocheng, futian_center, luohu_dongmen,
  dapeng_coast, and yantian_seaside.
- `places/`: specific place detail images, such as window_of_the_world,
  happy_coast, shenzhen_bay_park, sea_world, and ping_an_finance_center.
- `states/`: empty, loading, and unavailable states.
- `markers/`: map marker icons for places, candidates, planned stops, food,
  hotels, and transport.
- `route-preview/`: reserved future route preview animation assets. This is
  only a naming slot for now; no 3D runtime is connected.

## Naming Rules

- Use lowercase names.
- Prefer `snake_case` for image and model filenames in this directory.
- City covers: `city_name.jpg`.
- Region images: `region_name.jpg`.
- Place images: `place_name.jpg`.
- Icons and state illustrations: `semantic_name.svg`.
- Future 3D models: `semantic_name.glb` or `semantic_name.gltf`.

## Size And Format Guidance

- City cover: `1600x900`, `.jpg` or `.webp`.
- Region detail: `1200x800`, `.jpg` or `.webp`.
- Place detail: `1200x800`, `.jpg` or `.webp`.
- Empty/loading state: SVG preferred.
- Icons: SVG preferred.
- Route preview 3D: GLB/GLTF only after the route-preview feature is scoped.

## Replacement Workflow

1. Add the real asset at the path already declared in
   `lib/map-studio/assets.ts`.
2. Keep filenames stable so existing registry keys do not change.
3. If a key is renamed, update both the registry and any curated Map Studio
   data that references the key.
4. Missing files are allowed during early development; Map Studio UI must use
   `MapStudioAssetImage` or another safe fallback wrapper when rendering these
   paths.

## Current Guardrails

- Do not place full-page mockups here as runtime backgrounds.
- Do not add generated bitmap images during the placeholder phase.
- Do not add 3D models until a route-preview implementation plan is approved.
