const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000;

function parseIsoDate(value: string): Date | null {
  const match = ISO_DATE_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

export function isValidIsoDate(value: string): boolean {
  return parseIsoDate(value) !== null;
}

export function calculateInclusiveTripDays(
  startDate: string,
  endDate: string,
): number | null {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);

  if (!start || !end || end < start) {
    return null;
  }

  return Math.floor((end.getTime() - start.getTime()) / MILLISECONDS_PER_DAY) + 1;
}

export function isValidDateRange(
  startDate?: string,
  endDate?: string,
): boolean {
  if (!startDate && !endDate) {
    return true;
  }

  if (!startDate) {
    return false;
  }

  if (!isValidIsoDate(startDate)) {
    return false;
  }

  if (!endDate) {
    return true;
  }

  return calculateInclusiveTripDays(startDate, endDate) !== null;
}
