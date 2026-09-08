import dayjs from 'dayjs';
import type { CSSProperties } from 'react';

export const disabledMinutes = Array.from({ length: 60 }, (_, i) => i).filter(i => i % 10 !== 0);

export const tagStyle: CSSProperties = {
  margin: 0,
  fontSize: '12px',
  letterSpacing: '0.2px',
};

export const formatTaskDate = (dateStr?: string): string => {
  if (!dateStr) return 'Unscheduled';
  return dayjs(dateStr).format('MM-DD ddd HH:mm');
};
