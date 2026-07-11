import Image from "next/image";

import { getWorkspaceWeatherImage } from "@/lib/trip/workspace-asset-resolver";
import type { WeatherSummary } from "@/lib/trip/types";

interface WeatherAlertCardProps {
  weather: WeatherSummary;
}

export function WeatherAlertCard({ weather }: WeatherAlertCardProps) {
  const weatherImage = getWorkspaceWeatherImage(weather);
  const impactSummary =
    weather.reminders[0] ??
    weather.alerts[0]?.title ??
    "Keep the day flexible if conditions change.";

  return (
    <section
      aria-labelledby="weather-title"
      className={`relative overflow-hidden rounded-[28px] border p-5 sm:p-6 ${
        weather.available
          ? "border-[var(--sage-deep)] bg-[linear-gradient(180deg,rgba(233,243,231,0.98)_0%,rgba(255,253,247,0.98)_100%)]"
          : "border-[var(--sand-deep)] bg-[linear-gradient(180deg,rgba(250,245,231,0.98)_0%,rgba(255,253,247,0.98)_100%)]"
      }`}
    >
      <div className="pointer-events-none absolute right-4 top-4 h-20 w-20 opacity-85 sm:h-24 sm:w-24">
        <Image
          src={weatherImage}
          alt=""
          fill
          aria-hidden
          sizes="96px"
          className="object-contain"
        />
      </div>

      <div className="relative z-[1] flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="workspace-kicker">WEATHER NOTE</p>
          <h2 id="weather-title" className="mt-2 text-2xl font-semibold">
            Travel weather
          </h2>
        </div>
        <span className="inline-flex w-fit max-w-full break-words rounded-full border border-current px-2.5 py-1 text-xs font-semibold">
          {weather.available ? "weather ready" : "weather fallback"}
        </span>
      </div>

      <p className="mt-4 max-w-2xl break-words text-sm leading-7">{weather.overview}</p>

      <div className="mt-4 rounded-[20px] border border-dashed border-[var(--line)] bg-[rgba(255,255,255,0.65)] px-4 py-3">
        <p className="text-xs font-semibold tracking-[0.12em] text-[var(--ink-muted)]">
          TRAVEL IMPACT
        </p>
        <p className="mt-1 text-sm leading-6 text-[var(--ink)]">{impactSummary}</p>
      </div>

      {weather.dailyForecast.length > 0 ? (
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {weather.dailyForecast.map((day) => (
            <article
              key={day.date}
              className="overflow-hidden rounded-[20px] border border-[rgb(37_40_35_/_18%)] bg-[rgb(255_253_247_/_70%)] p-3"
            >
              <p className="break-words font-mono text-xs font-semibold">{day.date}</p>
              <p className="mt-2 break-words text-sm leading-6">{day.summary}</p>
              {day.tempMin !== undefined || day.tempMax !== undefined ? (
                <p className="mt-2 text-xs text-[var(--ink-muted)]">
                  {day.tempMin ?? "--"}°C to {day.tempMax ?? "--"}°C
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {weather.alerts.length > 0 ? (
        <div className="mt-5 rounded-[22px] border border-dashed border-[var(--clay)] bg-[var(--clay-soft)] px-4 py-3">
          <p className="text-sm font-semibold text-[var(--clay-deep)]">
            Official weather alerts
          </p>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-[var(--clay-deep)]">
            {weather.alerts.map((alert) => (
              <li key={`${alert.title}-${alert.startTime ?? ""}`} className="break-words">
                <span className="font-semibold">
                  {alert.title}
                  {alert.level ? ` (${alert.level})` : ""}
                </span>
                : {alert.description}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {weather.reminders.length > 0 ? (
        <ul className="mt-5 space-y-1.5 text-sm leading-6">
          {weather.reminders.map((reminder) => (
            <li key={reminder} className="flex gap-2">
              <span aria-hidden="true">-</span>
              <span className="break-words">{reminder}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-5 break-words border-t border-dashed border-current pt-3 text-xs leading-5 text-[var(--ink-muted)]">
        {weather.dataNote}
      </p>
    </section>
  );
}
