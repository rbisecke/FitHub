// @vitest-environment jsdom
/**
 * Knowledge base (`08` §10). This page is an explicit honesty exercise (FR
 * §5.5): the reindex "job" is a fabrication and the status endpoint always
 * answers "unknown" / not-implemented. Locks in that neither state renders
 * as a fake progress bar — both surface the API's own operator-facing text
 * verbatim, and `last_indexed_at` (always null) never renders as an empty
 * or fabricated timestamp.
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AdminKBEntry } from "@/lib/api";

const triggerReindexMock = vi.fn();
const reindexStatusMock = vi.fn();

vi.mock("@/lib/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/client")>();
  return {
    ...actual,
    api: {
      ...actual.api,
      admin: {
        ...actual.api.admin,
        triggerReindex: (...args: unknown[]) => triggerReindexMock(...args),
        reindexStatus: (...args: unknown[]) => reindexStatusMock(...args),
      },
    },
  };
});

import { KnowledgeBaseScreen } from "@/components/admin/KnowledgeBaseScreen";

function entry(overrides: Partial<AdminKBEntry>): AdminKBEntry {
  return {
    id: "kb-1",
    source_type: "sports_science",
    title: "sports_science",
    chunk_count: 42,
    last_indexed_at: null,
    ...overrides,
  };
}

beforeEach(() => {
  triggerReindexMock.mockReset();
  reindexStatusMock.mockReset();
});

describe("KnowledgeBaseScreen", () => {
  it("labels the always-null last_indexed_at as 'not tracked for any source', not an empty/fake date", () => {
    render(
      <KnowledgeBaseScreen
        token="tok"
        initialEntries={[entry({})]}
        initialLoadFailed={false}
      />,
    );
    // This caveat moved from the main page description into an info-icon
    // tooltip (UI review — it read like an internal dev note leaking into
    // product copy) — it's still surfaced, just behind the icon's
    // accessible name instead of always-visible body text.
    expect(
      screen.getByRole("button", {
        name: "Indexing time isn't tracked for any source",
      }),
    ).toBeTruthy();
  });

  it("shows the operator instruction verbatim after triggering reindex, not a progress bar", async () => {
    triggerReindexMock.mockResolvedValue({
      job_id: "job-abc-123",
      status: "queued",
      message:
        "Reindex queued. Run `uv run python -m app.ai.ingest` to process.",
    });
    render(
      <KnowledgeBaseScreen
        token="tok"
        initialEntries={[entry({})]}
        initialLoadFailed={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reindex" }));
    fireEvent.click(screen.getByRole("button", { name: "Trigger reindex" }));

    // The command renders as an inline code chip inside the message
    // paragraph (not a second, duplicate code block) — assert on the chip's
    // own text and the surrounding prose separately, since whitespace across
    // the split inline nodes isn't a single exact string to match against.
    await waitFor(() => {
      expect(screen.getByText("uv run python -m app.ai.ingest")).toBeTruthy();
    });
    const messageParagraph = screen.getByText((_, element) => {
      const text = element?.textContent ?? "";
      return (
        element?.tagName.toLowerCase() === "p" &&
        text.includes("Reindex queued") &&
        text.includes("to process")
      );
    });
    expect(messageParagraph).toBeTruthy();
    // The pre-trigger "not a real job" disclaimer must carry forward into
    // the triggered state, not disappear once the job/status pill renders.
    expect(
      screen.getByText("Local placeholder — not tracked by a real job queue"),
    ).toBeTruthy();
    // No progress-bar / percentage / spinner semantics for a job that isn't
    // actually running anywhere.
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("surfaces the polling response as 'status tracking not available', not an error or infinite spinner", async () => {
    triggerReindexMock.mockResolvedValue({
      job_id: "job-abc-123",
      status: "queued",
      message:
        "Reindex queued. Run `uv run python -m app.ai.ingest` to process.",
    });
    reindexStatusMock.mockResolvedValue({
      job_id: "job-abc-123",
      status: "unknown",
      message: "Job tracking not yet implemented. Check server logs.",
    });
    render(
      <KnowledgeBaseScreen
        token="tok"
        initialEntries={[entry({})]}
        initialLoadFailed={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reindex" }));
    fireEvent.click(screen.getByRole("button", { name: "Trigger reindex" }));
    await screen.findByText("uv run python -m app.ai.ingest");

    fireEvent.click(screen.getByRole("button", { name: "Check status" }));

    expect(
      await screen.findByText(
        "Status tracking not available — check server logs.",
      ),
    ).toBeTruthy();
    await waitFor(() =>
      expect(reindexStatusMock).toHaveBeenCalledWith("tok", "job-abc-123"),
    );
  });

  it("shows the empty-corpus copy when there are no sources", () => {
    render(
      <KnowledgeBaseScreen
        token="tok"
        initialEntries={[]}
        initialLoadFailed={false}
      />,
    );
    expect(screen.getByText("No indexed sources yet.")).toBeTruthy();
  });
});
