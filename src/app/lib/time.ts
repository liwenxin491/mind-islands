export const APP_TIME_ZONE = 'America/Los_Angeles';

const getTimeParts = (value: Date, timeZone = APP_TIME_ZONE) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(value);

  const map = new Map(parts.map((part) => [part.type, part.value]));
  return {
    year: map.get('year') || '1970',
    month: map.get('month') || '01',
    day: map.get('day') || '01',
    hour: map.get('hour') || '00',
    minute: map.get('minute') || '00',
    second: map.get('second') || '00',
  };
};

const getTimeZoneOffsetMinutes = (value: Date, timeZone = APP_TIME_ZONE) => {
  const parts = getTimeParts(value, timeZone);
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((asUTC - value.getTime()) / 60000);
};

const formatOffset = (offsetMinutes: number) => {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${sign}${hh}:${mm}`;
};

export function getDateKey(value: Date = new Date(), timeZone = APP_TIME_ZONE): string {
  const parts = getTimeParts(value, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getNowInAppTimeZoneISO(value: Date = new Date(), timeZone = APP_TIME_ZONE): string {
  const parts = getTimeParts(value, timeZone);
  const offset = formatOffset(getTimeZoneOffsetMinutes(value, timeZone));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`;
}

export function formatTime24(value: string | Date, timeZone = APP_TIME_ZONE): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleTimeString('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatDate24(value: string | Date, timeZone = APP_TIME_ZONE): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}
