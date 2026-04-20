import React, { useMemo } from 'react';
import { Card, Tag, Typography, Spin, Empty } from 'antd';
import dayjs from 'dayjs';
import { useTasks } from '../hooks/useTasks';
import type { CombinedTask } from '../types/api';

const { Text, Title } = Typography;

interface InspectCardProps {
  task: CombinedTask;
  isOverdue: boolean;
}

const InspectCard: React.FC<InspectCardProps> = ({ task, isOverdue }) => {
  const dateLabel = task.scheduledAt ? dayjs(task.scheduledAt).format('MM-DD') : '';

  return (
    <Card size="small" style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Tag color={isOverdue ? 'error' : undefined} style={{ margin: 0 }}>
          {dateLabel}
        </Tag>
        {isOverdue && <Text type="secondary" style={{ fontSize: 12 }}>Overdue</Text>}
      </div>
      <Text strong style={{ fontSize: 16, display: 'block' }}>
        {task.propertyAddress ?? '(no address)'}
      </Text>
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
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 4px' }}>
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
