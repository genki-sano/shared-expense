const MONTH_PATTERN = /^\d{4}-\d{2}$/;

export function normalizeMonthParam(
  value: string | string[] | undefined,
  fallbackMonth: string,
): string {
  const month = Array.isArray(value) ? value[0] : value;
  if (month === undefined || !MONTH_PATTERN.test(month)) {
    return fallbackMonth;
  }

  return month;
}

export function currentMonthInJst(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  if (year === undefined || month === undefined) {
    throw new Error("Failed to format current month");
  }

  return `${year}-${month}`;
}

export function addMonths(month: string, amount: number): string {
  if (!MONTH_PATTERN.test(month)) {
    throw new Error("month must be YYYY-MM");
  }

  const [yearPart, monthPart] = month.split("-");
  const date = new Date(Date.UTC(Number(yearPart), Number(monthPart) - 1 + amount, 1));
  const year = date.getUTCFullYear();
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, "0");

  return `${year}-${nextMonth}`;
}

export function formatMonthLabel(month: string): string {
  if (!MONTH_PATTERN.test(month)) {
    return month;
  }

  const [year, monthPart] = month.split("-");
  return `${year}年${Number(monthPart)}月`;
}
