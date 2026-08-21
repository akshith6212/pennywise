import {
  formatVendorName,
  isEmpty,
  JSONCopy,
  sortByKey,
  sortBy2Key,
  getUnixTimestamp,
  getCurrentDate,
  getDateMonth,
  getDateMonthTime,
  sleep,
} from '../../src/utility/utility';

describe('isEmpty', () => {
  it('returns true for null', () => {
    expect(isEmpty(null)).toBe(true);
  });

  it('returns true for undefined', () => {
    expect(isEmpty(undefined)).toBe(true);
  });

  it('returns true for empty string', () => {
    expect(isEmpty('')).toBe(true);
  });

  it('returns true for whitespace-only string', () => {
    expect(isEmpty('   ')).toBe(true);
  });

  it('returns false for non-empty string', () => {
    expect(isEmpty('hello')).toBe(false);
  });

  it('returns false for string with leading/trailing spaces', () => {
    expect(isEmpty(' hello ')).toBe(false);
  });
});

describe('formatVendorName', () => {
  it('returns empty array for empty input', () => {
    expect(formatVendorName('')).toEqual(['']);
  });

  it('returns lowercase name for regular vendor', () => {
    expect(formatVendorName('Amazon')).toEqual(['amazon']);
  });

  it('splits UPI format into name and upi id', () => {
    const result = formatVendorName('JOHN DOE john@upi');
    expect(result).toEqual(['john doe', 'john@upi']);
  });

  it('handles manual entry text', () => {
    expect(formatVendorName('manual entry')).toEqual(['manual entry']);
  });

  it('handles manual entry with UPI format', () => {
    const result = formatVendorName('manual entry user@paytm');
    expect(result).toEqual(['manual entry', 'user@paytm']);
  });

  it('handles vendor name with mixed case', () => {
    expect(formatVendorName('Swiggy Food')).toEqual(['swiggy food']);
  });
});

describe('JSONCopy', () => {
  it('deep copies an object', () => {
    const original = {a: 1, b: {c: 2}};
    const copy = JSONCopy(original);
    expect(copy).toEqual(original);
    expect(copy).not.toBe(original);
    expect(copy.b).not.toBe(original.b);
  });

  it('deep copies an array', () => {
    const original = [1, 2, {a: 3}];
    const copy = JSONCopy(original);
    expect(copy).toEqual(original);
    expect(copy).not.toBe(original);
  });
});

describe('sortByKey', () => {
  it('sorts array by key in descending order', () => {
    const arr = [{cost: 100}, {cost: 500}, {cost: 200}];
    const sorted = sortByKey(arr, 'cost');
    expect(sorted.map(i => i.cost)).toEqual([500, 200, 100]);
  });

  it('handles empty array', () => {
    expect(sortByKey([], 'cost')).toEqual([]);
  });
});

describe('sortBy2Key', () => {
  it('sorts array by nested key in descending order', () => {
    const arr = [
      {data: {value: 10}},
      {data: {value: 30}},
      {data: {value: 20}},
    ];
    const sorted = sortBy2Key(arr, 'data', 'value');
    expect(sorted.map(i => i.data.value)).toEqual([30, 20, 10]);
  });
});

describe('getUnixTimestamp', () => {
  it('returns millisecond timestamp for a date string', () => {
    const ts = getUnixTimestamp('2024-01-01');
    expect(typeof ts).toBe('number');
    expect(ts).toBeGreaterThan(0);
  });

  it('returns millisecond timestamp for a Date object', () => {
    const date = new Date('2024-06-15');
    const ts = getUnixTimestamp(date);
    expect(typeof ts).toBe('number');
    expect(ts).toBeGreaterThan(0);
  });
});

describe('getCurrentDate', () => {
  it('returns date in default YYYY-MM-DD format', () => {
    const result = getCurrentDate();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns date in custom format', () => {
    const result = getCurrentDate('YYYYMMDD_HHmmss');
    expect(result).toMatch(/^\d{8}_\d{6}$/);
  });
});

describe('getDateMonth', () => {
  it('formats date as DD MMM', () => {
    const ts = new Date('2024-03-15').getTime();
    const result = getDateMonth(ts);
    expect(result).toBe('15 Mar');
  });
});

describe('getDateMonthTime', () => {
  it('formats date with time', () => {
    const result = getDateMonthTime(Date.now());
    expect(result).toMatch(/\d{2} \w{3} \d{2}, \d{2}:\d{2} (AM|PM)/);
  });
});

describe('sleep', () => {
  it('resolves after specified milliseconds', async () => {
    const start = Date.now();
    await sleep(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });
});
