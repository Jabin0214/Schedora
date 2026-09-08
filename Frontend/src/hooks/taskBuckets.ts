import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import type { CombinedTask } from '../types/api';

dayjs.extend(isBetween);

const getPlannedDate = (task: CombinedTask): string | undefined => task.scheduledAt;

export interface TaskBuckets {
  overdueTasks: CombinedTask[];
  todayTasks: CombinedTask[];
  tomorrowTasks: CombinedTask[];
  upcomingTasks: CombinedTask[];
  unscheduledTasks: CombinedTask[];
}

export function sortTasks(tasks: CombinedTask[]): CombinedTask[] {
  const list = [...tasks];
  list.sort((a, b) => {
    const da = getPlannedDate(a);
    const db = getPlannedDate(b);
    if (da && db) return dayjs(da).valueOf() - dayjs(db).valueOf();
    if (da) return -1;
    if (db) return 1;
    return 0;
  });
  return list;
}

export function bucketTasks(tasks: CombinedTask[], now = dayjs()): TaskBuckets {
  const sortedTasks = sortTasks(tasks);
  const startOfToday = now.startOf('day');
  const endOfToday = now.endOf('day');
  const startOfTomorrow = startOfToday.add(1, 'day');
  const endOfTomorrow = startOfTomorrow.endOf('day');

  return {
    overdueTasks: sortedTasks.filter((item) => {
      const d = getPlannedDate(item);
      return d ? dayjs(d).isBefore(startOfToday) : false;
    }),
    todayTasks: sortedTasks.filter((item) => {
      const d = getPlannedDate(item);
      return d ? dayjs(d).isBetween(startOfToday, endOfToday, 'minute', '[]') : false;
    }),
    tomorrowTasks: sortedTasks.filter((item) => {
      const d = getPlannedDate(item);
      return d ? dayjs(d).isBetween(startOfTomorrow, endOfTomorrow, 'minute', '[]') : false;
    }),
    upcomingTasks: sortedTasks.filter((item) => {
      const d = getPlannedDate(item);
      return d ? dayjs(d).isAfter(endOfTomorrow) : false;
    }),
    unscheduledTasks: sortedTasks.filter((item) => !getPlannedDate(item)),
  };
}
