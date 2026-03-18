import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Button, Tag, Tooltip, Space } from 'antd';
import {
  LeftOutlined, RightOutlined, CalendarOutlined,
  DollarOutlined, WarningOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import isBetween from 'dayjs/plugin/isBetween';
import { useTasks } from '../hooks/useTasks';
import { useInspectionTypes } from '../hooks/useInspectionTypes';
import { IndTitle } from '../components/shared';
import type { CombinedTask } from '../types/api';

dayjs.extend(isoWeek);
dayjs.extend(isBetween);

// ── Time grid constants ────────────────────────────────────────
const START_HOUR   = 7;
const END_HOUR     = 22;
const SLOT_HEIGHT  = 64;                      // px per hour
const TIME_COL_W   = 52;                      // px for time label column
const TASK_H       = Math.round(SLOT_HEIGHT / 2); // 30-min duration → 32px
const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * SLOT_HEIGHT;
const HOURS        = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

// Ant Design preset color name → CSS hex (for border/accent use)
const COLOR_HEX: Record<string, string> = {
  cyan:     '#13c2c2',
  blue:     '#1677ff',
  geekblue: '#2f54eb',
  purple:   '#722ed1',
  magenta:  '#eb2f96',
  gold:     '#faad14',
  orange:   '#fa8c16',
  volcano:  '#fa541c',
  red:      '#f5222d',
  green:    '#52c41a',
  lime:     '#a0d911',
  default:  '#ACABA9',
};
const toHex = (name: string) => COLOR_HEX[name] ?? '#2383E2';

// ── Task card (time-grid version) ──────────────────────────────
const GridTaskCard: React.FC<{
  task:      CombinedTask;
  typeName:  string;
  typeColor: string;
  top:       number;
  isPast:    boolean;
}> = ({ task, typeName, typeColor, top, isPast }) => {
  const time     = task.scheduledAt ? dayjs(task.scheduledAt).format('HH:mm') : '';
  const colorHex = toHex(typeColor);

  return (
    <Tooltip
      title={
        <div style={{ fontSize: '12px' }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{task.propertyAddress}</div>
          <div style={{ color: '#d9d9d9' }}>{typeName} · {task.isBillable ? 'Charged' : 'Free'}</div>
          {task.scheduledAt && <div style={{ color: '#d9d9d9' }}>{dayjs(task.scheduledAt).format('ddd MMM D, HH:mm')}</div>}
          {task.notes && <div style={{ color: '#d9d9d9', marginTop: 2 }}>{task.notes}</div>}
        </div>
      }
      placement="right"
      mouseEnterDelay={0.3}
    >
      <div
        style={{
          position:    'absolute',
          top,
          left:        4,
          right:       4,
          height:      TASK_H,
          background:  isPast ? '#F7F7F5' : '#FFFFFF',
          border:      `1px solid ${colorHex}33`,
          borderLeft:  `3px solid ${isPast ? '#ACABA9' : colorHex}`,
          borderRadius: 4,
          padding:     '0 7px',
          overflow:    'hidden',
          cursor:      'default',
          opacity:     isPast ? 0.6 : 1,
          zIndex:      1,
          display:     'flex',
          alignItems:  'center',
          gap:         6,
          transition:  'background 0.1s',
        }}
        onMouseEnter={e => { if (!isPast) (e.currentTarget as HTMLDivElement).style.background = '#EBEBEA'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = isPast ? '#F7F7F5' : '#FFFFFF'; }}
      >
        {/* Time */}
        <span style={{ fontSize: '11px', fontWeight: 600, color: isPast ? '#ACABA9' : colorHex, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {time}
        </span>
        {/* Address */}
        <span style={{ fontSize: '12px', fontWeight: 600, color: isPast ? '#ACABA9' : '#37352F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {task.propertyAddress ?? `Property #${task.propertyId}`}
        </span>
        {/* Billable dot */}
        {task.isBillable && (
          <span style={{ fontSize: '10px', color: '#CB912F', flexShrink: 0 }}>$</span>
        )}
      </div>
    </Tooltip>
  );
};

// ── Calendar page ──────────────────────────────────────────────
const CalendarPage: React.FC = () => {
  const [weekStart, setWeekStart] = useState<Dayjs>(() => dayjs().isoWeekday(1).startOf('day'));
  const { overdueTasks, todayTasks, upcomingTasks, unscheduledTasks, loading, fetchTasks } = useTasks();
  const { types } = useInspectionTypes();
  const scrollRef = useRef<HTMLDivElement>(null);

  const allScheduledTasks = useMemo(
    () => [...overdueTasks, ...todayTasks, ...upcomingTasks],
    [overdueTasks, todayTasks, upcomingTasks]
  );

  const getTypeColor = (id?: number) => types.find(t => t.id === id)?.color ?? 'default';
  const getTypeName  = (id?: number) => types.find(t => t.id === id)?.name  ?? `Type ${id ?? '?'}`;

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day')),
    [weekStart]
  );

  const tasksByDay = useMemo(() => {
    const map = new Map<string, CombinedTask[]>();
    for (const task of allScheduledTasks) {
      if (!task.scheduledAt) continue;
      const key = dayjs(task.scheduledAt).format('YYYY-MM-DD');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    return map;
  }, [allScheduledTasks]);

  const today         = dayjs().startOf('day');
  const now           = dayjs();
  const weekLabel     = `${weekStart.format('MMM D')} – ${weekStart.add(6, 'day').format('MMM D, YYYY')}`;
  const isCurrentWeek = weekStart.isSame(dayjs().isoWeekday(1).startOf('day'), 'day');

  const weekTaskCount = useMemo(
    () => weekDays.reduce((sum, d) => sum + (tasksByDay.get(d.format('YYYY-MM-DD'))?.length ?? 0), 0),
    [weekDays, tasksByDay]
  );

  // Scroll to 8am on mount / week navigation
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = (8 - START_HOUR) * SLOT_HEIGHT;
    }
  }, [weekStart]);

  // Current time indicator
  const nowTop           = (now.hour() - START_HOUR) * SLOT_HEIGHT + (now.minute() / 60) * SLOT_HEIGHT;
  const showNowIndicator = isCurrentWeek && now.hour() >= START_HOUR && now.hour() < END_HOUR;

  return (
    <div>
      {/* ── Toolbar ── */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #E9E9E7', flexWrap: 'wrap', gap: 8 }}>
        <IndTitle>Calendar</IndTitle>
        <Space size={6} wrap>
          <Button size="small" icon={<CalendarOutlined />} onClick={fetchTasks} loading={loading}>
            Refresh
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Button size="small" icon={<LeftOutlined />} onClick={() => setWeekStart(d => d.subtract(7, 'day'))} />
            <span style={{ fontSize: '13px', fontWeight: 500, color: isCurrentWeek ? '#2383E2' : '#787774', minWidth: 160, textAlign: 'center', userSelect: 'none' }}>
              {weekLabel}
            </span>
            <Button size="small" icon={<RightOutlined />} onClick={() => setWeekStart(d => d.add(7, 'day'))} />
          </div>
          {!isCurrentWeek && (
            <Button size="small" onClick={() => setWeekStart(dayjs().isoWeekday(1).startOf('day'))}>
              Today
            </Button>
          )}
        </Space>
      </div>

      {/* ── Overdue banner ── */}
      {overdueTasks.length > 0 && (
        <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(224,62,62,0.05)', border: '1px solid #E03E3E', borderLeft: '3px solid #E03E3E', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          <WarningOutlined style={{ color: '#E03E3E', fontSize: 13 }} />
          <span style={{ fontSize: '13px', color: '#E03E3E', fontWeight: 500 }}>
            {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: '13px', color: '#787774' }}>
            — {overdueTasks.map(t => t.propertyAddress ?? `#${t.propertyId}`).join(' · ')}
          </span>
        </div>
      )}

      {/* ── Week stats ── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: '12px', color: '#787774' }}>
        <span>
          Week: <span style={{ color: weekTaskCount > 0 ? '#37352F' : '#ACABA9', fontWeight: 500 }}>{weekTaskCount}</span> task{weekTaskCount !== 1 ? 's' : ''}
        </span>
        {unscheduledTasks.length > 0 && (
          <span>Unscheduled: <span style={{ color: '#CB912F', fontWeight: 500 }}>{unscheduledTasks.length}</span></span>
        )}
      </div>

      {/* ── Time grid ── */}
      <div style={{ border: '1px solid #E9E9E7', borderRadius: 6, overflow: 'hidden' }}>

        {/* Sticky day-header row */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E9E9E7', background: '#F7F7F5' }}>
          {/* Time column spacer */}
          <div style={{ width: TIME_COL_W, flexShrink: 0, borderRight: '1px solid #E9E9E7' }} />
          {/* Day headers */}
          {weekDays.map(day => {
            const isToday = day.isSame(today, 'day');
            const isPast  = day.isBefore(today, 'day');
            return (
              <div
                key={day.format('YYYY-MM-DD')}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '8px 4px 6px',
                  borderRight: '1px solid #E9E9E7',
                  borderBottom: isToday ? '2px solid #2383E2' : '2px solid transparent',
                  background: isToday ? 'rgba(35,131,226,0.03)' : 'transparent',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: isToday ? '#2383E2' : isPast ? '#ACABA9' : '#37352F' }}>
                  {day.format('ddd')}
                </div>
                <div style={{ fontSize: '20px', fontWeight: 700, lineHeight: 1.2, marginTop: 1, color: isToday ? '#2383E2' : isPast ? '#ACABA9' : '#37352F' }}>
                  {day.format('D')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Scrollable time body */}
        <div ref={scrollRef} style={{ overflowY: 'auto', maxHeight: 560 }}>
          <div style={{ display: 'flex', height: TOTAL_HEIGHT }}>

            {/* Time label column */}
            <div style={{ width: TIME_COL_W, flexShrink: 0, position: 'relative', borderRight: '1px solid #E9E9E7', background: '#FAFAF9' }}>
              {HOURS.map(h => (
                <div key={h} style={{
                  position: 'absolute',
                  top: (h - START_HOUR) * SLOT_HEIGHT - 9,
                  right: 8,
                  fontSize: '11px',
                  color: '#ACABA9',
                  lineHeight: 1,
                  userSelect: 'none',
                }}>
                  {h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map(day => {
              const key     = day.format('YYYY-MM-DD');
              const isToday = day.isSame(today, 'day');
              const isPast  = day.isBefore(today, 'day');
              const tasks   = tasksByDay.get(key) ?? [];

              return (
                <div
                  key={key}
                  style={{
                    flex: 1,
                    position: 'relative',
                    borderRight: '1px solid #E9E9E7',
                    background: isToday ? 'rgba(35,131,226,0.02)' : 'transparent',
                  }}
                >
                  {/* Hourly grid lines */}
                  {HOURS.map(h => (
                    <div
                      key={h}
                      style={{
                        position: 'absolute',
                        top: (h - START_HOUR) * SLOT_HEIGHT,
                        left: 0,
                        right: 0,
                        borderTop: h === START_HOUR ? 'none' : '1px solid #F0F0EE',
                        pointerEvents: 'none',
                      }}
                    />
                  ))}

                  {/* Current time indicator */}
                  {isToday && showNowIndicator && (
                    <div style={{ position: 'absolute', top: nowTop, left: 0, right: 0, zIndex: 2, pointerEvents: 'none' }}>
                      <div style={{ position: 'absolute', top: -4, left: -1, width: 8, height: 8, borderRadius: '50%', background: '#E03E3E' }} />
                      <div style={{ borderTop: '2px solid #E03E3E' }} />
                    </div>
                  )}

                  {/* Task cards */}
                  {tasks.map(task => {
                    if (!task.scheduledAt) return null;
                    const d   = dayjs(task.scheduledAt);
                    const top = Math.max(0, Math.min(
                      TOTAL_HEIGHT - TASK_H,
                      (d.hour() - START_HOUR) * SLOT_HEIGHT + (d.minute() / 60) * SLOT_HEIGHT
                    ));
                    return (
                      <GridTaskCard
                        key={task.id}
                        task={task}
                        typeName={getTypeName(task.type)}
                        typeColor={getTypeColor(task.type)}
                        top={top}
                        isPast={isPast && !isToday}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Unscheduled tasks ── */}
      {unscheduledTasks.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#787774', marginBottom: 8 }}>
            Unscheduled
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {unscheduledTasks.map(t => (
              <div key={t.id} style={{
                background: '#F7F7F5',
                border: '1px solid #E9E9E7',
                borderLeft: `3px solid ${toHex(getTypeColor(t.type))}`,
                borderRadius: 4,
                padding: '5px 10px',
                fontSize: '12px',
                minWidth: 140,
                maxWidth: 220,
              }}>
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#37352F', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.propertyAddress ?? `Property #${t.propertyId}`}
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <Tag color={getTypeColor(t.type)} style={{ fontSize: '10px', lineHeight: '14px', padding: '0 4px', margin: 0 }}>
                    {getTypeName(t.type)}
                  </Tag>
                  {t.isBillable && (
                    <span style={{ fontSize: '11px', color: '#CB912F' }}>
                      <DollarOutlined style={{ fontSize: 9 }} /> Charged
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
