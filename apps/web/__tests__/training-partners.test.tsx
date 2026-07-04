// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrainingPartnersPanel } from "@/components/analytics/TrainingPartnersPanel";

describe("TrainingPartnersPanel", () => {
  it("renders empty state when no partners", () => {
    render(<TrainingPartnersPanel partners={[]} />);
    expect(screen.getByText(/No partners yet/i)).toBeTruthy();
  });

  it("renders partner rows with session counts", () => {
    render(
      <TrainingPartnersPanel
        partners={[
          {
            user_id: "u1",
            guest_name: null,
            display_name: "Alex",
            session_count: 4,
            most_common_format: null,
          },
          {
            user_id: "u2",
            guest_name: null,
            display_name: "Jordan",
            session_count: 2,
            most_common_format: null,
          },
        ]}
      />,
    );
    expect(screen.getByText("Alex")).toBeTruthy();
    expect(screen.getByText("Jordan")).toBeTruthy();
    expect(screen.getByText("4 sessions")).toBeTruthy();
  });

  it("shows max 3 partners", () => {
    render(
      <TrainingPartnersPanel
        partners={[
          {
            user_id: "u1",
            guest_name: null,
            display_name: "Alex",
            session_count: 4,
            most_common_format: null,
          },
          {
            user_id: "u2",
            guest_name: null,
            display_name: "Jordan",
            session_count: 3,
            most_common_format: null,
          },
          {
            user_id: "u3",
            guest_name: null,
            display_name: "Sam",
            session_count: 2,
            most_common_format: null,
          },
          {
            user_id: "u4",
            guest_name: null,
            display_name: "Lee",
            session_count: 1,
            most_common_format: null,
          },
        ]}
      />,
    );
    expect(screen.queryByText("Lee")).toBeNull();
  });

  it("uses singular 'session' for count of 1", () => {
    render(
      <TrainingPartnersPanel
        partners={[
          {
            user_id: "u1",
            guest_name: null,
            display_name: "Alex",
            session_count: 1,
            most_common_format: null,
          },
        ]}
      />,
    );
    expect(screen.getByText("1 session")).toBeTruthy();
  });
});
