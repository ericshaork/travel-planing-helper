# TECH_DESIGN v1.2.5：mobile 选项网格与 Qwen 真实 AI 冒烟

## 1. 文档定位

本文是 `v1.2.5` 的增量技术设计。

- `v1.0` 的基础 Provider、API、Schema、安全和错误处理，以 `docs/TECH_DESIGN.md` 为准
- `v1.1` 的重排与积木修改，以 `docs/TECH_DESIGN_v1.1.md` 为准
- `v1.2` 的 mobile flow、Cabinet 和 Pending Changes，以 `docs/TECH_DESIGN_v1.2.md` 为准

`v1.2.5` 只覆盖两条主线：

- mobile 固定选项网格补丁
- Qwen 真实 AI 冒烟接入

当前已进入阶段 3：不再新增功能，只做真实 AI 冒烟记录、文档收口和部署准备。

## 2. mobile 基线

阶段 1 已完成：

- `InterestSelector`、`TravelStyleSelector` 和同类固定偏好组在 mobile 下改为网格
- `/plan` 继续保留三步问卷
- 缺失字段摘要、点击定位和日期/天数自动补全逻辑保持不变
- desktop 布局不回退

## 3. 真实 AI 链路

### 3.1 Provider 选择

真实模式继续复用现有 Provider 选择逻辑：

```ts
if (environment.USE_MOCK_AI) {
  return new MockLLMProvider();
}

return new OpenAICompatibleProvider({
  baseUrl: environment.LLM_BASE_URL,
  apiKey: environment.LLM_API_KEY,
  model: environment.LLM_MODEL,
  timeoutMs: environment.LLM_TIMEOUT_MS,
});
```

结论：

- `USE_MOCK_AI=true` 只走 Mock
- `USE_MOCK_AI=false` 才走真实 Qwen
- 不新增 `QwenProvider`
- 不静默回退 Mock

### 3.2 OpenAI-compatible 边界

真实 Qwen 通过 `OpenAICompatibleProvider` 调用 OpenAI-compatible `chat/completions`：

- `LLM_BASE_URL`
- `LLM_API_KEY`
- `LLM_MODEL`
- `LLM_TIMEOUT_MS`

说明：

- `LLM_BASE_URL` 可以是版本根路径，也可以是完整 `/chat/completions`
- Provider 负责做 URL 归一化，避免重复拼接
- 默认超时为 `120000`

## 4. parse-trip 设计

`parse-trip` 的真实链路是：

```text
原始输出
-> extract JSON
-> unwrap 常见包裹层
-> 字段 normalize
-> ParseTripResponse schema validate
-> 失败时 repair 一次
-> 再次 normalize + validate
```

已处理的兼容点：

- Markdown 代码块
- JSON 前后说明文字
- `data / result` 包裹
- 常见字段名漂移
- `days / budget / interests / travelStyles` 类型归一化
- 不完整日期不写进 `startDate / endDate`

## 5. generate-trip 设计

`generate-trip` 的真实链路是：

```text
原始输出
-> extract JSON
-> unwrap 常见包裹层
-> TripPlan 入口 normalize
-> GenerateTripResponse / TripPlan validate
-> 失败时 repair 一次
-> 再次 normalize + validate
```

### 5.1 unwrap

已兼容：

- Markdown 代码块
- JSON 前后说明文字
- `tripPlan`
- `plan`
- `data`
- `result`

### 5.2 normalize

在进入 schema 校验前，只做轻量兼容，不改公共 schema。

当前兼容：

- `weatherSummary.dailyForecast[].summary` 缺失时补短句
- `weatherSummary.dailyForecast[]` 缺字段时优先复用传入的 `weatherForecast` 同索引数据
- `transportAdvice.options[].mode` 做枚举映射

交通枚举映射规则：

- `飞机 / 航班` -> `flight`
- `火车` -> `train`
- `高铁 / 动车` -> `high_speed_rail`
- `公交 / 大巴` -> `bus`
- `船 / 轮渡` -> `ship`
- `地铁 / 打车 / 出租车 / 网约车 / 步行 / 公交地铁 / 其他未知` -> `other`

### 5.3 repair

`generate-trip` repair 的目标明确是最终 `TripPlan`，不是 `ParseTripResponse`。

repair 约束：

- 只返回最终 `TripPlan` JSON 对象
- 不返回 `data / result / plan / tripPlan` 包裹
- 不返回 Markdown
- 不返回解释文字
- 不返回中文 key
- `days` 和 `dailyItinerary` 必须一致
- 文案尽量短，避免长攻略

## 6. Prompt 约束

为了提高真实 Qwen 稳定性，`v1.2.5` 对 prompt 做了收紧：

- 只输出 JSON
- 每天只生成早 / 中 / 晚各 1 个主要 block
- `reason`、`guide`、`dailyTips`、`generalTips` 都控制长度
- `weatherSummary.dailyForecast` 每项必须有 `summary`
- `transportAdvice.options[].mode` 只能使用：
  `flight`、`train`、`high_speed_rail`、`bus`、`ship`、`other`
- 市内交通统一写 `other`

## 7. 安全边界

真实 AI 相关安全约束：

- `LLM_API_KEY` 只存 `.env.local` 或部署平台环境变量
- 不把 Key 写进代码、README、测试、截图或日志
- 浏览器只请求本站 `/api/*`
- 服务端日志只输出安全摘要，不打印 Authorization 或完整上游原文

`.env.example` 只保留空值示例，不放真实 Key。

## 8. Mock / Real 切换

真实 AI：

```env
USE_MOCK_AI=false
LLM_BASE_URL=
LLM_API_KEY=
LLM_MODEL=qwen-plus
LLM_TIMEOUT_MS=120000
```

切回 Mock：

```env
USE_MOCK_AI=true
```

这是唯一允许的回退方式。真实请求失败时，不做同请求静默 Mock。

## 9. API / Schema 保持不变

`v1.2.5` 阶段 2 和阶段 3 都必须维持：

- 不改 `/api/parse-trip`
- 不改 `/api/generate-trip`
- 不改 `TripRequest` schema
- 不改 `TripPlan` schema

真实 AI 的兼容只允许发生在 Provider、prompt、normalize、repair 和文档层。
