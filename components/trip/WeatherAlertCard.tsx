import type { WeatherSummary } from "@/lib/trip/types";

interface WeatherAlertCardProps {
  weather: WeatherSummary;
}

export function WeatherAlertCard({ weather }: WeatherAlertCardProps) {
  return (
    <section
      aria-labelledby="weather-title"
      className={`overflow-hidden border p-5 sm:p-6 ${
        weather.available
          ? "border-[var(--sage-deep)] bg-[var(--sage-soft)]"
          : "border-[var(--sand-deep)] bg-[var(--sand-soft)]"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.14em] text-[var(--ink-muted)]">
            出门前看一眼
          </p>
          <h2 id="weather-title" className="mt-2 text-2xl font-semibold">
            天气提醒
          </h2>
        </div>
        <span className="inline-flex w-fit max-w-full break-words border border-current px-2.5 py-1 text-xs font-semibold">
          {weather.available ? "已有天气数据" : "未接入实时天气"}
        </span>
      </div>

      <p className="mt-4 break-words text-sm leading-7">{weather.overview}</p>

      {weather.dailyForecast.length > 0 ? (
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {weather.dailyForecast.map((day) => (
            <article
              key={day.date}
              className="overflow-hidden border border-[rgb(37_40_35_/_18%)] bg-[rgb(255_253_247_/_55%)] p-3"
            >
              <p className="break-words font-mono text-xs font-semibold">{day.date}</p>
              <p className="mt-2 break-words text-sm leading-6">{day.summary}</p>
              {day.tempMin !== undefined || day.tempMax !== undefined ? (
                <p className="mt-2 text-xs text-[var(--ink-muted)]">
                  {day.tempMin ?? "--"}°C 至 {day.tempMax ?? "--"}°C
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {weather.alerts.length > 0 ? (
        <div className="mt-5 border-l-2 border-[var(--clay)] bg-[var(--clay-soft)] px-4 py-3">
          <p className="text-sm font-semibold text-[var(--clay-deep)]">
            官方天气预警
          </p>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-[var(--clay-deep)]">
            {weather.alerts.map((alert) => (
              <li key={`${alert.title}-${alert.startTime ?? ""}`} className="break-words">
                <span className="font-semibold">
                  {alert.title}
                  {alert.level ? `（${alert.level}）` : ""}
                </span>
                ：{alert.description}
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
