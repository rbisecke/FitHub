"use client";

import { createContext, useContext, useState } from "react";
import type { GraphColourMode, WeightUnit } from "@/lib/api";

interface UserPrefs {
  weightUnit: WeightUnit;
  graphColourMode: GraphColourMode;
  setWeightUnit: (u: WeightUnit) => void;
  setGraphColourMode: (m: GraphColourMode) => void;
}

const UserPrefsContext = createContext<UserPrefs>({
  weightUnit: "kg",
  graphColourMode: "intensity",
  setWeightUnit: () => {},
  setGraphColourMode: () => {},
});

export function useUserPrefs() {
  return useContext(UserPrefsContext);
}

interface Props {
  initialWeightUnit: WeightUnit;
  initialGraphColourMode: GraphColourMode;
  children: React.ReactNode;
}

export function UserPrefsProvider({
  initialWeightUnit,
  initialGraphColourMode,
  children,
}: Props) {
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(initialWeightUnit);
  const [graphColourMode, setGraphColourMode] = useState<GraphColourMode>(
    initialGraphColourMode,
  );

  return (
    <UserPrefsContext.Provider
      value={{ weightUnit, graphColourMode, setWeightUnit, setGraphColourMode }}
    >
      {children}
    </UserPrefsContext.Provider>
  );
}
