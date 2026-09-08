import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import type { CombinedTask } from '../types/api';
import { bucketTasks } from './taskBuckets';

const makeTask = (id: number, scheduledAt?: string): CombinedTask => ({
  id,
  taskType: 'inspection',
  scheduledAt,
});

describe('bucketTasks', () => {
  it('separates tomorrow tasks from later upcoming tasks', () => {
    const now = dayjs('2026-07-06T09:00:00');
    const tasks = [
      makeTask(1, '2026-07-06T14:00:00'),
      makeTask(2, '2026-07-07T10:00:00'),
      makeTask(3, '2026-07-08T11:00:00'),
      makeTask(4),
    ];

    const buckets = bucketTasks(tasks, now);

    expect(buckets.todayTasks.map(task => task.id)).toEqual([1]);
    expect(buckets.tomorrowTasks.map(task => task.id)).toEqual([2]);
    expect(buckets.upcomingTasks.map(task => task.id)).toEqual([3]);
    expect(buckets.unscheduledTasks.map(task => task.id)).toEqual([4]);
  });
});
