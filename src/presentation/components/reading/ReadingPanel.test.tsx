import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import {
  createReadingRequester,
  type ReadingOutcome,
  type ReadingRequester,
} from "@/application/use-cases/requestReading";
import { buildReadingRequest } from "@/domain/reading/buildReadingRequest";
import {
  MAJOR,
  spreadOf,
  standardRegistry,
} from "@/domain/reading/testing/readingFixtures";
import type { ReadingSource } from "@/domain/reading/types";
import type { Spread } from "@/domain/spread/types";
import { PrewrittenReadingProvider } from "@/infrastructure/reading/prewrittenReadingProvider";
import { ReadingPanel } from "@/presentation/components/reading/ReadingPanel";
import { useReadingSession } from "@/presentation/components/reading/useReadingSession";

const spread = spreadOf(
  [
    { question: "現況是什麼？", draw: { card: MAJOR(17) } },
    {
      question: "阻礙在哪裡？",
      draw: {
        card: MAJOR(16),
        orientation: "reversed",
        jumper: { card: "atelier-standard.cups.three" },
      },
    },
  ],
  "我的工作方向",
);

function uuids() {
  let next = 0;
  return () =>
    `00000000-0000-4000-8000-${(next += 1).toString().padStart(12, "0")}`;
}

function Harness(props: {
  readonly requester: ReadingRequester;
  readonly spread?: Spread;
  readonly revealed?: boolean;
  readonly source?: ReadingSource;
}) {
  const [createRequestId] = useState(uuids);
  const session = useReadingSession({
    spread: props.spread ?? spread,
    registry: standardRegistry,
    requester: props.requester,
    createRequestId,
  });
  return (
    <ReadingPanel
      session={session}
      revealed={props.revealed ?? true}
      source={props.source ?? "prewritten"}
    />
  );
}

const realRequester = () =>
  createReadingRequester(new PrewrittenReadingProvider(standardRegistry));

/** A requester whose answers the test releases by hand. */
function manualRequester() {
  const calls: {
    requestId: string;
    signal?: AbortSignal;
    answer: (o: ReadingOutcome) => void;
  }[] = [];
  const requester: ReadingRequester = {
    request: (requestId, _request, signal) =>
      new Promise((resolve) => {
        calls.push({ requestId, signal, answer: resolve });
        signal?.addEventListener("abort", () =>
          resolve({ ok: false, failure: "cancelled" }),
        );
      }),
  };
  return { requester, calls };
}

function buildFor(target: Spread) {
  const build = buildReadingRequest(target, standardRegistry);
  if (!build.ok) throw new Error("unbuildable spread");
  return build.request;
}

function generate() {
  fireEvent.click(screen.getByRole("button", { name: "產生解讀" }));
}

describe("ReadingPanel", () => {
  it("shows only the disclaimer and one button before a reading", () => {
    render(<Harness requester={realRequester()} />);
    expect(screen.getByText(/僅供娛樂與自我反思/u)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "產生解讀" })).toBeEnabled();
    // No source badge, notes, deck or second list of positions yet.
    expect(screen.queryByText("範例解牌，不是 AI")).not.toBeInTheDocument();
    expect(screen.queryByText("工坊標準塔羅")).not.toBeInTheDocument();
    expect(screen.queryByText("我的工作方向")).not.toBeInTheDocument();
    expect(screen.queryByText("現況是什麼？")).not.toBeInTheDocument();
  });

  it("labels a finished reading by where it came from", async () => {
    render(<Harness requester={realRequester()} />);
    generate();
    expect(await screen.findByText("範例解牌，不是 AI")).toBeInTheDocument();
  });

  it("keeps the button disabled until every card is revealed", () => {
    render(<Harness requester={realRequester()} revealed={false} />);
    expect(
      screen.getByRole("button", { name: "翻開所有牌後即可解讀" }),
    ).toBeDisabled();
  });

  it("offers no tone choice", () => {
    render(<Harness requester={realRequester()} />);
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByText("解讀語氣")).not.toBeInTheDocument();
  });

  it("generates an expandable reading section by section", async () => {
    render(<Harness requester={realRequester()} />);
    generate();

    const synthesis = await screen.findByText("全局關聯");
    const sections = document.querySelectorAll("details.reading-section");
    expect(sections).toHaveLength(2 + 3);
    expect(sections[0]).toHaveAttribute("open");
    expect(synthesis.closest("details")).not.toHaveAttribute("open");
    expect(screen.getAllByText("單牌象徵")).toHaveLength(2);
    expect(screen.getByText(/跳牌補充・聖杯三/u)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重新產生" })).toBeEnabled();
  });

  it("can be cancelled without touching the spread", async () => {
    const { requester, calls } = manualRequester();
    render(<Harness requester={requester} />);
    generate();

    expect(await screen.findByText("正在組合解讀…")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "重新產生" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "取消" }));

    expect(await screen.findByText(/已取消這次解讀/u)).toBeInTheDocument();
    expect(calls[0]?.signal?.aborted).toBe(true);
    expect(
      screen.queryByRole("button", { name: "再試一次" }),
    ).not.toBeInTheDocument();
  });

  it("retries a failure with the same request ID", async () => {
    const { requester, calls } = manualRequester();
    render(<Harness requester={requester} />);
    generate();
    await act(async () =>
      calls[0]?.answer({ ok: false, failure: "provider-failed" }),
    );

    fireEvent.click(await screen.findByRole("button", { name: "再試一次" }));
    expect(calls).toHaveLength(2);
    expect(calls[1]?.requestId).toBe(calls[0]?.requestId);
  });

  it("marks a reading as stale when the spread changes", async () => {
    const view = render(<Harness requester={realRequester()} />);
    generate();
    await screen.findByText("全局關聯");

    const edited = spreadOf(
      [{ question: "現況是什麼？", draw: { card: MAJOR(17) } }],
      "換了主問題",
    );
    view.rerender(<Harness requester={realRequester()} spread={edited} />);
    expect(screen.getByText(/牌陣已改變/u)).toBeInTheDocument();
  });

  it("points health, legal and financial questions to a professional", async () => {
    const risky = spreadOf([
      { question: "該不該買這支股票？", draw: { card: MAJOR(10) } },
    ]);
    render(<Harness requester={realRequester()} spread={risky} />);
    generate();
    expect(await screen.findByText(/涉及財務/u)).toBeInTheDocument();
  });

  it("shows how long an AI reading takes while it is generated", async () => {
    const { requester } = manualRequester();
    render(<Harness requester={requester} source="ai" />);
    generate();
    expect(await screen.findByText(/正在產生解讀/u)).toBeInTheDocument();
  });

  it("labels a fallback as a sample and says why AI did not answer", async () => {
    const { requester, calls } = manualRequester();
    render(<Harness requester={requester} source="ai" />);
    generate();
    const request = calls[0];
    if (!request) throw new Error("no request");
    const reading = await realRequester().request(
      "00000000-0000-4000-8000-000000000099",
      buildFor(spread),
    );
    if (!reading.ok) throw new Error("no reading");
    await act(async () =>
      request.answer({
        ok: true,
        result: { ...reading.result, fallback: { reason: "daily-limit" } },
      }),
    );

    expect(
      await screen.findByText(/今天的 AI 解讀額度已用完/u),
    ).toBeInTheDocument();
    expect(screen.getByText("範例解牌，不是 AI")).toBeInTheDocument();
  });

  it("explains why it cannot read yet and disables generating", () => {
    const unfinished = spreadOf([
      { question: "一？", draw: { card: MAJOR(1) } },
      { question: "二？" },
    ]);
    render(<Harness requester={realRequester()} spread={unfinished} />);
    expect(screen.getByRole("alert")).toHaveTextContent("牌位 2 還沒有抽牌。");
    expect(screen.getByRole("button", { name: "產生解讀" })).toBeDisabled();
  });
});
