import React, { useState, useCallback, useEffect } from 'react';
import { Table, DatePicker, Button, Space, Spin, Empty, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs, { Dayjs } from 'dayjs';
import { API_ENDPOINTS } from '../config/api';
import { handleApiError } from '../utils/errorHandler';
import type { InspectionRecordDto } from '../types/api';
import { IndTitle } from '../components/shared';
import { useInspectionTypes } from '../hooks/useInspectionTypes';

const { RangePicker } = DatePicker;

const tagStyle: React.CSSProperties = { fontSize: '11px', letterSpacing: '0.3px' };

const HistoryPage: React.FC = () => {
  const { getType } = useInspectionTypes();
  const [records,   setRecords]   = useState<InspectionRecordDto[]>([]);
  const [loading,   setLoading]   = useState(false);
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
          endDate:   end.endOf('day').toISOString(),
        },
      });
      setRecords(res.data);
    } catch (error) {
      handleApiError(error, 'Failed to fetch history');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchHistoryTasks();
  }, [fetchHistoryTasks]);

  const columns = [
    {
      title: 'Date',
      key: 'date',
      width: 160,
      render: (_: unknown, record: InspectionRecordDto) => (
        <span style={{ color: '#00d4ff', fontFamily: 'monospace', fontSize: '12px', letterSpacing: '0.3px' }}>
          {dayjs(record.executionDate).format('YYYY-MM-DD HH:mm')}
        </span>
      ),
    },
    {
      title: 'Address',
      key: 'address',
      ellipsis: { showTitle: false },
      render: (_: unknown, record: InspectionRecordDto) => (
        <span style={{ color: '#e6edf3', fontWeight: 500 }}>{record.propertyAddress || '-'}</span>
      ),
    },
    {
      title: 'Type',
      key: 'type',
      width: 120,
      render: (_: unknown, record: InspectionRecordDto) => {
        const cfg = getType(record.type);
        return cfg
          ? <Tag color={cfg.color} style={tagStyle}>{cfg.name}</Tag>
          : <span style={{ color: '#ff4444', fontFamily: 'monospace', fontSize: '11px' }}>{String(record.type)}</span>;
      },
    },
    {
      title: 'Charged',
      key: 'charge',
      width: 100,
      render: (_: unknown, record: InspectionRecordDto) => (
        <Tag color={record.isCharged ? 'gold' : 'green'} style={tagStyle}>
          {record.isCharged ? 'Charged' : 'Free'}
        </Tag>
      ),
    },
  ];

  return (
    <div>
      {/* ── Toolbar ── */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #30363d', flexWrap: 'wrap', gap: 8 }}>
        <IndTitle>History</IndTitle>
        <Space size={4} wrap>
          <RangePicker
            value={dateRange}
            onChange={(dates) => { if (dates?.[0] && dates[1]) setDateRange([dates[0], dates[1]]); }}
            allowClear={false}
            size="small"
            presets={[
              { label: 'Last 14 days', value: [dayjs().subtract(13, 'day'), dayjs()] },
              { label: 'Last 30 days', value: [dayjs().subtract(29, 'day'), dayjs()] },
            ]}
          />
          <Button icon={<ReloadOutlined />} size="small" onClick={fetchHistoryTasks} loading={loading}>Refresh</Button>
        </Space>
      </div>

      <Spin spinning={loading}>
        <Table
          size="small"
          dataSource={records}
          columns={columns}
          rowKey="id"
          pagination={{
            pageSize: 30,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => <span style={{ color: '#8b949e', fontSize: '12px' }}>{total} records</span>,
          }}
          locale={{
            emptyText: <Empty description={<span style={{ color: '#484f58', fontSize: '11px', letterSpacing: '2px' }}>— No records —</span>} />,
          }}
        />
      </Spin>
    </div>
  );
};

export default HistoryPage;
