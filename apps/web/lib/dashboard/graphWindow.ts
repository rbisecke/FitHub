export interface GraphWindow {
  numberOfMonths: number;
  fromDate: Date;
  displayFromDate: Date;
  toDate: Date;
  isAnchored: boolean;
}

export function graphWindow(
  totalWorkouts: number,
  firstWorkoutDate?: Date | null,
): GraphWindow {
  const toDate = new Date();
  let weeks: number;
  let numberOfMonths: number;

  if (totalWorkouts < 30) {
    weeks = 8;
    numberOfMonths = 2;
  } else if (totalWorkouts < 60) {
    weeks = 13;
    numberOfMonths = 3;
  } else if (totalWorkouts < 90) {
    weeks = 26;
    numberOfMonths = 6;
  } else {
    weeks = 52;
    numberOfMonths = 6; // cap at 6 for dashboard readability
  }

  const defaultFrom = new Date(toDate);
  defaultFrom.setDate(defaultFrom.getDate() - weeks * 7);

  let fromDate = defaultFrom;
  let isAnchored = false;

  if (firstWorkoutDate) {
    const anchoredFrom = new Date(firstWorkoutDate);
    anchoredFrom.setDate(anchoredFrom.getDate() - 2);
    if (anchoredFrom > defaultFrom) {
      fromDate = anchoredFrom;
      isAnchored = true;
    }
  }

  // Always end the visible calendar at today's month so future empty months
  // never appear. fromDate is kept for workout filtering.
  const displayFromDate = new Date(toDate);
  displayFromDate.setMonth(displayFromDate.getMonth() - (numberOfMonths - 1));
  displayFromDate.setDate(1);

  return { numberOfMonths, fromDate, displayFromDate, toDate, isAnchored };
}
