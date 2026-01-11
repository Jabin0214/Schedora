import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Table, DatePicker, Button, Space, Typography, Spin, Empty, Tag } from 'antd';
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

const typeLabels: Record<string, { label: string; color: string }> = {
  MoveIn: { label: '入住检查', color: 'blue' },
  MoveOut: { label: '退房检查', color: 'orange' },
  Routine: { label: '例行检查', color: 'green' },
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
}

interface CombinedTask {
  id: number;
  taskType: 'inspection';
  propertyAddress?: string;
  scheduledAt?: string;
  type?: InspectionType;
  status?: InspectionStatus;
  isBillable?: boolean;
  completedAt?: string;
  createdAt: string;
}

const HistoryPage: React.FC = () => {
  dayjs.locale('zh-cn');

  const [inspectionTasks, setInspectionTasks] = useState<InspectionTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(29, 'day'),
    dayjs(),
  ]);

  const startOfToday = dayjs().startOf('day');

  const fetchHistoryTasks = useCallback(async () => {
    setLoading(true);
    try {
      const insRes = await axios.get<InspectionTask[]>(API_ENDPOINTS.inspectionTasks);
      setInspectionTasks(insRes.data);
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
    const combined: CombinedTask[] = inspectionTasks
      .filter((task) => task.status === 'Completed')
      .map((task) => ({
        id: task.id,
        taskType: 'inspection' as const,
        propertyAddress: task.propertyAddress,
        scheduledAt: task.scheduledAt,
        type: task.type,
        status: task.status,
        isBillable: task.isBillable,
        completedAt: task.completedAt,
        createdAt: task.createdAt || '',
      }));

    const start = dateRange[0].startOf('day');
    const end = dateRange[1].endOf('day');

    return combined
      .filter((item) => {
        const pivotStr = item.completedAt || item.scheduledAt || item.createdAt;
        const pivot = dayjs(pivotStr);
        if (!pivot.isValid()) return false;
        if (!pivot.isBefore(startOfToday)) return false;
        return pivot.isBetween(start, end, 'day', '[]');
      })
      .sort((a, b) => {
        const da = a.completedAt || a.scheduledAt || a.createdAt || startOfToday.toISOString();
        const db = b.completedAt || b.scheduledAt || b.createdAt || startOfToday.toISOString();
        return dayjs(db).valueOf() - dayjs(da).valueOf();
      });
  }, [inspectionTasks, dateRange, startOfToday]);

  const columns = [
    {
      title: '时间',
      dataIndex: 'date',
      key: 'date',
      width: 160,
      render: (_: unknown, record: CombinedTask) => {
        const pivot = record.completedAt || record.scheduledAt || record.createdAt;
        return dayjs(pivot).format('YYYY-MM-DD HH:mm');
      },
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      ellipsis: { showTitle: false },
      render: (_: unknown, record: CombinedTask) => record.propertyAddress || '-',
    },
    {
      title: '检查类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (_: unknown, record: CombinedTask) => {
        const cfg = record.type ? typeLabels[record.type] : null;
        return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : '-';
      },
    },
    {
      title: '是否收费',
      dataIndex: 'charge',
      key: 'charge',
      width: 100,
      render: (_: unknown, record: CombinedTask) => {
        return record.isBillable ? <Tag color="red">收费</Tag> : <Tag color="green">免费</Tag>;
      },
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
