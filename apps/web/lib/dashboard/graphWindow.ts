export interface GraphWindow {
  numberOfMonths: number;
  fromDate: Date;
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

  return { numberOfMonths, fromDate, toDate, isAnchored };
}
