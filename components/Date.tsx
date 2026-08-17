import React, { HTMLAttributes } from 'react';
import { format as formatDateFns, formatDistanceToNow, isValid } from 'date-fns';
import { bn, enUS, hi, ar, fr, de, es, ja, zhCN } from 'date-fns/locale';

export type LanguageOrCountry =
  | 'en'
  | 'bn'
  | 'hi'
  | 'ar'
  | 'fr'
  | 'de'
  | 'es'
  | 'ja'
  | 'zh'
  | 'BD'
  | 'IN'
  | 'US'
  | 'GB'
  | 'SA'
  | 'FR'
  | 'DE'
  | 'JP'
  | 'CN'
  | 'PK'
  | 'NP'
  | 'LK'
  | string;

export interface DateProps extends HTMLAttributes<HTMLTimeElement> {
  /** Language or Country code (e.g. 'en', 'bn', 'hi', 'BD', 'IN', 'US', 'ar-SA', 'bn-BD', 'hi-IN') */
  lan?: LanguageOrCountry;
  /** Country code (e.g. 'BD', 'IN', 'US', 'GB') */
  country?: string;
  /** Alias for lan */
  lang?: LanguageOrCountry;
  /** Alias for lan */
  locale?: LanguageOrCountry;
  /** The date to format (Date object, timestamp number, or date string). Defaults to current date. */
  date?: Date | string | number | null;
  /** Custom date-fns format string (e.g. 'EEEE, MMMM dd, yyyy', 'dd/MM/yyyy') */
  format?: string;
  /** Preset type: 'date' (default) | 'time' | 'datetime' | 'relative' */
  type?: 'date' | 'time' | 'datetime' | 'relative';
  /** Additional CSS class names */
  className?: string;
  /** Optional children */
  children?: React.ReactNode;
}

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/**
 * Map common 2-letter Country ISO codes to default BCP-47 locale strings.
 */
const COUNTRY_TO_LOCALE_MAP: Record<string, string> = {
  BD: 'bn-BD',
  IN: 'hi-IN',
  US: 'en-US',
  GB: 'en-GB',
  CA: 'en-CA',
  AU: 'en-AU',
  SA: 'ar-SA',
  AE: 'ar-AE',
  FR: 'fr-FR',
  DE: 'de-DE',
  ES: 'es-ES',
  JP: 'ja-JP',
  CN: 'zh-CN',
  PK: 'ur-PK',
  NP: 'ne-NP',
  LK: 'si-LK',
  IT: 'it-IT',
  RU: 'ru-RU',
  BR: 'pt-BR',
};

/**
 * Map 2-letter language codes to standard locale tags.
 */
const LANG_TO_LOCALE_MAP: Record<string, string> = {
  bn: 'bn-BD',
  bangla: 'bn-BD',
  hi: 'hi-IN',
  hindi: 'hi-IN',
  en: 'en-US',
  english: 'en-US',
  ar: 'ar-SA',
  arabic: 'ar-SA',
  fr: 'fr-FR',
  french: 'fr-FR',
  de: 'de-DE',
  german: 'de-DE',
  es: 'es-ES',
  spanish: 'es-ES',
  ja: 'ja-JP',
  japanese: 'ja-JP',
  zh: 'zh-CN',
  chinese: 'zh-CN',
  ur: 'ur-PK',
  ne: 'ne-NP',
  si: 'si-LK',
};

/**
 * Converts ASCII digits (0-9) to Bengali digits (০-৯).
 */
export function toBnDigits(str: string): string {
  return str.replace(/[0-9]/g, (digit) => BENGALI_DIGITS[parseInt(digit, 10)]);
}

/**
 * Safely parses various date inputs (Date, timestamp, ISO string).
 */
export function parseDateInput(input?: Date | string | number | null): Date {
  if (!input) return new Date();
  if (input instanceof Date) {
    return isValid(input) ? input : new Date();
  }
  if (typeof input === 'number') {
    const d = new Date(input);
    return isValid(d) ? d : new Date();
  }
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (/^\d+$/.test(trimmed)) {
      const d = new Date(Number(trimmed));
      if (isValid(d)) return d;
    }
    const d = new Date(trimmed);
    if (isValid(d)) return d;
  }
  return new Date();
}

/**
 * Resolves full BCP 47 locale tag from country, lan, lang, locale or env variables.
 */
export function resolveLocaleTag(
  lan?: LanguageOrCountry,
  country?: string,
  lang?: LanguageOrCountry,
  locale?: LanguageOrCountry
): string {
  // 1. Explicit country override with language
  if (country && lan) {
    const cleanCountry = country.trim().toUpperCase();
    const cleanLan = lan.toString().trim().toLowerCase();
    return `${cleanLan}-${cleanCountry}`;
  }

  // 2. Direct country tag check
  if (country) {
    const cleanCountry = country.trim().toUpperCase();
    if (COUNTRY_TO_LOCALE_MAP[cleanCountry]) return COUNTRY_TO_LOCALE_MAP[cleanCountry];
  }

  const input = (
    lan ||
    lang ||
    locale ||
    process.env.NEXT_PUBLIC_LANGUAGE || 'en'
  )
    .toString()
    .trim();

  const upperInput = input.toUpperCase();
  if (COUNTRY_TO_LOCALE_MAP[upperInput]) {
    return COUNTRY_TO_LOCALE_MAP[upperInput];
  }

  const lowerInput = input.toLowerCase();
  if (LANG_TO_LOCALE_MAP[lowerInput]) {
    return LANG_TO_LOCALE_MAP[lowerInput];
  }

  return input;
}

/**
 * Helper to match date-fns locale objects when date-fns custom format is used.
 */
function getDateFnsLocale(localeTag: string) {
  const lang = localeTag.split('-')[0].toLowerCase();
  switch (lang) {
    case 'bn':
      return bn;
    case 'hi':
      return hi;
    case 'ar':
      return ar;
    case 'fr':
      return fr;
    case 'de':
      return de;
    case 'es':
      return es;
    case 'ja':
      return ja;
    case 'zh':
      return zhCN;
    default:
      return enUS;
  }
}

/**
 * Core date formatting function with international country & language support.
 */
export function formatDateValue({
  date,
  lan,
  country,
  lang,
  locale,
  format: customFormat,
  type = 'date',
}: {
  date?: Date | string | number | null;
  lan?: LanguageOrCountry;
  country?: string;
  lang?: LanguageOrCountry;
  locale?: LanguageOrCountry;
  format?: string;
  type?: 'date' | 'time' | 'datetime' | 'relative';
}): string {
  const d = parseDateInput(date);
  const localeTag = resolveLocaleTag(lan, country, lang, locale);

  // 1. Relative time formatting
  if (type === 'relative') {
    try {
      const diffMs = d.getTime() - Date.now();
      const diffSecs = Math.round(diffMs / 1000);
      const diffMins = Math.round(diffSecs / 60);
      const diffHours = Math.round(diffMins / 60);
      const diffDays = Math.round(diffHours / 24);

      const rtf = new Intl.RelativeTimeFormat(localeTag, { numeric: 'auto' });
      if (Math.abs(diffDays) >= 1) return rtf.format(diffDays, 'day');
      if (Math.abs(diffHours) >= 1) return rtf.format(diffHours, 'hour');
      if (Math.abs(diffMins) >= 1) return rtf.format(diffMins, 'minute');
      return rtf.format(diffSecs, 'second');
    } catch {
      // Fallback to date-fns relative
      const dateFnsLoc = getDateFnsLocale(localeTag);
      const rel = formatDistanceToNow(d, { addSuffix: true, locale: dateFnsLoc });
      return localeTag.startsWith('bn') ? toBnDigits(rel) : rel;
    }
  }

  // 2. Custom date-fns format pattern provided
  if (customFormat) {
    const isLangCode = /^(en|bn|hi|ar|fr|de|es|ja|zh|BD|IN|US|GB)$/i.test(customFormat.trim());
    if (!isLangCode) {
      try {
        const dateFnsLoc = getDateFnsLocale(localeTag);
        let result = formatDateFns(d, customFormat, { locale: dateFnsLoc });
        if (localeTag.startsWith('bn')) {
          result = toBnDigits(result);
        }
        return result;
      } catch {
        // Fallback to Intl formatter below
      }
    }
  }

  // 3. International native Intl.DateTimeFormat (Default & recommended)
  try {
    let options: Intl.DateTimeFormatOptions;

    if (type === 'time') {
      options = { hour: '2-digit', minute: '2-digit' };
    } else if (type === 'datetime') {
      options = {
        weekday: 'long',
        month: 'long',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      };
    } else {
      // Full date format: "Saturday, August 01, 2026" / "শনিবার, ০১ আগস্ট, ২০২৬"
      options = {
        weekday: 'long',
        month: 'long',
        day: '2-digit',
        year: 'numeric',
      };
    }

    const formatter = new Intl.DateTimeFormat(localeTag, options);
    return formatter.format(d);
  } catch {
    // Fallback if browser/environment doesn't support the specific locale string
    const isBn = localeTag.startsWith('bn');
    const pattern = isBn ? 'EEEE, dd MMMM, yyyy' : 'EEEE, MMMM dd, yyyy';
    let formatted = formatDateFns(d, pattern, { locale: isBn ? bn : enUS });
    if (isBn) formatted = toBnDigits(formatted);
    return formatted;
  }
}

export default function DateComponent({
  lan,
  country,
  lang,
  locale,
  date,
  format: customFormat,
  type = 'date',
  className,
  children,
  ...props
}: DateProps) {
  const parsedDate = parseDateInput(date);
  const formattedText = formatDateValue({
    date: parsedDate,
    lan,
    country,
    lang,
    locale,
    format: customFormat,
    type,
  });

  return (
    <time
      dateTime={parsedDate.toISOString()}
      className={className}
      suppressHydrationWarning
      {...props}
    >
      {children || formattedText}
    </time>
  );
}
