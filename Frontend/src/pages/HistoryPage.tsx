import React, { useState, useCallback, useEffect } from 'react';
import { Table, DatePicker, Button, Space, Spin, Empty, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs, { Dayjs } from 'dayjs';
import { API_ENDPOINTS } from '../config/api';
import { handleApiError } from '../utils/errorHandler';
import type { InspectionRecordDto } from '../types/api';
import { IndTitle, typeLabels } from '../components/shared';

const { RangePicker } = DatePicker;

const tagStyle: React.CSSProperties = { fontSize: '11px', letterSpacing: '0.3px' };

const HistoryPage: React.FC = () => {
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
      render: (_: unknown, record: InspectionRecordDto) => (
        <span style={{ color: '#00d4ff', fontFamily: 'monospace', fontSize: '12px', letterSpacing: '0.3px' }}>
          {dayjs(record.executionDate).format('YYYY-MM-DD HH:mm')}
        </span>
      ),
    },
    {
      title: '地址',
      key: 'address',
      ellipsis: { showTitle: false },
      render: (_: unknown, record: InspectionRecordDto) => (
        <span style={{ color: '#e6edf3', fontWeight: 500 }}>{record.propertyAddress || '-'}</span>
      ),
    },
    {
      title: '检查类型',
      key: 'type',
      width: 120,
      render: (_: unknown, record: InspectionRecordDto) => {
        const cfg = typeLabels[record.type];
        return cfg
          ? <Tag color={cfg.color} style={tagStyle}>{cfg.label}</Tag>
          : <span style={{ color: '#ff4444', fontFamily: 'monospace', fontSize: '11px' }}>{String(record.type)}</span>;
      },
    },
    {
      title: '是否收费',
      key: 'charge',
      width: 100,
      render: (_: unknown, record: InspectionRecordDto) => (
        <Tag color={record.isCharged ? 'gold' : 'green'} style={tagStyle}>
          {record.isCharged ? '收费' : '免费'}
        </Tag>
      ),
    },
  ];

  return (
    <div>
      {/* ── Toolbar ── */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #30363d', flexWrap: 'wrap', gap: 8 }}>
        <IndTitle>历史记录</IndTitle>
        <Space size={4} wrap>
          <RangePicker
            value={dateRange}
            onChange={(dates) => { if (dates?.[0] && dates[1]) setDateRange([dates[0], dates[1]]); }}
            allowClear={false}
            size="small"
            presets={[
              { label: '近14天', value: [dayjs().subtract(13, 'day'), dayjs()] },
              { label: '近30天', value: [dayjs().subtract(29, 'day'), dayjs()] },
            ]}
          />
          <Button icon={<ReloadOutlined />} size="small" onClick={fetchHistoryTasks} loading={loading}>刷新</Button>
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
            showTotal: (total) => <span style={{ color: '#8b949e', fontSize: '12px' }}>共 {total} 条记录</span>,
          }}
          locale={{
            emptyText: <Empty description={<span style={{ color: '#484f58', fontSize: '11px', letterSpacing: '2px' }}>— 暂无历史记录 —</span>} />,
          }}
        />
      </Spin>
    </div>
  );
};

export default HistoryPage;
