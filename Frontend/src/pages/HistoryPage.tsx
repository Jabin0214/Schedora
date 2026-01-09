import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Table, DatePicker, Button, Space, Typography, message, Spin, Empty, Tag } from 'antd';
import { ReloadOutlined, HistoryOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/zh-cn';
import isBetween from 'dayjs/plugin/isBetween';
import { API_ENDPOINTS } from '../config/api';
import { handleApiError } from '../utils/errorHandler';

dayjs.extend(isBetween);

const { Title } = Typography;
const { RangePicker } = DatePicker;

type InspectionType = 'MoveIn' | 'MoveOut' | 'Routine';
type InspectionStatus = 'Pending' | 'Ready' | 'Completed';

type BillingPolicy = 'SixMonthFree' | 'ThreeMonthToggle';

const typeLabels: Record<string, { label: string; color: string }> = {
  MoveIn: { label: '入住检查', color: 'blue' },
  MoveOut: { label: '退房检查', color: 'orange' },
  Routine: { label: '例行检查', color: 'green' },
};

const statusLabels: Record<InspectionStatus, { label: string; color: string }> = {
  Pending: { label: '待预约', color: 'default' },
  Ready: { label: '待执行', color: 'blue' },
  Completed: { label: '已完成', color: 'success' },
};

interface InspectionTask {
  id: number;
  propertyId: number;
  propertyAddress?: string;
  scheduledAt?: string;
  type: InspectionType;
  status: InspectionStatus;
  isBillable: boolean;
  notes?: string;
  createdAt?: string;
  completedAt?: string;
  propertyBillingPolicy?: BillingPolicy;
}

interface SundryTask {
  id: number;
  description: string;
  cost: number;
  notes?: string;
  createdAt: string;
  executionDate?: string;
}

interface CombinedTask {
  id: number;
  taskType: 'inspection' | 'sundry';
  propertyAddress?: string;
  scheduledAt?: string;
  type?: InspectionType;
  status?: InspectionStatus;
  isBillable?: boolean;
  description?: string;
  cost?: number;
  executionDate?: string;
  completedAt?: string;
  notes?: string;
  createdAt: string;
}

const HistoryPage: React.FC = () => {
  dayjs.locale('zh-cn');

  const [inspectionTasks, setInspectionTasks] = useState<InspectionTask[]>([]);
  const [sundryTasks, setSundryTasks] = useState<SundryTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(29, 'day'),
    dayjs(),
  ]);

  const startOfToday = dayjs().startOf('day');

  const getPlannedDate = (task: CombinedTask) => {
    if (task.taskType === 'inspection') return task.scheduledAt;
    return task.executionDate;
  };

  const fetchHistoryTasks = useCallback(async () => {
    setLoading(true);
    try {
      const [insRes, sunRes] = await Promise.all([
        axios.get<InspectionTask[]>(API_ENDPOINTS.inspectionTasks),
        axios.get<SundryTask[]>(API_ENDPOINTS.sundryTasks),
      ]);
      setInspectionTasks(insRes.data);
      setSundryTasks(sunRes.data);
    } catch (error) {
      handleApiError(error, '获取历史数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistoryTasks();
  }, [fetchHistoryTasks]);

  const combinedHistory = useMemo<CombinedTask[]>(() => {
    const combined: CombinedTask[] = [
      ...inspectionTasks.map((task) => ({
        id: task.id,
        taskType: 'inspection' as const,
        propertyAddress: task.propertyAddress,
        scheduledAt: task.scheduledAt,
        type: task.type,
        status: task.status,
        isBillable: task.isBillable,
        completedAt: task.completedAt,
        notes: task.notes,
        createdAt: task.createdAt || '',
      })),
      ...sundryTasks.map((sundry) => ({
        id: sundry.id,
        taskType: 'sundry' as const,
        description: sundry.description,
        cost: sundry.cost,
        executionDate: sundry.executionDate,
        notes: sundry.notes,
        createdAt: sundry.createdAt,
      })),
    ];

    const start = dateRange[0].startOf('day');
    const end = dateRange[1].endOf('day');

    return combined
      .filter((item) => {
        if (item.taskType === 'inspection' && item.status !== 'Completed') return false;
        if (item.taskType === 'sundry' && !item.executionDate) return false;

        const pivotStr = item.completedAt || getPlannedDate(item) || item.createdAt;
        const pivot = dayjs(pivotStr);
        if (!pivot.isValid()) return false;
        if (!pivot.isBefore(startOfToday)) return false;
        return pivot.isBetween(start, end, 'day', '[]');
      })
      .sort((a, b) => {
        const da = a.completedAt || getPlannedDate(a) || a.createdAt || startOfToday.toISOString();
        const db = b.completedAt || getPlannedDate(b) || b.createdAt || startOfToday.toISOString();
        return dayjs(db).valueOf() - dayjs(da).valueOf();
      });
  }, [inspectionTasks, sundryTasks, dateRange, startOfToday]);

  const columns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 140,
      render: (_: unknown, record: CombinedTask) => {
        const pivot = record.completedAt || getPlannedDate(record) || record.createdAt;
        return dayjs(pivot).format('YYYY-MM-DD');
      },
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: { showTitle: false },
      render: (_: unknown, record: CombinedTask) =>
        record.taskType === 'inspection' ? record.propertyAddress || '-' : record.description || '-',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (_: unknown, record: CombinedTask) => {
        if (record.taskType === 'inspection') {
          const cfg = record.type ? typeLabels[record.type] : null;
          return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : '-';
        }
        return <Tag color="purple">杂活</Tag>;
      },
    },
    {
      title: '收费/费用',
      dataIndex: 'charge',
      key: 'charge',
      width: 120,
      render: (_: unknown, record: CombinedTask) => {
        if (record.taskType === 'sundry') {
          return <span style={{ fontWeight: 500, color: '#1890ff' }}>${(record.cost || 0).toFixed(2)}</span>;
        }
        return record.isBillable ? <Tag color="red">收费</Tag> : <Tag color="default">免费</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (_: unknown, record: CombinedTask) => {
        if (record.taskType === 'inspection') {
          const cfg = record.status ? statusLabels[record.status] : null;
          return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : '-';
        }
        return <Tag color="purple">杂活</Tag>;
      },
    },
    {
      title: '备注',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: { showTitle: false },
      render: (text: string) => <span title={text}>{text || '-'}</span>,
    },
  ];

  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange([dates[0], dates[1]]);
    }
  };

  return (
    <div>
      <div
        style={{
          marginBottom: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          <Space>
            <HistoryOutlined /> 历史记录
          </Space>
        </Title>
        <Space>
          <RangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            allowClear={false}
            presets={[
              { label: '近14天', value: [dayjs().subtract(13, 'day'), dayjs()] },
              { label: '近30天', value: [dayjs().subtract(29, 'day'), dayjs()] },
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchHistoryTasks} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      <Spin spinning={loading}>
        <Table
          size="small"
          dataSource={combinedHistory}
          columns={columns}
          rowKey={(record) => `${record.taskType}-${record.id}`}
          pagination={{ pageSize: 30, showSizeChanger: true, showQuickJumper: true }}
          locale={{ emptyText: <Empty description="暂无历史记录" /> }}
        />
      </Spin>
    </div>
  );
};

export default HistoryPage;
