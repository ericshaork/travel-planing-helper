"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { InterestSelector } from "@/components/trip/InterestSelector";
import { TravelStyleSelector } from "@/components/trip/TravelStyleSelector";
import { saveParsedTripSession } from "@/lib/trip/storage";
import type { ParseTripResponse } from "@/lib/trip/types";
import type { ApiErrorResponse } from "@/lib/utils/errors";

const EXAMPLES = [
  "7 月从深圳去厦门玩 3 天，预算 2500，喜欢海边、美食和拍照，不想太累。",
  "从广州去成都玩 4 天，喜欢美食和城市漫步，不想去太商业化的景点。",
  "想去杭州玩两天，预算 1500，不想早起，想轻松一点。",
] as const;

function toggleValue(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function buildParseText(
  text: string,
  interests: string[],
  travelStyles: string[],
): string {
  const additions = [
    interests.length > 0 ? `喜欢${interests.join("、")}` : "",
    travelStyles.length > 0 ? `希望${travelStyles.join("、")}` : "",
  ].filter(Boolean);

  return additions.length > 0
    ? `${text.trim()}；补充偏好：${additions.join("；")}。`
    : text.trim();
}

function responseErrorMessage(payload: unknown): string {
  const response = payload as Partial<ApiErrorResponse>;
  return response.error?.message ?? "刚才没接上，先检查一下输入，再试一次。";
}

export function NaturalLanguageInput() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(undefined);

    if (!text.trim()) {
      setErrorMessage("先写一句吧。出发地、目的地、天数，知道多少写多少。");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/parse-trip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: buildParseText(text, selectedInterests, selectedStyles),
        }),
      });
      const payload = (await response.json()) as unknown;

      if (!response.ok) {
        throw new Error(responseErrorMessage(payload));
      }

      const parseResult = payload as ParseTripResponse;
      saveParsedTripSession({
        rawInput: text.trim(),
        selectedInterests,
        selectedTravelStyles: selectedStyles,
        parseResult,
      });
      router.push("/plan");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "刚才没接上，先检查一下输入，再试一次。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="paper-card relative overflow-hidden border border-[var(--line-strong)] bg-[var(--paper)] p-5 sm:p-7"
    >
      <div
        aria-hidden="true"
        className="absolute -right-3 -top-3 h-10 w-24 rotate-3 bg-[var(--tape)] opacity-80"
      />

      <div className="relative min-w-0">
        <label
          htmlFor="trip-request"
          className="text-base font-semibold text-[var(--ink)]"
        >
          先把想法丢进来
        </label>
        <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
          不用写得很完整。缺什么，下一步再补。
        </p>

        <div className="mt-4 overflow-hidden border border-[var(--line-strong)] bg-[var(--paper-bright)] shadow-[4px_4px_0_var(--sand)]">
          <textarea
            id="trip-request"
            name="trip-request"
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={2000}
            rows={6}
            disabled={isSubmitting}
            placeholder="比如：7 月从深圳去厦门玩 3 天，预算 2500，喜欢海边和美食，不想太累。"
            className="min-h-40 w-full resize-y bg-transparent px-4 py-4 text-base leading-7 text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sage-deep)] disabled:cursor-wait"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-[var(--line)] px-4 py-2 text-xs text-[var(--ink-muted)]">
            <span>知道多少写多少</span>
            <span>{text.length}/2000</span>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold tracking-[0.08em] text-[var(--ink-muted)]">
            没思路？点一个真实例子
          </p>
          <div className="mt-2 space-y-2">
            {EXAMPLES.map((example, index) => (
              <button
                key={example}
                type="button"
                disabled={isSubmitting}
                onClick={() => setText(example)}
                className="block min-h-11 w-full break-words border-l-2 border-[var(--sand-deep)] bg-[var(--sand-soft)] px-3 py-3 text-left text-sm leading-6 text-[var(--ink-muted)] transition-colors hover:bg-[var(--sand)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] disabled:cursor-wait"
              >
                <span className="mr-2 font-mono text-xs text-[var(--clay)]">
                  0{index + 1}
                </span>
                {example}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-7 space-y-6 border-t border-dashed border-[var(--line)] pt-6">
          <InterestSelector
            selected={selectedInterests}
            onToggle={(interest) =>
              setSelectedInterests((current) => toggleValue(current, interest))
            }
            disabled={isSubmitting}
          />
          <TravelStyleSelector
            selected={selectedStyles}
            onToggle={(style) =>
              setSelectedStyles((current) => toggleValue(current, style))
            }
            disabled={isSubmitting}
          />
        </div>

        {errorMessage ? (
          <p
            role="alert"
            className="mt-6 border-l-2 border-[var(--clay)] bg-[var(--clay-soft)] px-3 py-2 text-sm leading-6 text-[var(--clay-deep)]"
          >
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-[var(--ink-muted)]">
            下一步只补缺的信息，不会丢给你一张长表单。
          </p>
          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-11 w-full border border-[var(--ink)] bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)] transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--clay)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] active:translate-y-0 active:shadow-[2px_2px_0_var(--clay)] disabled:cursor-wait disabled:opacity-70 sm:w-auto"
          >
            {isSubmitting ? "先把信息捋顺..." : "先排一版"}
          </button>
        </div>
      </div>
    </form>
  );
}
