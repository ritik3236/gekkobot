export const fnCapitalize = (str: string) => {
    return str ? (str.split(/[_-]/).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')) : '';
};

export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const numberFormatter = (number: number | string): string => {
    if (typeof window !== 'undefined') {
        const userPreference = localStorage.getItem('numberFormater') || 'en-US'; // Fallback to "en-US"

        return Intl.NumberFormat(userPreference).format(Number(number)).toString();
    }

    const defaultLocale = 'en-US';

    return Intl.NumberFormat(defaultLocale).format(Number(number)).toString();
};

export const truncateText = (text: string, length: number = 24, direction: 'end' | 'middle' = 'end'): string => {
    if (text.length <= length) {
        return text;
    }

    const ellipsis = '...';
    const ellipsisLength = ellipsis.length;

    if (direction === 'end') {
        return text.slice(0, length - ellipsisLength) + ellipsis;
    } else if (direction === 'middle') {
        const halfLength = (length - ellipsisLength) / 2;
        const start = text.slice(0, Math.ceil(halfLength));
        const end = text.slice(-Math.floor(halfLength));

        return `${start}${ellipsis}${end}`;
    }
};

export const generateRandomId = () => {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let randomId = 'payid-';

    for (let i = 0; i < 10; i++) {
        randomId += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    return randomId;
};

const genArrayArg = (key: string, values: any[]): string =>
    values.map((value) => `${key}[]=${encodeURIComponent(value)}`).join('&');

const genPlainArg = (key: string, value: any): string =>
    `${key}=${encodeURIComponent(value)}`;

const isEmptyValue = (value: any): boolean =>
    value === '' || value === null || value === undefined || (Array.isArray(value) && value.length === 0);

export const buildQueryString = (action: Record<string, any>, excludeKeys: string[] = []): string => {
    const queryString = Object.entries(action)
        .filter(([key, value]) =>
            !excludeKeys.includes(key) && !isEmptyValue(value)
        )
        .map(([key, value]) =>
            Array.isArray(value) ? genArrayArg(key, value) : genPlainArg(key, value)
        )
        .join('&');

    return queryString ? `?${queryString}` : '';
};

export const formatNumber = (number: string | number) => {
    if (!+number) {
        return number;
    }

    const formatter = new Intl.NumberFormat('en-US');

    return formatter.format(+number);
};
