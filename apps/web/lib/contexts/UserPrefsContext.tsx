"use client";

import { createContext, useContext, useState } from "react";
import type { GraphColourMode, WeightUnit, DistanceUnit } from "@/lib/api";

interface UserPrefs {
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
  graphColourMode: GraphColourMode;
  setWeightUnit: (u: WeightUnit) => void;
  setDistanceUnit: (u: DistanceUnit) => void;
  setGraphColourMode: (m: GraphColourMode) => void;
}

const UserPrefsContext = createContext<UserPrefs>({
  weightUnit: "kg",
  distanceUnit: "km",
  graphColourMode: "intensity",
  setWeightUnit: () => {},
  setDistanceUnit: () => {},
  setGraphColourMode: () => {},
});

export function useUserPrefs() {
  return useContext(UserPrefsContext);
}

interface Props {
  initialWeightUnit: WeightUnit;
  initialDistanceUnit: DistanceUnit;
  initialGraphColourMode: GraphColourMode;
  children: React.ReactNode;
}

export function UserPrefsProvider({
  initialWeightUnit,
  initialDistanceUnit,
  initialGraphColourMode,
  children,
}: Props) {
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(initialWeightUnit);
  const [distanceUnit, setDistanceUnit] =
    useState<DistanceUnit>(initialDistanceUnit);
  const [graphColourMode, setGraphColourMode] = useState<GraphColourMode>(
    initialGraphColourMode,
  );

  return (
    <UserPrefsContext.Provider
      value={{
        weightUnit,
        distanceUnit,
        graphColourMode,
        setWeightUnit,
        setDistanceUnit,
        setGraphColourMode,
      }}
    >
      {children}
    </UserPrefsContext.Provider>
  );
}
