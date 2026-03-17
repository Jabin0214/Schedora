import React, { useMemo, useState } from 'react';
import { Button, Tag, Tooltip, Space, Badge } from 'antd';
import {
  LeftOutlined, RightOutlined, CalendarOutlined,
  ClockCircleOutlined, DollarOutlined, WarningOutlined,
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

// ── Helpers ────────────────────────────────────────────────────
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ── Task card ─────────────────────────────────────────────────
const TaskCard: React.FC<{
  task: CombinedTask;
  typeColor: string;
  typeName: string;
  dimmed?: boolean;
}> = ({ task, typeColor, typeName, dimmed }) => {
  const time = task.scheduledAt
    ? dayjs(task.scheduledAt).format('HH:mm')
    : null;

  const card = (
    <div
      style={{
        background: dimmed ? '#F7F7F5' : '#FFFFFF',
        border: `1px solid ${dimmed ? '#F0F0EE' : '#E9E9E7'}`,
        borderLeft: `3px solid ${dimmed ? '#ACABA9' : typeColor || '#2383E2'}`,
        borderRadius: 4,
        padding: '5px 8px',
        marginBottom: 4,
        cursor: 'default',
        opacity: dimmed ? 0.6 : 1,
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => {
        if (!dimmed) (e.currentTarget as HTMLDivElement).style.background = '#EBEBEA';
      }}
      onMouseLeave={e => {
        if (!dimmed) (e.currentTarget as HTMLDivElement).style.background = '#FFFFFF';
      }}
    >
      {/* Address */}
      <div style={{
        fontSize: '13px',
        fontWeight: 600,
        color: dimmed ? '#ACABA9' : '#37352F',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        marginBottom: 3,
        maxWidth: '100%',
      }}>
        {task.propertyAddress ?? `Property #${task.propertyId}`}
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        <Tag
          color={typeColor || 'default'}
          style={{ fontSize: '10px', lineHeight: '14px', padding: '0 4px', margin: 0, letterSpacing: '0.2px' }}
        >
          {typeName}
        </Tag>

        {time && (
          <span style={{ fontSize: '11px', color: '#787774', display: 'flex', alignItems: 'center', gap: 2 }}>
            <ClockCircleOutlined style={{ fontSize: 9 }} />
            {time}
          </span>
        )}

        {task.isBillable && (
          <span style={{ fontSize: '11px', color: '#CB912F', display: 'flex', alignItems: 'center', gap: 2 }}>
            <DollarOutlined style={{ fontSize: 9 }} />
            Charged
          </span>
        )}
      </div>

      {task.notes && (
        <div style={{
          fontSize: '11px',
          color: '#ACABA9',
          marginTop: 3,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {task.notes}
        </div>
      )}
    </div>
  );

  // Tooltip with full address on hover
  return (
    <Tooltip
      title={
        <div style={{ fontSize: '12px' }}>
          <div style={{ fontWeight: 500, marginBottom: 2 }}>{task.propertyAddress}</div>
          <div style={{ color: '#787774' }}>{typeName} · {task.isBillable ? 'Charged' : 'Free'}</div>
          {task.scheduledAt && <div style={{ color: '#787774' }}>{dayjs(task.scheduledAt).format('ddd MMM D, HH:mm')}</div>}
          {task.notes && <div style={{ color: '#787774', marginTop: 2 }}>{task.notes}</div>}
        </div>
      }
      placement="right"
      mouseEnterDelay={0.4}
    >
      {card}
    </Tooltip>
  );
};

// ── Day column ────────────────────────────────────────────────
const DayColumn: React.FC<{
  day: Dayjs;
  tasks: CombinedTask[];
  isToday: boolean;
  isPast: boolean;
  getTypeColor: (id?: number) => string;
  getTypeName: (id?: number) => string;
}> = ({ day, tasks, isToday, isPast, getTypeColor, getTypeName }) => {
  const sorted = useMemo(
    () => [...tasks].sort((a, b) =>
      a.scheduledAt && b.scheduledAt
        ? dayjs(a.scheduledAt).valueOf() - dayjs(b.scheduledAt).valueOf()
        : 0
    ),
    [tasks]
  );

  return (
    <div style={{
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid #E9E9E7',
    }}>
      {/* Day header */}
      <div style={{
        padding: '8px 6px 6px',
        borderBottom: `2px solid ${isToday ? '#2383E2' : '#E9E9E7'}`,
        background: isToday ? 'rgba(35, 131, 226, 0.04)' : '#F7F7F5',
        textAlign: 'center',
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          color: isToday ? '#2383E2' : isPast ? '#ACABA9' : '#37352F',
        }}>
          {day.format('ddd')}
        </div>
        <div style={{
          fontSize: '20px',
          fontWeight: 700,
          color: isToday ? '#2383E2' : isPast ? '#ACABA9' : '#37352F',
          lineHeight: '1.2',
          marginTop: 2,
        }}>
          {day.format('D')}
        </div>
        {tasks.length > 0 && (
          <Badge
            count={tasks.length}
            style={{
              background: isToday ? '#2383E2' : '#E9E9E7',
              color: isToday ? '#FFFFFF' : '#787774',
              fontSize: '10px',
              boxShadow: 'none',
              minWidth: 16,
              height: 16,
              lineHeight: '16px',
              padding: '0 4px',
              borderRadius: 8,
              marginTop: 4,
            }}
          />
        )}
      </div>

      {/* Task list */}
      <div style={{
        flex: 1,
        padding: '6px 5px',
        background: isToday ? 'rgba(35, 131, 226, 0.02)' : 'transparent',
        minHeight: 80,
        overflowY: 'auto',
      }}>
        {sorted.length === 0 ? (
          <div style={{ fontSize: '11px', color: '#E9E9E7', textAlign: 'center', paddingTop: 16 }}>
            —
          </div>
        ) : (
          sorted.map(t => (
            <TaskCard
              key={t.id}
              task={t}
              typeColor={getTypeColor(t.type)}
              typeName={getTypeName(t.type)}
              dimmed={isPast && !isToday}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ── Calendar page ─────────────────────────────────────────────
const CalendarPage: React.FC = () => {
  const [weekStart, setWeekStart] = useState<Dayjs>(() => dayjs().isoWeekday(1).startOf('day'));
  const { overdueTasks, todayTasks, upcomingTasks, unscheduledTasks, loading, fetchTasks } = useTasks();
  const { types } = useInspectionTypes();

  const allScheduledTasks = useMemo(
    () => [...overdueTasks, ...todayTasks, ...upcomingTasks],
    [overdueTasks, todayTasks, upcomingTasks]
  );

  const getTypeColor = (id?: number) => types.find(t => t.id === id)?.color ?? 'default';
  const getTypeName  = (id?: number) => types.find(t => t.id === id)?.name  ?? `Type ${id ?? '?'}`;

  // Build 7 days for the week
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day')),
    [weekStart]
  );

  // Group tasks by YYYY-MM-DD
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

  const today = dayjs().startOf('day');
  const weekLabel = `${weekStart.format('MMM D')} – ${weekStart.add(6, 'day').format('MMM D, YYYY')}`;
  const isCurrentWeek = weekStart.isSame(dayjs().isoWeekday(1).startOf('day'), 'day');

  // Tasks this week total count
  const weekTaskCount = useMemo(
    () => weekDays.reduce((sum, d) => sum + (tasksByDay.get(d.format('YYYY-MM-DD'))?.length ?? 0), 0),
    [weekDays, tasksByDay]
  );

  return (
    <div>
      {/* ── Toolbar ── */}
      <div style={{
        marginBottom: 16,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 12,
        borderBottom: '1px solid #E9E9E7',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <IndTitle>Calendar</IndTitle>
        <Space size={6} wrap>
          <Button size="small" icon={<CalendarOutlined />} onClick={fetchTasks} loading={loading}>
            Refresh
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Button size="small" icon={<LeftOutlined />} onClick={() => setWeekStart(d => d.subtract(7, 'day'))} />
            <span style={{
              fontSize: '13px',
              fontWeight: 500,
              color: isCurrentWeek ? '#2383E2' : '#787774',
              minWidth: 160,
              textAlign: 'center',
              userSelect: 'none',
            }}>
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
        <div style={{
          marginBottom: 12,
          padding: '8px 12px',
          background: 'rgba(224, 62, 62, 0.05)',
          border: '1px solid #E03E3E',
          borderLeft: '3px solid #E03E3E',
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <WarningOutlined style={{ color: '#E03E3E', fontSize: 13 }} />
          <span style={{ fontSize: '13px', color: '#E03E3E', fontWeight: 500 }}>
            {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: '13px', color: '#787774' }}>
            — {overdueTasks.map(t => t.propertyAddress ?? `#${t.propertyId}`).join(' · ')}
          </span>
        </div>
      )}

      {/* ── Week stats bar ── */}
      <div style={{
        display: 'flex',
        gap: 16,
        marginBottom: 10,
        fontSize: '12px',
        color: '#787774',
      }}>
        <span>
          Week: <span style={{ color: weekTaskCount > 0 ? '#37352F' : '#ACABA9', fontWeight: 500 }}>
            {weekTaskCount}
          </span> task{weekTaskCount !== 1 ? 's' : ''}
        </span>
        {unscheduledTasks.length > 0 && (
          <span>
            Unscheduled: <span style={{ color: '#CB912F', fontWeight: 500 }}>{unscheduledTasks.length}</span>
          </span>
        )}
      </div>

      {/* ── Week grid ── */}
      <div style={{
        display: 'flex',
        border: '1px solid #E9E9E7',
        borderRadius: 6,
        overflow: 'hidden',
        background: '#FFFFFF',
        minHeight: 320,
      }}>
        {weekDays.map(day => {
          const key = day.format('YYYY-MM-DD');
          const isToday = day.isSame(today, 'day');
          const isPast = day.isBefore(today, 'day');
          return (
            <DayColumn
              key={key}
              day={day}
              tasks={tasksByDay.get(key) ?? []}
              isToday={isToday}
              isPast={isPast}
              getTypeColor={getTypeColor}
              getTypeName={getTypeName}
            />
          );
        })}
      </div>

      {/* ── Unscheduled tasks ── */}
      {unscheduledTasks.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            color: '#787774',
            marginBottom: 8,
          }}>
            Unscheduled
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
          }}>
            {unscheduledTasks.map(t => (
              <div
                key={t.id}
                style={{
                  background: '#F7F7F5',
                  border: '1px solid #E9E9E7',
                  borderLeft: `3px solid ${getTypeColor(t.type)}`,
                  borderRadius: 4,
                  padding: '5px 10px',
                  fontSize: '12px',
                  minWidth: 140,
                  maxWidth: 220,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#37352F', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.propertyAddress ?? `Property #${t.propertyId}`}
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <Tag
                    color={getTypeColor(t.type)}
                    style={{ fontSize: '10px', lineHeight: '14px', padding: '0 4px', margin: 0 }}
                  >
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
