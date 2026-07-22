// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TrainingPartnersScreen } from "@/components/social/training-partners/TrainingPartnersScreen";
import type { TrainingPartner } from "@/lib/api";

const addTrainingPartnerMock = vi.fn();
const removeTrainingPartnerMock = vi.fn();

vi.mock("@/lib/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/client")>();
  return {
    ...actual,
    api: {
      ...actual.api,
      addTrainingPartner: (...args: unknown[]) =>
        addTrainingPartnerMock(...args),
      removeTrainingPartner: (...args: unknown[]) =>
        removeTrainingPartnerMock(...args),
    },
  };
});

function partner(overrides: Partial<TrainingPartner>): TrainingPartner {
  return {
    user_id: "u2",
    guest_name: null,
    display_name: "Jordan",
    session_count: 12,
    most_common_format: null,
    ...overrides,
  };
}

// Opens the sheet (there's an "Add by email" button in both the header and,
// when the roster is empty, the empty state — always take the first one) and
// fills the email field.
async function openAndFillEmail(email: string) {
  fireEvent.click(screen.getAllByRole("button", { name: /add by email/i })[0]!);
  const emailInput = await screen.findByLabelText(/partner email/i);
  fireEvent.change(emailInput, { target: { value: email } });
  return emailInput;
}

beforeEach(() => {
  addTrainingPartnerMock.mockReset();
  removeTrainingPartnerMock.mockReset();
});

describe("TrainingPartnersScreen", () => {
  it("renders the empty state when there are no partners", () => {
    render(<TrainingPartnersScreen token="tok" initialPartners={[]} />);
    expect(screen.getByText(/No training partners yet/i)).toBeTruthy();
  });

  it("renders a roster row with session count and no remove control for guests", () => {
    const partners = [
      partner({ user_id: "u2", display_name: "Jordan", session_count: 12 }),
      partner({
        user_id: null,
        guest_name: "sam",
        display_name: "Sam",
        session_count: 0,
      }),
    ];
    render(<TrainingPartnersScreen token="tok" initialPartners={partners} />);
    expect(screen.getByText("12 sessions")).toBeTruthy();
    expect(screen.getByText("0 sessions")).toBeTruthy();
    expect(screen.getByText("guest")).toBeTruthy();
    expect(
      screen.queryByLabelText(/Remove Sam as a training partner/i),
    ).toBeNull();
    expect(
      screen.getByLabelText(/Remove Jordan as a training partner/i),
    ).toBeTruthy();
  });

  it("adds a partner by email and flips the button to Added", async () => {
    addTrainingPartnerMock.mockResolvedValueOnce(
      partner({ user_id: "u9", display_name: "Casey", session_count: 0 }),
    );
    render(<TrainingPartnersScreen token="tok" initialPartners={[]} />);

    await openAndFillEmail("Casey@Example.com");
    fireEvent.click(screen.getByRole("button", { name: /^add partner$/i }));

    await waitFor(() =>
      expect(addTrainingPartnerMock).toHaveBeenCalledWith(
        "tok",
        "casey@example.com",
      ),
    );
    expect(
      await screen.findByRole("button", { name: /^added$/i }),
    ).toBeTruthy();
    expect(await screen.findByText("Casey")).toBeTruthy();
  });

  it("shows an informational (non-error) message on 404", async () => {
    const { ApiError } = await import("@/lib/api/client");
    addTrainingPartnerMock.mockRejectedValueOnce(
      new ApiError(404, "not found"),
    );
    render(<TrainingPartnersScreen token="tok" initialPartners={[]} />);

    await openAndFillEmail("nobody@example.com");
    fireEvent.click(screen.getByRole("button", { name: /^add partner$/i }));

    expect(
      await screen.findByText(/No account found for that email/i),
    ).toBeTruthy();
  });

  it("shows an informational (non-error) message on 409", async () => {
    const { ApiError } = await import("@/lib/api/client");
    addTrainingPartnerMock.mockRejectedValueOnce(
      new ApiError(409, "already exists"),
    );
    render(<TrainingPartnersScreen token="tok" initialPartners={[]} />);

    await openAndFillEmail("jordan@example.com");
    fireEvent.click(screen.getByRole("button", { name: /^add partner$/i }));

    expect(await screen.findByText(/Already a training partner/i)).toBeTruthy();
  });

  it("removes a partner after confirming", async () => {
    removeTrainingPartnerMock.mockResolvedValueOnce(undefined);
    const partners = [
      partner({ user_id: "u2", display_name: "Jordan", session_count: 12 }),
    ];
    render(<TrainingPartnersScreen token="tok" initialPartners={partners} />);

    fireEvent.click(
      screen.getByLabelText(/Remove Jordan as a training partner/i),
    );
    fireEvent.click(await screen.findByRole("button", { name: /^remove$/i }));

    await waitFor(() =>
      expect(removeTrainingPartnerMock).toHaveBeenCalledWith("tok", "u2"),
    );
    await waitFor(() => expect(screen.queryByText("Jordan")).toBeNull());
  });
});
