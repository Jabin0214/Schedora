import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Card,
  Table,
  DatePicker,
  Button,
  Space,
  Typography,
  Statistic,
  Row,
  Col,
  message,
  Spin,
  Empty,
  Tag,
} from 'antd';
import { ReloadOutlined, CalendarOutlined, HistoryOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/zh-cn';
import { API_ENDPOINTS } from '../config/api';
import isBetween from 'dayjs/plugin/isBetween';

const { Title } = Typography;
const { RangePicker } = DatePicker;

type InspectionType = 'MoveIn' | 'MoveOut' | 'Routine';
type InspectionStatus = 'Pending' | 'Ready' | 'Completed';

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
  notes?: string;
  createdAt?: string;
  completedAt?: string;
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
  description?: string;
  cost?: number;
  executionDate?: string;
  notes?: string;
  createdAt: string;
}

interface InspectionRecord {
  id: number;
  executionDate: string;
  propertyAddress?: string;
  type: string;
  isCharged: boolean;
  notes?: string;
}

interface PayrollSundryTask {
  id: number;
  description: string;
  cost: number;
  notes?: string;
  executionDate: string;
}

interface PayrollReport {
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
  summary: {
    totalInspections: number;
    totalSundryTasks: number;
    totalSundryCost: number;
  };
  inspections: InspectionRecord[];
  sundryTasks: PayrollSundryTask[];
}

dayjs.extend(isBetween);

const HistoryPage: React.FC = () => {
  dayjs.locale('zh-cn');

  const [report, setReport] = useState<PayrollReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [inspectionTasks, setInspectionTasks] = useState<InspectionTask[]>([]);
  const [sundryTasks, setSundryTasks] = useState<SundryTask[]>([]);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(29, 'day'),
    dayjs(),
  ]);

  const startOfToday = dayjs().startOf('day');

  const getPlannedDate = (task: CombinedTask) => {
    if (task.taskType === 'inspection') return task.scheduledAt;
    return task.executionDate;
  };

  const fetchReport = useCallback(
    async (startDate: Dayjs, endDate: Dayjs) => {
      setLoadingReport(true);
      try {
        const res = await axios.get<PayrollReport>(`${API_ENDPOINTS.reports}/payroll`, {
          params: {
            startDate: startDate.format('YYYY-MM-DD'),
            endDate: endDate.format('YYYY-MM-DD'),
          },
        });
        setReport(res.data);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          message.error('获取报表失败，请稍后重试');
        }
        console.error(error);
      } finally {
        setLoadingReport(false);
      }
    },
    []
  );

  const fetchHistoryTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const [insRes, sunRes] = await Promise.all([
        axios.get<InspectionTask[]>(API_ENDPOINTS.inspectionTasks),
        axios.get<SundryTask[]>(API_ENDPOINTS.sundryTasks),
      ]);
      setInspectionTasks(insRes.data);
      setSundryTasks(sunRes.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        message.error('获取历史任务失败');
      }
      console.error(error);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    fetchHistoryTasks();
  }, [fetchHistoryTasks]);

  useEffect(() => {
    fetchReport(dateRange[0], dateRange[1]);
  }, [dateRange, fetchReport]);

  const combinedHistory = useMemo<CombinedTask[]>(() => {
    const combined: CombinedTask[] = [
      ...inspectionTasks.map((task) => ({
        id: task.id,
        taskType: 'inspection' as const,
        propertyAddress: task.propertyAddress,
        scheduledAt: task.scheduledAt,
        type: task.type,
        status: task.status,
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
        const planned = getPlannedDate(item);
        const fallbackDate = item.createdAt ? dayjs(item.createdAt) : dayjs();
        const pivot = planned ? dayjs(planned) : fallbackDate;
        if (!pivot.isBefore(startOfToday)) return false;
        return pivot.isBetween(start, end, 'day', '[]');
      })
      .sort((a, b) => {
        const da = getPlannedDate(a) || a.createdAt || startOfToday.toISOString();
        const db = getPlannedDate(b) || b.createdAt || startOfToday.toISOString();
        return dayjs(db).valueOf() - dayjs(da).valueOf();
      });
  }, [inspectionTasks, sundryTasks, dateRange, startOfToday]);

  const historyColumns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 140,
      render: (_: unknown, record: CombinedTask) => {
        const planned = getPlannedDate(record) || record.createdAt;
        return dayjs(planned).format('MM-DD ddd HH:mm');
      },
    },
    {
      title: '地址 / 描述',
      dataIndex: 'content',
      key: 'content',
      ellipsis: { showTitle: false },
      render: (_: unknown, record: CombinedTask) =>
        record.taskType === 'inspection' ? record.propertyAddress || '-' : record.description || '-',
    },
    {
      title: '类型 / 费用',
      dataIndex: 'type',
      key: 'type',
      width: 160,
      render: (_: unknown, record: CombinedTask) => {
        if (record.taskType === 'inspection') {
          const cfg = record.type ? typeLabels[record.type] : null;
          return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : '-';
        }
        return record.cost !== undefined ? (
          <span style={{ color: '#cf1322', fontWeight: 600 }}>${record.cost.toFixed(2)}</span>
        ) : (
          '-'
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
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

  const inspectionColumns = [
    {
      title: '执行日期',
      dataIndex: 'executionDate',
      key: 'executionDate',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '物业地址',
      dataIndex: 'propertyAddress',
      key: 'propertyAddress',
      ellipsis: { showTitle: false },
      render: (text: string) => <span title={text}>{text || '-'}</span>,
    },
    {
      title: '检查类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => {
        const config = typeLabels[type];
        return config ? <Tag color={config.color}>{config.label}</Tag> : type;
      },
    },
    {
      title: '是否收费',
      dataIndex: 'isCharged',
      key: 'isCharged',
      width: 100,
      render: (isCharged: boolean) => (
        <Tag color={isCharged ? 'green' : 'default'}>{isCharged ? '是' : '否'}</Tag>
      ),
    },
    {
      title: '备注',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: { showTitle: false },
      render: (text: string) => <span title={text}>{text || '-'}</span>,
    },
  ];

  const sundryColumns = [
    {
      title: '执行日期',
      dataIndex: 'executionDate',
      key: 'executionDate',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: { showTitle: false },
      render: (text: string) => <span title={text}>{text}</span>,
    },
    {
      title: '费用',
      dataIndex: 'cost',
      key: 'cost',
      width: 120,
      render: (cost: number) => `$${cost.toFixed(2)}`,
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
          marginBottom: 16,
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
            onChange={handleDateRangeChange as any}
            allowClear={false}
            presets={[
              { label: '近14天', value: [dayjs().subtract(13, 'day'), dayjs()] },
              { label: '近30天', value: [dayjs().subtract(29, 'day'), dayjs()] },
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchHistoryTasks} loading={loadingTasks}>
            刷新任务
          </Button>
          <Button icon={<CalendarOutlined />} onClick={() => fetchReport(dateRange[0], dateRange[1])} loading={loadingReport}>
            刷新报表
          </Button>
        </Space>
      </div>

      <Spin spinning={loadingTasks}>
        <Card title={`历史任务（${combinedHistory.length}）`} size="small" bodyStyle={{ padding: 12 }}>
          <Table
            dataSource={combinedHistory}
            columns={historyColumns}
            rowKey={(record) => `${record.taskType}-${record.id}`}
            pagination={{ pageSize: 20, showSizeChanger: true }}
            locale={{ emptyText: <Empty description="暂无历史记录" /> }}
          />
        </Card>
      </Spin>

      <Card
        title="工资报表"
        size="small"
        style={{ marginTop: 16 }}
        bodyStyle={{ padding: 12 }}
        extra={
          <Button type="link" icon={<ReloadOutlined />} onClick={() => fetchReport(dateRange[0], dateRange[1])}>
            刷新
          </Button>
        }
      >
        <Spin spinning={loadingReport}>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="检查次数"
                  value={report?.summary.totalInspections ?? 0}
                  prefix={<Tag color="blue">检查</Tag>}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="杂活数量"
                  value={report?.summary.totalSundryTasks ?? 0}
                  prefix={<Tag color="purple">杂活</Tag>}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="杂活费用"
                  value={(report?.summary.totalSundryCost ?? 0).toFixed(2)}
                  prefix="$"
                />
              </Card>
            </Col>
          </Row>

          <Card title="检查明细" size="small" style={{ marginTop: 12 }} bodyStyle={{ padding: 0 }}>
            <Table
              dataSource={report?.inspections || []}
              columns={inspectionColumns}
              rowKey={(item) => `inspection-${item.id}`}
              pagination={{ pageSize: 10, showSizeChanger: true }}
              locale={{ emptyText: <Empty description="暂无检查记录" /> }}
            />
          </Card>

          <Card title="杂活明细" size="small" style={{ marginTop: 12 }} bodyStyle={{ padding: 0 }}>
            <Table
              dataSource={report?.sundryTasks || []}
              columns={sundryColumns}
              rowKey={(item) => `sundry-${item.id}`}
              pagination={{ pageSize: 10, showSizeChanger: true }}
              locale={{ emptyText: <Empty description="暂无杂活记录" /> }}
            />
          </Card>
        </Spin>
      </Card>
    </div>
  );
};

export default HistoryPage;
