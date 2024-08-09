import { rankItem } from '@tanstack/match-sorter-utils';
import { FilterFn } from '@tanstack/react-table';
import moment from 'moment';

export const formattedArray = (data: string[]) => {
  return data?.map((name) => ({
    label: name,
    value: name,
  }));
};

export const convertTimestampToDateTime = (timestamp: number) => {
  return moment.unix(timestamp).format('YYYY-MM-DD HH:mm:ss');
};

export const parseVersionString = (version: string) => {
  const parts = version.split('.');

  return {
    major: parts[0] !== 'x' ? parseInt(parts[0], 10) : -1,
    minor: parts[1] !== 'x' ? parseInt(parts[1], 10) : -1,
    patch: parts[2] !== 'x' ? parseInt(parts[2], 10) : -1,
  };
};

export const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value);
  addMeta({
    itemRank,
  });
  return itemRank.passed;
};

export const formatDate = (date: Date, format: string) => {
  return moment(date).format(format);
};

export const formatDateTime = (date: string) => {
  const format = 'DD-MM-YYYY-HH:mm:ss';

  // Parse the date string using moment
  const momentDate = moment(date, format);

  // Format the date as MM/DD/YYYY
  const formattedDate = momentDate.format('M/D/YYYY');

  // Format the time as h.mm A (AM/PM)
  const formattedTime = momentDate.format('h.mm A');

  return {
    formattedDate,
    formattedTime,
  };
};
