import { DateTime, Settings } from 'luxon';

export const DATE_FORMAT = {
    date: 'dd-LLL-y',
    fullDate: 'dd-LLL-y t',
    fullDateWithZone: 'dd-LLL-y HH:mm:ss (ZZZZ)',
} as const;

let timezone: string | undefined;

Settings.defaultLocale = 'en-IN';

export const luxon = DateTime;

export const getTimezone = () => {
    return timezone || (timezone = luxon.local().zoneName);
};

export const localeDate = (date: string | number | any, format: keyof typeof DATE_FORMAT = 'fullDate', zone: string = getTimezone()) => {
    let dateTime: DateTime;

    if (typeof date === 'number' || !isNaN(+date)) {
        dateTime = luxon.fromMillis(date.toString().length === 10 ? date * 1000 : date, { zone });
    } else if (date instanceof Date) {
        dateTime = luxon.fromJSDate(date, { zone });
    } else {
        dateTime = luxon.fromISO(date, { zone });
    }

    return dateTime.toFormat(DATE_FORMAT[format]);
};
