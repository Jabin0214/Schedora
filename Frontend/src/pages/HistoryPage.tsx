import React, { useState, useCallback, useEffect } from 'react';
import { Table, DatePicker, Button, Space, Typography, Spin, Empty, Tag } from 'antd';
import { ReloadOutlined, HistoryOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs, { Dayjs } from 'dayjs';
import { API_ENDPOINTS } from '../config/api';
import { handleApiError } from '../utils/errorHandler';
import type { InspectionRecordDto } from '../types/api';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const typeLabels: Record<string, { label: string; color: string }> = {
  MoveIn: { label: '入住检查', color: 'blue' },
  MoveOut: { label: '退房检查', color: 'orange' },
  Routine: { label: '例行检查', color: 'green' },
};

const HistoryPage: React.FC = () => {
  const [records, setRecords] = useState<InspectionRecordDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(29, 'day'),
    dayjs(),
  ]);

  const fetchHistoryTasks = useCallback(async () => {
    setLoading(true);
    try {
      const [start, end] = dateRange;
      const res = await axios.get<InspectionRecordDto[]>(API_ENDPOINTS.inspectionRecords, {
        params: {
          startDate: start.startOf('day').toISOString(),
          endDate: end.endOf('day').toISOString(),
        },
      });
      setRecords(res.data);
    } catch (error) {
      handleApiError(error, '获取历史数据失败');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchHistoryTasks();
  }, [fetchHistoryTasks]);

  const columns = [
    {
      title: '时间',
      key: 'date',
      width: 160,
      render: (_: unknown, record: InspectionRecordDto) =>
        dayjs(record.executionDate).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '地址',
      key: 'address',
      ellipsis: { showTitle: false },
      render: (_: unknown, record: InspectionRecordDto) => record.propertyAddress || '-',
    },
    {
      title: '检查类型',
      key: 'type',
      width: 120,
      render: (_: unknown, record: InspectionRecordDto) => {
        const cfg = typeLabels[record.type];
        return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : '-';
      },
    },
    {
      title: '是否收费',
      key: 'charge',
      width: 100,
      render: (_: unknown, record: InspectionRecordDto) =>
        record.isCharged ? <Tag color="red">收费</Tag> : <Tag color="green">免费</Tag>,
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>
          <Space><HistoryOutlined /> 历史记录</Space>
        </Title>
        <Space>
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              if (dates?.[0] && dates[1]) setDateRange([dates[0], dates[1]]);
            }}
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
          dataSource={records}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 30, showSizeChanger: true, showQuickJumper: true }}
          locale={{ emptyText: <Empty description="暂无历史记录" /> }}
        />
      </Spin>
    </div>
  );
};

export default HistoryPage;
