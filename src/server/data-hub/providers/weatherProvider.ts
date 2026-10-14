import "server-only";

import { BaseDataHubProvider, providerUnavailableResult, type ProviderResult, type WeatherContext, type WeatherContextInput } from "./providerTypes";

export class WeatherDataHubProvider extends BaseDataHubProvider {
  id = "qweather";
  displayName = "Weather provider";
  capabilities = {
    getWeatherContext: true,
  };

  constructor(readonly options: { apiKey: string | null; baseUrl: string | null; provider: string | null }) {
    super();
  }

  getWeatherContext(_input: WeatherContextInput): Promise<ProviderResult<WeatherContext>> {
    if (!this.options.apiKey && !this.options.provider) {
      return Promise.resolve(providerUnavailableResult(this.id, "getWeatherContext", "未配置天气 provider，无法获取天气上下文。"));
    }

    return Promise.resolve({
      ok: false,
      provider: this.id,
      reason: "unsupported",
      message: "天气 provider adapter 已预留，本轮不调用外部天气 API。",
      missingFields: [],
    });
  }
}
