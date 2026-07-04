import { describe, expect, it } from "vitest";

import {
  getMissingTripRequestFieldDetails,
  getPlanFieldMeta,
  getTripRequestIssueFieldDetails,
} from "../../lib/trip/plan-fields";

describe("plan field metadata", () => {
  it("将缺失字段转成可展示的标签、文案和定位信息", () => {
    expect(
      getMissingTripRequestFieldDetails([
        { field: "travelStyles", message: "unused" },
        { field: "budget", message: "unused" },
        { field: "departureCity", message: "unused" },
      ]),
    ).toEqual([
      {
        field: "departureCity",
        label: "出发城市",
        step: 0,
        elementId: "plan-field-departure-city",
        order: 0,
        kind: "missing",
        message: "还没填出发城市",
        sourceField: "departureCity",
      },
      {
        field: "budget",
        label: "预算",
        step: 1,
        elementId: "plan-field-budget",
        order: 6,
        kind: "missing",
        message: "填一个大概预算就行",
        sourceField: "budget",
      },
      {
        field: "travelStyles",
        label: "出行风格",
        step: 2,
        elementId: "plan-field-travel-styles",
        order: 8,
        kind: "missing",
        message: "至少选一个出行风格",
        sourceField: "travelStyles",
      },
    ]);
  });

  it("将标准化问题映射到对应字段，方便定位和高亮", () => {
    expect(
      getTripRequestIssueFieldDetails([
        {
          field: "days",
          message: "天数应与日期区间一致，共 3 天",
        },
        {
          field: "endDate",
          message: "结束日期不能早于开始日期，请重新选择出行日期。",
        },
      ]),
    ).toEqual([
      {
        field: "days",
        label: "出行天数",
        step: 0,
        elementId: "plan-field-days",
        order: 3,
        kind: "invalid",
        message: "天数应与日期区间一致，共 3 天",
        sourceField: "days",
      },
      {
        field: "endDate",
        label: "结束日期",
        step: 0,
        elementId: "plan-field-end-date",
        order: 5,
        kind: "invalid",
        message: "结束日期不能早于开始日期，请重新选择出行日期。",
        sourceField: "endDate",
      },
    ]);
  });

  it("忽略当前页面不需要定位的字段问题", () => {
    expect(
      getTripRequestIssueFieldDetails([
        {
          field: "specialRequirements",
          message: "内容过长",
        },
      ]),
    ).toEqual([]);
  });

  it("保留字段到元素 id 的稳定映射", () => {
    expect(getPlanFieldMeta("interests")).toMatchObject({
      field: "interests",
      elementId: "plan-field-interests",
      step: 1,
    });
  });
});
