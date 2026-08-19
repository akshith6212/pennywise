import dayjs, {Dayjs} from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import localizedFormat from 'dayjs/plugin/localizedFormat';

dayjs.extend(customParseFormat);
dayjs.extend(localizedFormat);

export const getDayJs = (date: Date = new Date()) => {
  return dayjs(date);
};

export const getUnixTimestamp = (date: Date | string) => {
  return dayjs(date).unix() * 1000;
};

export const getCurrentDate = (format = 'YYYY-MM-DD') => {
  return dayjs().format(format);
};

export const getDateFormat = (date: Dayjs) => {
  return dayjs(date).format('YYYY-MM-DD');
};

export const getDateFromString = (date: string, format = 'YYYY-MM-DD') => {
  return dayjs(date, format);
};

export const getDateMonth = (date: number) => {
  return dayjs(new Date(date)).format('DD MMM');
};

export const getDateMonthTime = (date: number = Date.now()) => {
  return dayjs(new Date(date)).format('DD MMM YY, hh:mm A');
};

export const getDateMedJs = (seconds: number) => {
  return dayjs(seconds * 1000).format('DD MMM YY, hh:mm A');
};

export const getDateJsIdFormat = (date: Date) => {
  return dayjs(date).format('DD MMM YY, hh:mm A');
};

export const getTimeJs = (date: Date) => {
  return dayjs(date).format('hh:mm A');
};

export const getDateToEpoch = (date: Date): number => {
  return date.valueOf();
};

export const getISODate = (seconds: number): Date => {
  return new Date(seconds * 1000);
};

export const getDateTimeSecFromISO = (isoTime: string) => {
  return dayjs(isoTime).format('MM/DD/YYYY, hh:mm:ss A');
};

export const sortBy2Key = <T extends Record<string, any>>(
  array: T[],
  key: string,
  subKey: string,
) => {
  return array.sort((a, b) => {
    return b[key][subKey] - a[key][subKey];
  });
};

export const sortByKey = <T extends Record<string, any>>(
  array: T[],
  key: string,
) => {
  return array.sort((a, b) => {
    return b[key] - a[key];
  });
};

export const JSONCopy = (obj: unknown) => {
  return JSON.parse(JSON.stringify(obj));
};

export const formatVendorName = (vendor: string): string[] => {
  if (!vendor) {
    return [''];
  }

  const upiPattern = /^(.+)\s+([^\s@]+@[^\s@]+)$/;
  const match = vendor.match(upiPattern);

  if (match && !isEmpty(match[1]) && !isEmpty(match[2])) {
    let name = match[1].trim();
    const upiId = match[2].trim();

    if (name.includes('manual entry')) {
      name = 'manual entry';
    }
    return [name.toLowerCase(), upiId.toLowerCase()];
  }

  if (vendor.includes('manual entry')) {
    vendor = 'manual entry';
  }

  return [vendor.toLowerCase()];
};

export const isEmpty = (
  str: string | undefined | null,
): str is null | undefined => {
  return str === null || str === undefined || str.trim().length === 0;
};

export const sleep = async (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
