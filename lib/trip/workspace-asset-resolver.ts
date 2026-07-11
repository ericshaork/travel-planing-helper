import type { TransportMode, WeatherSummary } from "./types";

export function getWorkspaceWeatherImage(weather: WeatherSummary) {
  const text = [
    weather.overview,
    ...weather.reminders,
    ...weather.dailyForecast.map((day) => day.summary),
    ...weather.alerts.map((alert) => `${alert.title} ${alert.description}`),
  ]
    .join(" ")
    .toLowerCase();

  if (text.includes("thunder")) {
    return "/images/ui/weather/thunderstorm.png";
  }

  if (text.includes("typhoon")) {
    return "/images/ui/weather/typhoon.png";
  }

  if (text.includes("snow") || text.includes("ice")) {
    return "/images/ui/weather/snowy.png";
  }

  if (text.includes("rain") || text.includes("shower")) {
    return "/images/ui/weather/rainy.png";
  }

  if (text.includes("hot") || text.includes("heat")) {
    return "/images/ui/weather/hot.png";
  }

  if (text.includes("cloud")) {
    return "/images/ui/weather/cloudy.png";
  }

  return "/images/ui/weather/sunny.png";
}

export function getWorkspaceTransportImage(mode?: TransportMode) {
  switch (mode) {
    case "flight":
      return "/images/ui/transport/elements/vehicles/airplane-vintage.png";
    case "train":
    case "high_speed_rail":
      return "/images/ui/transport/elements/vehicles/train-high-speed-modern.png";
    case "bus":
      return "/images/ui/transport/elements/vehicles/bus-vintage-green.png";
    case "ship":
      return "/images/ui/transport/elements/vehicles/ferry-boat-coastal.png";
    default:
      return "/images/ui/transport/elements/misc/traveler-on-road.png";
  }
}

export function getWorkspaceTransportScene(mode?: TransportMode) {
  switch (mode) {
    case "flight":
      return "/images/ui/transport/scenes/airport-window-plane.png";
    case "train":
    case "high_speed_rail":
      return "/images/ui/transport/scenes/mountain-train-view.png";
    case "bus":
      return "/images/ui/transport/scenes/tram-city-street.png";
    case "ship":
      return "/images/ui/transport/scenes/coastal-ferry-view.png";
    default:
      return "/images/ui/transport/scenes/traveler-walking-town.png";
  }
}
