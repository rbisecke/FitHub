// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  UserPrefsProvider,
  useUserPrefs,
} from "@/lib/contexts/UserPrefsContext";

// Consumer component that renders context values for assertion
function Consumer() {
  const { weightUnit, distanceUnit } = useUserPrefs();
  return (
    <div>
      <span data-testid="weight">{weightUnit}</span>
      <span data-testid="distance">{distanceUnit}</span>
    </div>
  );
}

describe("UserPrefsContext — distanceUnit", () => {
  it('defaults to "km" when initialDistanceUnit is "km"', () => {
    render(
      <UserPrefsProvider
        initialWeightUnit="kg"
        initialDistanceUnit="km"
        initialGraphColourMode="intensity"
      >
        <Consumer />
      </UserPrefsProvider>,
    );
    expect(screen.getByTestId("distance").textContent).toBe("km");
  });

  it('is "mi" when initialDistanceUnit is "mi"', () => {
    render(
      <UserPrefsProvider
        initialWeightUnit="kg"
        initialDistanceUnit="mi"
        initialGraphColourMode="intensity"
      >
        <Consumer />
      </UserPrefsProvider>,
    );
    expect(screen.getByTestId("distance").textContent).toBe("mi");
  });

  it('is "km" when initialDistanceUnit is explicitly "km"', () => {
    render(
      <UserPrefsProvider
        initialWeightUnit="lb"
        initialDistanceUnit="km"
        initialGraphColourMode="volume"
      >
        <Consumer />
      </UserPrefsProvider>,
    );
    expect(screen.getByTestId("distance").textContent).toBe("km");
  });

  it("context default (no provider) returns km", () => {
    // useUserPrefs() outside a provider returns the createContext default
    render(<Consumer />);
    expect(screen.getByTestId("distance").textContent).toBe("km");
  });
});

describe("UserPrefsContext — weightUnit (regression)", () => {
  it("still exposes weightUnit correctly", () => {
    render(
      <UserPrefsProvider
        initialWeightUnit="lb"
        initialDistanceUnit="km"
        initialGraphColourMode="intensity"
      >
        <Consumer />
      </UserPrefsProvider>,
    );
    expect(screen.getByTestId("weight").textContent).toBe("lb");
  });
});
