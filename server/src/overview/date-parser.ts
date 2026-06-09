export interface ParsedDateResult {
  valid: boolean;
  date: Date | null;
}

const CHINESE_FULL =
  /^(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?$/;
const CHINESE_NO_YEAR = /^(\d{1,2})\s*月\s*(\d{1,2})\s*日?$/;
const ISO_DATE = /^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/;
const SHORT_DATE = /^(\d{1,2})[/\-.](\d{1,2})$/;

const WEEKDAY_SUFFIX =
  /\s*[·\s]+\s*(?:星期[一二三四五六日天]|周[一二三四五六日天]|(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\w*)\s*$/i;

function getCurrentYear(): number {
  return new Date().getFullYear();
}

function buildDate(year: number, month: number, day: number): Date | null {
  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  return d;
}

function stripWeekdaySuffix(text: string): string {
  return text.replace(WEEKDAY_SUFFIX, '').trim();
}

export function parseDateText(text: string): ParsedDateResult {
  if (!text || typeof text !== 'string') {
    return { valid: false, date: null };
  }

  const trimmed = stripWeekdaySuffix(text.trim());
  if (!trimmed) {
    return { valid: false, date: null };
  }

  let match: RegExpMatchArray | null;

  match = trimmed.match(CHINESE_FULL);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    const date = buildDate(year, month, day);
    if (date) {
      return { valid: true, date };
    }
  }

  match = trimmed.match(CHINESE_NO_YEAR);
  if (match) {
    const year = getCurrentYear();
    const month = parseInt(match[1], 10);
    const day = parseInt(match[2], 10);
    const date = buildDate(year, month, day);
    if (date) {
      return { valid: true, date };
    }
  }

  match = trimmed.match(ISO_DATE);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    const date = buildDate(year, month, day);
    if (date) {
      return { valid: true, date };
    }
  }

  match = trimmed.match(SHORT_DATE);
  if (match) {
    const year = getCurrentYear();
    const month = parseInt(match[1], 10);
    const day = parseInt(match[2], 10);
    const date = buildDate(year, month, day);
    if (date) {
      return { valid: true, date };
    }
  }

  return { valid: false, date: null };
}
