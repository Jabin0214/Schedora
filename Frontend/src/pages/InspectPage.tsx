import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { Card, Tag, Typography, Spin, Empty, Input, message } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import { useTasks } from '../hooks/useTasks';
import { API_ENDPOINTS } from '../config/api';
import type { CombinedTask, InspectionType, InspectionTaskUpdateRequest } from '../types/api';

const { Text, Title } = Typography;

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface InspectCardProps {
  task: CombinedTask;
  isOverdue: boolean;
}

const DEBOUNCE_MS = 800;
const SAVED_CLEAR_MS = 3000;

const InspectCard: React.FC<InspectCardProps> = ({ task, isOverdue }) => {
  const [notes, setNotes] = useState<string>(task.notes ?? '');
  const [status, setStatus] = useState<SaveStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestNotesRef = useRef<string>(task.notes ?? '');
  const lastSavedRef = useRef<string>(task.notes ?? '');
  const saveSeqRef = useRef<number>(0);

  const save = useCallback(async (value: string) => {
    if (value === lastSavedRef.current) {
      return;
    }
    const mySeq = ++saveSeqRef.current;
    setStatus('saving');
    const payload: InspectionTaskUpdateRequest = {
      propertyId: task.propertyId!,
      scheduledAt: task.scheduledAt,
      notes: value,
      type: (task.type ?? 0) as InspectionType,
      isBillable: task.isBillable ?? false,
    };
    try {
      // Direct PUT (not useTasks.updateInspectionTask) to avoid its success toast + full refetch on every keystroke.
      await axios.put(`${API_ENDPOINTS.inspectionTasks}/${task.id}`, payload);
      if (mySeq !== saveSeqRef.current) return;
      lastSavedRef.current = value;
      setStatus('saved');
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setStatus('idle'), SAVED_CLEAR_MS);
    } catch (err) {
      if (mySeq !== saveSeqRef.current) return;
      console.warn('[InspectPage] save failed', err);
      setStatus('error');
    }
  }, [task.id, task.propertyId, task.scheduledAt, task.type, task.isBillable]);

  const scheduleSave = useCallback((value: string) => {
    latestNotesRef.current = value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      save(value);
    }, DEBOUNCE_MS);
  }, [save]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        if (latestNotesRef.current !== lastSavedRef.current) {
          save(latestNotesRef.current);
        }
      }
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, [save]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setNotes(v);
    scheduleSave(v);
  };

  const handleRetry = () => {
    save(latestNotesRef.current);
  };

  const dateLabel = task.scheduledAt ? dayjs(task.scheduledAt).format('MM-DD') : '';

  return (
    <Card size="small" style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Tag color={isOverdue ? 'error' : undefined} style={{ margin: 0 }}>
          {dateLabel}
        </Tag>
        {isOverdue && <Text type="secondary" style={{ fontSize: 12 }}>Overdue</Text>}
      </div>
      <Text
        strong
        style={{ fontSize: 16, display: 'block', marginBottom: 8, cursor: 'pointer' }}
        onClick={async () => {
          const addr = task.propertyAddress;
          if (!addr) return;
          try {
            await navigator.clipboard.writeText(addr);
            message.success('地址已复制');
          } catch {
            message.error('复制失败');
          }
        }}
      >
        {task.propertyAddress ?? '(no address)'}
      </Text>
      <Input.TextArea
        value={notes}
        onChange={handleChange}
        autoSize={{ minRows: 4, maxRows: 10 }}
        maxLength={500}
        showCount
        placeholder="记录检查情况…"
      />
      <div style={{ marginTop: 6, minHeight: 18, fontSize: 12, textAlign: 'right' }}>
        {status === 'saving' && <Text type="secondary">保存中…</Text>}
        {status === 'saved' && <Text type="success">已保存 ✓</Text>}
        {status === 'error' && (
          <>
            <Text type="danger">保存失败 </Text>
            <Typography.Link onClick={handleRetry}>重试</Typography.Link>
          </>
        )}
      </div>
    </Card>
  );
};

const InspectPage: React.FC = () => {
  const { overdueTasks, todayTasks, loading } = useTasks();

  const items = useMemo(() => {
    const overdue = overdueTasks.map(t => ({ task: t, isOverdue: true }));
    const today = todayTasks.map(t => ({ task: t, isOverdue: false }));
    return [...overdue, ...today].sort((a, b) => {
      const da = a.task.scheduledAt ? dayjs(a.task.scheduledAt).valueOf() : 0;
      const db = b.task.scheduledAt ? dayjs(b.task.scheduledAt).valueOf() : 0;
      return da - db;
    });
  }, [overdueTasks, todayTasks]);

  return (
    <div className="inspect-page">
      <Title level={4} style={{ marginTop: 0 }}>Inspect</Title>

      {loading && items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin />
        </div>
      ) : items.length === 0 ? (
        <Empty description="今天没有需要检查的任务" style={{ marginTop: 48 }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(({ task, isOverdue }) => (
            <InspectCard key={task.id} task={task} isOverdue={isOverdue} />
          ))}
        </div>
      )}
    </div>
  );
};

export default InspectPage;
