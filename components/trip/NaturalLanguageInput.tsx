"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { InterestSelector } from "@/components/trip/InterestSelector";
import { TravelStyleSelector } from "@/components/trip/TravelStyleSelector";
import { submitCreateFlow } from "@/lib/projects/create-flow-client";

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
      await submitCreateFlow({
        rawInput: text.trim(),
        selectedInterests,
        selectedTravelStyles: selectedStyles,
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
      className="paper-card relative flex min-h-0 flex-col overflow-hidden border border-[var(--line-strong)] bg-[var(--paper)] p-2.5 sm:min-h-0 sm:p-3"
    >
      <div
        aria-hidden="true"
        className="absolute -right-3 -top-3 h-10 w-24 rotate-3 bg-[var(--tape)] opacity-80"
      />

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="min-w-0">
          <label
            htmlFor="trip-request"
            className="text-xs font-semibold text-[var(--ink)]"
          >
            先把想法丢进来
          </label>
          <p className="mt-0.5 text-[11px] leading-5 text-[var(--ink-muted)]">
            先写一句，缺的后面再补。
          </p>
        </div>

        <div className="mt-1 overflow-hidden border border-[var(--line-strong)] bg-[var(--paper-bright)] shadow-[4px_4px_0_var(--sand)]">
          <textarea
            id="trip-request"
            name="trip-request"
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={2000}
            rows={2}
            disabled={isSubmitting}
            placeholder="比如：7 月从深圳去厦门玩 3 天，预算 2500，喜欢海边和美食，不想太累。"
            className="min-h-10 w-full resize-none bg-transparent px-3 py-1.5 text-sm leading-6 text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sage-deep)] disabled:cursor-wait sm:min-h-12 sm:resize-y sm:py-1.5"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-[var(--line)] px-3 py-0.5 text-xs text-[var(--ink-muted)]">
            <span>知道多少写多少</span>
            <span>{text.length}/2000</span>
          </div>
        </div>

        <div className="mt-0.5 rounded-sm border border-dashed border-[var(--line)] bg-[var(--paper-bright)] p-1 sm:hidden">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--ink-muted)]">
            试一句
          </p>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setText(EXAMPLES[0])}
            className="mt-0.5 block w-full text-left text-sm leading-5 text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
          >
            {EXAMPLES[0]}
          </button>
        </div>

        <details className="group mt-0.5 overflow-hidden rounded-sm border border-dashed border-[var(--line-strong)] bg-[var(--paper-bright)] sm:hidden">
          <summary className="flex min-h-7 cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-1 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--clay)] [&::-webkit-details-marker]:hidden">
            <span>示例和偏好</span>
            <span className="text-xs text-[var(--ink-muted)]">
              <span className="group-open:hidden">展开</span>
              <span className="hidden group-open:inline">收起</span>
            </span>
          </summary>

          <div className="space-y-1 border-t border-dashed border-[var(--line)] px-2 py-1">
            <div className="space-y-0.5">
              {EXAMPLES.slice(1).map((example, index) => (
                <button
                  key={example}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setText(example)}
                  className="block w-full border-l-2 border-[var(--sand-deep)] bg-[var(--sand-soft)] px-2.5 py-1 text-left text-sm leading-5 text-[var(--ink-muted)] transition-colors hover:bg-[var(--sand)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)]"
                >
                  <span className="mr-2 font-mono text-xs text-[var(--clay)]">
                    0{index + 2}
                  </span>
                  {example}
                </button>
              ))}
            </div>

            <InterestSelector
              selected={selectedInterests}
              onToggle={(interest) =>
                setSelectedInterests((current) => toggleValue(current, interest))
              }
              disabled={isSubmitting}
              legend="兴趣"
            />

            <TravelStyleSelector
              selected={selectedStyles}
              onToggle={(style) =>
                setSelectedStyles((current) => toggleValue(current, style))
              }
              disabled={isSubmitting}
              legend="风格"
            />
          </div>
        </details>

        <div className="mt-1 hidden sm:block">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--ink-muted)]">
            没思路？点一个真实例子
          </p>
          <div className="mt-0.5 space-y-0.5">
            {EXAMPLES.map((example, index) => (
              <button
                key={example}
                type="button"
                disabled={isSubmitting}
                onClick={() => setText(example)}
                className="block min-h-7 w-full break-words border-l-2 border-[var(--sand-deep)] bg-[var(--sand-soft)] px-2.5 py-0.5 text-left text-sm leading-5 text-[var(--ink-muted)] transition-colors hover:bg-[var(--sand)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] disabled:cursor-wait"
              >
                <span className="mr-2 font-mono text-xs text-[var(--clay)]">
                  0{index + 1}
                </span>
                {example}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-1.5 hidden space-y-1.5 border-t border-dashed border-[var(--line)] pt-1.5 sm:block">
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
            className="mt-1.5 border-l-2 border-[var(--clay)] bg-[var(--clay-soft)] px-2.5 py-1 text-sm leading-5 text-[var(--clay-deep)]"
          >
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-1.5 pt-0 sm:mt-auto sm:pt-1.5">
          <div className="flex flex-col gap-1.5 border-t border-dashed border-[var(--line)] pt-1.5 sm:flex-row sm:items-center sm:justify-between sm:pt-1.5">
            <p className="text-[11px] leading-5 text-[var(--ink-muted)]">
              下一步只补缺的信息，不会直接丢给你一张长表单。
            </p>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-9 w-full border border-[var(--ink)] bg-[var(--ink)] px-4 py-1.5 text-sm font-semibold text-[var(--paper-bright)] shadow-[4px_4px_0_var(--clay)] transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--clay)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] active:translate-y-0 active:shadow-[2px_2px_0_var(--clay)] disabled:cursor-wait disabled:opacity-70 sm:min-h-9 sm:w-auto"
            >
              {isSubmitting ? "先把信息捋顺..." : "先排一版"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
