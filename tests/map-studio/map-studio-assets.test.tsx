import fs from "node:fs";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MapStudioAssetImage } from "../../components/map-studio/MapStudioAssetImage";
import {
  cityCoverAssets,
  getCityCoverAsset,
  getPlaceImageAsset,
  getRegionImageAsset,
  mapStateAssets,
  mapStudioButtonSkins,
  mapStudioCoreIcons,
  mapStudioAssets,
  mapStudioMarkerIcons,
  mapStudioNavIcons,
  mapStudioScheduleIcons,
  mapStudioStatusIcons,
  mapStudioToolbarIcons,
  markerAssets,
  placeImageAssets,
  regionImageAssets,
  routePreviewAssets,
} from "../../lib/map-studio/assets";

describe("Map Studio asset registry", () => {
  it("reserves the expected public asset directories", () => {
    const root = path.join(process.cwd(), "public", "assets", "map-studio");

    expect(fs.existsSync(path.join(root, "icons"))).toBe(true);
    expect(fs.existsSync(path.join(root, "cities"))).toBe(true);
    expect(fs.existsSync(path.join(root, "regions"))).toBe(true);
    expect(fs.existsSync(path.join(root, "places"))).toBe(true);
    expect(fs.existsSync(path.join(root, "states"))).toBe(true);
    expect(fs.existsSync(path.join(root, "markers"))).toBe(true);
    expect(fs.existsSync(path.join(root, "route-preview"))).toBe(true);
    expect(fs.existsSync(path.join(root, "button-assets"))).toBe(true);
    expect(fs.existsSync(path.join(root, "ui-assets-batch-2"))).toBe(true);
  });

  it("exports stable paths for images, buttons, markers, states, and future route preview assets", () => {
    expect(mapStudioAssets.buttonSkins.text.base).toBe(
      mapStudioButtonSkins.text.base,
    );
    expect(mapStudioButtonSkins.text.hover).toBe(
      "/assets/map-studio/button-assets/buttons/text-button-hover.svg",
    );
    expect(mapStudioButtonSkins.icon.selected).toBe(
      "/assets/map-studio/button-assets/buttons/icon-button-selected.svg",
    );
    expect(mapStudioCoreIcons.region).toBe(
      "/assets/map-studio/button-assets/icons/core/region.svg",
    );
    expect(mapStudioToolbarIcons.zoomIn).toBe(
      "/assets/map-studio/button-assets/icons/toolbar/zoom-in.svg",
    );
    expect(mapStudioAssets.statusIcons.days).toBe(mapStudioStatusIcons.days);
    expect(mapStudioStatusIcons.budget).toBe(
      "/assets/map-studio/ui-assets-batch-2/icons/status/budget.svg",
    );
    expect(mapStudioNavIcons.wanderlyLogo).toBe(
      "/assets/map-studio/ui-assets-batch-2/icons/nav/wanderly-logo.svg",
    );
    expect(mapStudioScheduleIcons.writeIn).toBe(
      "/assets/map-studio/ui-assets-batch-2/icons/schedule/write-in.svg",
    );
    expect(mapStudioAssets.cities.shenzhen).toBe(cityCoverAssets.shenzhen);
    expect(regionImageAssets.shekouSeaWorld).toBe(
      "/assets/map-studio/regions/shekou_sea_world.jpg",
    );
    expect(placeImageAssets.windowOfTheWorld).toBe(
      "/assets/map-studio/places/window_of_the_world.jpg",
    );
    expect(mapStateAssets.emptyCandidates).toBe(
      "/assets/map-studio/states/empty_candidates.svg",
    );
    expect(markerAssets.foodMarker).toBe(
      "/assets/map-studio/markers/food_marker.svg",
    );
    expect(mapStudioMarkerIcons.candidate).toBe(
      "/assets/map-studio/markers/markers/marker-candidate.svg",
    );
    expect(mapStudioAssets.markerIcons.planned).toBe(
      mapStudioMarkerIcons.planned,
    );
    expect(routePreviewAssets.traveler).toBe(
      "/assets/map-studio/route-preview/traveler.glb",
    );
  });

  it("keeps the extracted button asset files available in public", () => {
    const root = path.join(
      process.cwd(),
      "public",
      "assets",
      "map-studio",
      "button-assets",
    );
    const expectedFiles = [
      "buttons/text-button-base.svg",
      "buttons/text-button-hover.svg",
      "buttons/text-button-selected.svg",
      "buttons/text-button-disabled.svg",
      "buttons/text-button-danger.svg",
      "buttons/icon-button-base.svg",
      "buttons/icon-button-hover.svg",
      "buttons/icon-button-selected.svg",
      "buttons/icon-button-disabled.svg",
      "buttons/icon-button-danger.svg",
      "icons/core/region.svg",
      "icons/core/place.svg",
      "icons/core/route.svg",
      "icons/core/import.svg",
      "icons/core/ai.svg",
      "icons/core/favorite.svg",
      "icons/core/food.svg",
      "icons/core/hotel.svg",
      "icons/toolbar/zoom-in.svg",
      "icons/toolbar/zoom-out.svg",
      "icons/toolbar/locate.svg",
      "icons/toolbar/layers.svg",
      "icons/toolbar/filter.svg",
      "icons/toolbar/measure.svg",
      "icons/toolbar/box-select.svg",
      "icons/toolbar/reset.svg",
      "icons/toolbar/help.svg",
    ];

    expect(
      expectedFiles.every((file) => fs.existsSync(path.join(root, file))),
    ).toBe(true);
  });

  it("keeps the extracted readable UI icon files available in public", () => {
    const root = path.join(
      process.cwd(),
      "public",
      "assets",
      "map-studio",
      "ui-assets-batch-2",
    );
    const expectedFiles = [
      "icons/status/days.svg",
      "icons/status/budget.svg",
      "icons/status/candidate.svg",
      "icons/status/planned.svg",
      "icons/status/density.svg",
      "icons/status/save.svg",
      "icons/status/version.svg",
      "icons/status/city.svg",
      "icons/nav/back.svg",
      "icons/nav/workspace.svg",
      "icons/nav/account.svg",
      "icons/nav/itinerary.svg",
      "icons/nav/settings.svg",
      "icons/nav/exit.svg",
      "icons/nav/wanderly-logo.svg",
      "icons/schedule/day.svg",
      "icons/schedule/morning.svg",
      "icons/schedule/afternoon.svg",
      "icons/schedule/night.svg",
      "icons/schedule/add-candidate.svg",
      "icons/schedule/write-in.svg",
      "icons/schedule/undo.svg",
      "icons/schedule/route.svg",
      "icons/schedule/import.svg",
      "styles/map-studio-readable-buttons.css",
    ];

    expect(
      expectedFiles.every((file) => fs.existsSync(path.join(root, file))),
    ).toBe(true);
  });

  it("keeps the extracted Map Studio marker icon files available in public", () => {
    const root = path.join(
      process.cwd(),
      "public",
      "assets",
      "map-studio",
      "markers",
    );
    const expectedFiles = [
      "markers/marker-attraction.svg",
      "markers/marker-food.svg",
      "markers/marker-hotel.svg",
      "markers/marker-transport.svg",
      "markers/marker-favorite.svg",
      "markers/marker-candidate.svg",
      "markers/marker-planned.svg",
      "markers/marker-unresolved.svg",
      "README.md",
    ];

    expect(
      expectedFiles.every((file) => fs.existsSync(path.join(root, file))),
    ).toBe(true);
  });

  it("resolves curated Shenzhen region and place ids to future image paths", () => {
    expect(getCityCoverAsset("深圳")).toBe(cityCoverAssets.shenzhen);
    expect(getRegionImageAsset("futian_center")).toBe(
      regionImageAssets.futianCenter,
    );
    expect(getPlaceImageAsset("sz-place-sea-world")).toBe(
      placeImageAssets.seaWorld,
    );
  });

  it("renders a quiet fallback when an asset path is not available", () => {
    const markup = renderToStaticMarkup(
      <MapStudioAssetImage alt="待接入资产" fallbackLabel="pending" />,
    );

    expect(markup).toContain('role="img"');
    expect(markup).toContain("pending");
  });
});
