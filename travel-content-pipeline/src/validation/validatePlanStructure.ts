import type { ExplorePlan } from "../types.js";

export function validatePlanStructure(plan: ExplorePlan): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (plan.daily_itinerary.length !== plan.days) {
    errors.push(`daily_itinerary length ${plan.daily_itinerary.length} does not match days ${plan.days}`);
  }

  const dayNumbers = plan.daily_itinerary.map((item) => item.day);
  const uniqueDayNumbers = new Set<number>();
  for (const dayNumber of dayNumbers) {
    if (uniqueDayNumbers.has(dayNumber)) {
      errors.push(`duplicate day number: ${dayNumber}`);
    }
    uniqueDayNumbers.add(dayNumber);
  }

  const expectedDayNumbers = Array.from({ length: plan.days }, (_, index) => index + 1);
  const sequential =
    dayNumbers.length === expectedDayNumbers.length &&
    dayNumbers.every((dayNumber, index) => dayNumber === expectedDayNumbers[index]);
  if (!sequential) {
    errors.push(`day numbers must be sequential 1..${plan.days}, got ${dayNumbers.join(",")}`);
  }

  const seenTitles = new Set<string>();
  const seenSummaries = new Set<string>();
  for (const item of plan.daily_itinerary) {
    if (seenTitles.has(item.title)) {
      errors.push(`duplicate day title: ${item.title}`);
    }
    seenTitles.add(item.title);

    if (seenSummaries.has(item.summary)) {
      errors.push(`duplicate day summary: ${item.summary}`);
    }
    seenSummaries.add(item.summary);

    if (item.activities.length === 0) {
      errors.push(`day ${item.day} has empty activities`);
    }
  }

  const knownPoiIds = new Set(plan.pois.map((poi) => poi.id));
  const knownFoodIds = new Set(plan.food.map((food) => food.id));

  for (const item of plan.daily_itinerary) {
    for (const activity of item.activities) {
      for (const poiRef of activity.poi_refs) {
        if (!knownPoiIds.has(poiRef)) {
          errors.push(`unknown poi_ref: ${poiRef}`);
        }
      }

      for (const foodRef of activity.food_refs) {
        if (!knownFoodIds.has(foodRef)) {
          errors.push(`unknown food_ref: ${foodRef}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
