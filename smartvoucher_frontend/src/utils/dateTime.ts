export const APP_TIME_ZONE = 'Asia/Ho_Chi_Minh';
export const APP_LOCALE = 'vi-VN';

const VIETNAM_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

type DateInput = string | number | Date;

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(options: Intl.DateTimeFormatOptions) {
  const key = JSON.stringify(options);
  const cached = formatterCache.get(key);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIME_ZONE,
    hourCycle: 'h23',
    ...options,
  });
  formatterCache.set(key, formatter);
  return formatter;
}

function toDate(value: DateInput) {
  return value instanceof Date ? value : new Date(value);
}

export function formatDateInVietnam(value: DateInput, options?: Intl.DateTimeFormatOptions) {
  return getFormatter({
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  }).format(toDate(value));
}

export function formatVietnamTime(date: Date | string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
}

export function formatDateTimeInVietnam(value: DateInput, options?: Intl.DateTimeFormatOptions) {
  return getFormatter({
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: options?.second,
    ...options,
  }).format(toDate(value));
}

export function getVietnamDateParts(value: DateInput) {
  const date = toDate(value);
  const parts = getFormatter({
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);

  const map = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  ) as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', string>;

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

export function toVietnamFormDate(value: DateInput) {
  const parts = getVietnamDateParts(value);
  return new Date(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    0,
  );
}

export function getNowInVietnam() {
  return toVietnamFormDate(new Date());
}

export function getStartOfTodayInVietnam() {
  const today = getNowInVietnam();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function toVietnamISOString(value: Date) {
  const utcTimestamp =
    Date.UTC(
      value.getFullYear(),
      value.getMonth(),
      value.getDate(),
      value.getHours(),
      value.getMinutes(),
      value.getSeconds(),
      value.getMilliseconds(),
    ) - VIETNAM_UTC_OFFSET_MS;

  return new Date(utcTimestamp).toISOString();
}

export function getCurrentHourInVietnam() {
  return getVietnamDateParts(new Date()).hour;
}
