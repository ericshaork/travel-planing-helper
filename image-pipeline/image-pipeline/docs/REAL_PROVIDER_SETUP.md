# REAL_PROVIDER_SETUP

## 1. 目标

本文件说明在 Wanderly Image Pipeline 中，为真实图片 provider 做本地接入准备时，如何使用环境变量与本地配置。

当前阶段的目标不是立即成功出图，而是先把真实 provider 接入前的工程准备做好。

## 2. 为什么要使用 .env

真实 provider 接入会涉及：

- API Key
- Base URL
- Endpoint
- Model ID

这些信息不应该写死在代码里，也不应该直接提交到 git。

因此使用 `.env` 的原因是：

- 把本地私密配置和代码分离
- 让不同开发环境可独立配置
- 避免真实密钥进入仓库历史

## 3. 当前默认 provider 还是 mock

当前系统默认 provider 仍然是：

- `mock`

即使已经加入了 Seedream / 火山方舟的配置占位和 provider 骨架，也不会自动切换到真实 provider。

只有在你手动修改 `.env` 或 provider 配置，并补齐真实字段后，后续才适合进入真实 API 联调阶段。

## 4. 如何从 .env.example 复制出 .env

项目内已经提供：

- `.env.example`

你可以手动复制出一份：

```bash
copy .env.example .env
```

或者直接新建 `.env`，并按模板填写。

## 5. 需要填写哪些字段

当前模板字段包括：

- `ARK_API_KEY`
- `ARK_BASE_URL`
- `ARK_IMAGE_ENDPOINT`
- `ARK_MODEL_ID`
- `DEFAULT_PROVIDER`

说明如下：

### 5.1 ARK_API_KEY

真实 API Key。

不要写进代码。

### 5.2 ARK_BASE_URL

当前预设：

- `https://ark.cn-beijing.volces.com`

如后续服务地址变化，可在本地调整。

### 5.3 ARK_IMAGE_ENDPOINT

当前预设：

- `/api/v3/images/generations`

### 5.4 ARK_MODEL_ID

真实图片模型 ID。

当前可以先留空，等正式联调时再填写。

### 5.5 DEFAULT_PROVIDER

当前应保持：

- `mock`

不要在尚未准备好时提前切到真实 provider。

## 6. 什么时候再切换到真实 provider

建议只有在以下条件满足后再切换：

- `.env` 已经正确填写
- Seedream provider 的真实请求逻辑已实现
- response transform 已补齐
- 错误处理和 fallback 方案已准备
- 你准备开始小规模联调，而不是直接批量生产

在那之前，继续保持：

- default provider = mock

## 7. 不要把 API Key 提交到 git

项目已经通过 `.gitignore` 忽略：

- `.env`
- `.env.local`
- `.env.*`

同时保留：

- `!.env.example`

这意味着：

- 模板文件可以进仓库
- 真实本地密钥文件不应进仓库

请始终确认：

- 不要把 `.env` 提交到 git
- 不要把真实 API Key 写进文档、代码或示例文件

## 8. 当前阶段结论

当前真实 provider 接入准备已包括：

- `.env.example` 模板
- `.gitignore` 忽略规则
- 统一环境变量读取工具
- provider 配置占位
- Seedream provider 基础骨架

当前阶段仍不包括：

- 真正成功的 API 调用
- 真实出图验证
- 批量生成联调
