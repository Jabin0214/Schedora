import React, { useState, useCallback, useEffect } from 'react';
import { Table, DatePicker, Button, Space, Spin, Empty, Tag } from 'antd';
import { ReloadOutlined, FilePdfOutlined } from '@ant-design/icons';
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
  const { getType, types } = useInspectionTypes();
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

  const handleExportPdf = () => {
    const [start, end] = dateRange;
    const periodLabel = `${start.format('D MMM YYYY')} – ${end.format('D MMM YYYY')}`;
    const generatedAt = dayjs().format('D MMM YYYY, HH:mm');

    // Build type name lookup
    const typeName = (id: number) => {
      const cfg = types.find(t => t.id === id);
      return cfg ? cfg.name : String(id);
    };

    // Summary counts by type
    const countByType: Record<string, number> = {};
    for (const r of records) {
      const name = typeName(r.type);
      countByType[name] = (countByType[name] ?? 0) + 1;
    }

    const rows = records
      .slice()
      .sort((a, b) => dayjs(a.executionDate).valueOf() - dayjs(b.executionDate).valueOf())
      .map((r, i) => `
        <tr>
          <td class="num">${i + 1}</td>
          <td class="mono">${dayjs(r.executionDate).format('DD MMM YYYY')}</td>
          <td class="mono dim">${dayjs(r.executionDate).format('HH:mm')}</td>
          <td class="addr">${r.propertyAddress ?? '-'}</td>
          <td class="center">${typeName(r.type)}</td>
          <td class="center ${r.isCharged ? 'charged' : 'free'}">${r.isCharged ? 'Charged' : 'Free'}</td>
        </tr>`)
      .join('');

    const summaryRows = Object.entries(countByType)
      .map(([name, count]) => `
        <tr>
          <td>${name}</td>
          <td class="num bold">${count}</td>
        </tr>`)
      .join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Inspection Report – ${periodLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #1a1a1a; background: #fff; padding: 36px 48px; }

    .header { border-bottom: 2.5px solid #0a84ff; padding-bottom: 14px; margin-bottom: 20px; }
    .logo   { font-size: 10px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #555; margin-bottom: 6px; }
    .title  { font-size: 20px; font-weight: 800; letter-spacing: 1px; color: #0a0a0a; }
    .meta   { margin-top: 6px; font-size: 10px; color: #666; display: flex; gap: 24px; }
    .meta span b { color: #111; }

    .section-label {
      font-size: 9px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase;
      color: #0a84ff; margin-bottom: 8px; margin-top: 24px;
    }

    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #f0f4f8; }
    thead th { font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;
               color: #555; padding: 7px 10px; text-align: left; border-bottom: 1.5px solid #d0d7de; }
    tbody tr { border-bottom: 1px solid #eaecef; }
    tbody tr:last-child { border-bottom: none; }
    tbody td { padding: 6px 10px; vertical-align: top; }
    tbody tr:nth-child(even) { background: #fafbfc; }

    .num    { width: 30px; color: #999; text-align: right; }
    .mono   { font-family: 'Courier New', monospace; font-size: 10.5px; white-space: nowrap; }
    .dim    { color: #888; }
    .addr   { max-width: 280px; }
    .center { text-align: center; }
    .charged { color: #b45309; font-weight: 600; }
    .free    { color: #16a34a; font-weight: 600; }
    .bold   { font-weight: 700; }

    .summary-wrap { margin-top: 24px; display: flex; gap: 32px; align-items: flex-start; }
    .summary-box  { border: 1.5px solid #d0d7de; border-radius: 6px; padding: 14px 20px; min-width: 160px; }
    .summary-box .big { font-size: 32px; font-weight: 800; color: #0a84ff; line-height: 1; }
    .summary-box .lbl { font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: #888; margin-top: 4px; }
    .summary-table  { border: 1.5px solid #d0d7de; border-radius: 6px; overflow: hidden; }
    .summary-table table { margin: 0; }
    .summary-table thead th { background: #f0f4f8; }
    .summary-table td { padding: 5px 14px; }

    .footer { margin-top: 36px; padding-top: 12px; border-top: 1px solid #d0d7de;
              font-size: 9px; color: #aaa; display: flex; justify-content: space-between; }

    @media print {
      body { padding: 20px 28px; }
      @page { size: A4; margin: 15mm 15mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Schedora PMS</div>
    <div class="title">Inspection Work Report</div>
    <div class="meta">
      <span><b>Period:</b> ${periodLabel}</span>
      <span><b>Generated:</b> ${generatedAt}</span>
    </div>
  </div>

  <div class="section-label">Inspection Records</div>
  <table>
    <thead>
      <tr>
        <th class="num">#</th>
        <th>Date</th>
        <th>Time</th>
        <th>Property Address</th>
        <th class="center">Type</th>
        <th class="center">Charge</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="6" style="text-align:center;color:#aaa;padding:20px">No records in this period</td></tr>'}
    </tbody>
  </table>

  <div class="section-label">Summary</div>
  <div class="summary-wrap">
    <div class="summary-box">
      <div class="big">${records.length}</div>
      <div class="lbl">Total Inspections</div>
    </div>
    <div class="summary-table">
      <table>
        <thead><tr><th>Type</th><th class="num">Count</th></tr></thead>
        <tbody>${summaryRows || '<tr><td colspan="2" style="color:#aaa;padding:10px">—</td></tr>'}</tbody>
      </table>
    </div>
  </div>

  <div class="footer">
    <span>Schedora PMS — Inspection Work Report</span>
    <span>Period: ${periodLabel} &nbsp;|&nbsp; Total: ${records.length} inspections</span>
  </div>

  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

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
          <Button icon={<FilePdfOutlined />} size="small" type="primary" onClick={handleExportPdf} disabled={records.length === 0}>Export PDF</Button>
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
