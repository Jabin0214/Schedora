import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Table, DatePicker, Button, Space, Spin, Empty, Tag, Select, InputNumber, Tooltip, message, Input } from 'antd';
import { ReloadOutlined, FilePdfOutlined, SaveOutlined, CloseOutlined, SearchOutlined, CloseCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs, { Dayjs } from 'dayjs';
import { API_ENDPOINTS, EXTERNAL_LINKS } from '../config/api';
import { handleApiError } from '../utils/errorHandler';
import type { InspectionRecordDto } from '../types/api';
import { IndTitle } from '../components/shared';
import { useInspectionTypes } from '../hooks/useInspectionTypes';

const { RangePicker } = DatePicker;

const PARKING_RECEIPTS_URL = EXTERNAL_LINKS.parkingReceipts;

const tagStyle: React.CSSProperties = { fontSize: '12px', letterSpacing: '0.2px' };

interface EditState {
  executionDate: Dayjs;
  type: number;
  isCharged: boolean;
  parkingFee: number | null;
}

const countWorkdays = (start: Dayjs, end: Dayjs): number => {
  let count = 0;
  let cur = start.startOf('day');
  const last = end.startOf('day');
  while (!cur.isAfter(last)) {
    const dow = cur.day();
    if (dow !== 0 && dow !== 6) count++;
    cur = cur.add(1, 'day');
  }
  return count;
};

const StatCard: React.FC<{ label: string; value: React.ReactNode; sub?: React.ReactNode }> = ({ label, value, sub }) => (
  <div style={{
    flex: 1,
    minWidth: 130,
    background: '#FFFFFF',
    border: '1px solid #E9E9E7',
    borderRadius: 6,
    padding: '12px 16px',
  }}>
    <div style={{ fontSize: '11px', color: '#55534e', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 500, marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: '24px', fontWeight: 700, color: '#37352F', lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: '12px', color: '#787774', marginTop: 5 }}>{sub}</div>}
  </div>
);

const HistoryPage: React.FC = () => {
  const { getType, types } = useInspectionTypes();
  const [records,    setRecords]    = useState<InspectionRecordDto[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [editingId,  setEditingId]  = useState<number | null>(null);
  const [editState,  setEditState]  = useState<EditState | null>(null);
  const [dateRange,  setDateRange]  = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(13, 'day'),
    dayjs(),
  ]);
  const [searchText, setSearchText] = useState('');

  const typeOptions = useMemo(
    () => types.map(t => ({ value: t.id, label: t.name })),
    [types]
  );

  const filteredRecords = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return records;
    return records.filter(r =>
      (r.propertyAddress ?? '').toLowerCase().includes(q)
    );
  }, [records, searchText]);

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

  // ── Summary stats ─────────────────────────────────────────────
  const stats = useMemo(() => {
    const [start, end] = dateRange;
    const workdays    = countWorkdays(start, end);
    const officeHours = workdays;           // 1 hr/workday
    const totalParking = records.reduce((sum, r) => sum + (r.parkingFee ?? 0), 0);
    return { workdays, officeHours, totalParking };
  }, [dateRange, records]);

  // ── Inline edit ───────────────────────────────────────────────
  const startEdit = useCallback((record: InspectionRecordDto) => {
    setEditingId(record.id);
    setEditState({
      executionDate: dayjs(record.executionDate),
      type:          record.type,
      isCharged:     record.isCharged,
      parkingFee:    record.parkingFee ?? null,
    });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditState(null);
  }, []);

  const saveEdit = useCallback(async (record: InspectionRecordDto) => {
    if (!editState) return;
    setSaving(true);
    try {
      await axios.put(`${API_ENDPOINTS.inspectionRecords}/${record.id}`, {
        executionDate: editState.executionDate.toISOString(),
        type:          editState.type,
        isCharged:     editState.isCharged,
        parkingFee:    editState.parkingFee ?? null,
      });
      setRecords(prev => prev.map(r =>
        r.id === record.id
          ? {
              ...r,
              executionDate: editState.executionDate.toISOString(),
              type:          editState.type as InspectionRecordDto['type'],
              isCharged:     editState.isCharged,
              parkingFee:    editState.parkingFee ?? undefined,
            }
          : r
      ));
      message.success('Record updated');
      cancelEdit();
    } catch (error) {
      handleApiError(error, 'Failed to update record');
    } finally {
      setSaving(false);
    }
  }, [editState, cancelEdit]);

  // ── Table columns ─────────────────────────────────────────────
  const columns = [
    {
      title: 'Date',
      key: 'date',
      width: 170,
      render: (_: unknown, record: InspectionRecordDto) => {
        const isEditing = editingId === record.id;
        return isEditing ? (
          <DatePicker
            value={editState!.executionDate}
            onChange={(v) => v && setEditState(s => s ? { ...s, executionDate: v } : s)}
            showTime
            format="YYYY-MM-DD HH:mm"
            size="small"
            style={{ width: 155 }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span style={{ color: '#2383E2', fontSize: '13px', fontWeight: 500, letterSpacing: '0.2px' }}>
            {dayjs(record.executionDate).format('YYYY-MM-DD HH:mm')}
          </span>
        );
      },
    },
    {
      title: 'Address',
      key: 'address',
      ellipsis: { showTitle: false },
      render: (_: unknown, record: InspectionRecordDto) => (
        <Tooltip title={record.propertyAddress}>
          <span style={{ color: '#37352F', fontWeight: 600, fontSize: '14px' }}>{record.propertyAddress || '-'}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Type',
      key: 'type',
      width: 130,
      render: (_: unknown, record: InspectionRecordDto) => {
        const isEditing = editingId === record.id;
        if (isEditing) {
          return (
            <Select
              value={editState!.type}
              onChange={(v) => setEditState(s => s ? { ...s, type: v } : s)}
              options={typeOptions}
              size="small"
              style={{ width: 110 }}
              onClick={(e) => e.stopPropagation()}
            />
          );
        }
        const cfg = getType(record.type);
        return cfg
          ? <Tag color={cfg.color} style={tagStyle}>{cfg.name}</Tag>
          : <span style={{ color: '#E03E3E', fontSize: '12px' }}>{String(record.type)}</span>;
      },
    },
    {
      title: 'Charged',
      key: 'charge',
      width: 110,
      render: (_: unknown, record: InspectionRecordDto) => {
        const isEditing = editingId === record.id;
        if (isEditing) {
          return (
            <Select
              value={editState!.isCharged}
              onChange={(v) => setEditState(s => s ? { ...s, isCharged: v } : s)}
              options={[{ value: true, label: 'Charged' }, { value: false, label: 'Free' }]}
              size="small"
              style={{ width: 90 }}
              onClick={(e) => e.stopPropagation()}
            />
          );
        }
        return (
          <Tag color={record.isCharged ? 'gold' : 'green'} style={tagStyle}>
            {record.isCharged ? 'Charged' : 'Free'}
          </Tag>
        );
      },
    },
    {
      title: 'Parking',
      key: 'parking',
      width: 110,
      render: (_: unknown, record: InspectionRecordDto) => {
        const isEditing = editingId === record.id;
        if (isEditing) {
          return (
            <InputNumber
              value={editState!.parkingFee}
              onChange={(v) => setEditState(s => s ? { ...s, parkingFee: v } : s)}
              min={0}
              precision={2}
              prefix="$"
              placeholder="0.00"
              size="small"
              style={{ width: 90 }}
              onClick={(e) => e.stopPropagation()}
            />
          );
        }
        return record.parkingFee != null && record.parkingFee > 0
          ? <span style={{ color: '#37352F', fontSize: '13px', fontWeight: 500 }}>${record.parkingFee.toFixed(2)}</span>
          : <span style={{ color: '#ACABA9', fontSize: '13px' }}>—</span>;
      },
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: unknown, record: InspectionRecordDto) => {
        const isEditing = editingId === record.id;
        if (!isEditing) return null;
        return (
          <Space size={4} onClick={(e) => e.stopPropagation()}>
            <Button size="small" type="primary" icon={<SaveOutlined />} loading={saving} onClick={() => saveEdit(record)} />
            <Button size="small" icon={<CloseOutlined />} onClick={cancelEdit} />
          </Space>
        );
      },
    },
  ];

  // ── PDF export ────────────────────────────────────────────────
  const handleExportPdf = () => {
    const [start, end] = dateRange;
    const periodLabel = `${start.format('D MMM YYYY')} – ${end.format('D MMM YYYY')}`;
    const generatedAt = dayjs().format('D MMM YYYY, HH:mm');

    const typeName = (id: number) => {
      const cfg = types.find(t => t.id === id);
      return cfg ? cfg.name : String(id);
    };

    const countByType: Record<string, number> = {};
    let totalParking = 0;
    for (const r of records) {
      const name = typeName(r.type);
      countByType[name] = (countByType[name] ?? 0) + 1;
      if (r.parkingFee) totalParking += r.parkingFee;
    }

    const { workdays, officeHours } = stats;

    const rows = records
      .slice()
      .sort((a, b) => dayjs(a.executionDate).valueOf() - dayjs(b.executionDate).valueOf())
      .map((r, i) => `
        <tr>
          <td class="num">${i + 1}</td>
          <td class="mono">${dayjs(r.executionDate).format('DD MMM YYYY')}</td>
          <td class="mono dim">${dayjs(r.executionDate).format('HH:mm')}</td>
          <td>${r.propertyAddress ?? '-'}</td>
          <td class="center">${typeName(r.type)}</td>
          <td class="center">${r.isCharged ? 'Charged' : 'Free'}</td>
          <td class="center">${r.parkingFee != null && r.parkingFee > 0 ? '$' + r.parkingFee.toFixed(2) : '—'}</td>
        </tr>`)
      .join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Work Report – ${periodLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #000; background: #fff; padding: 32px 40px; }
    h1 { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
    .meta { font-size: 11px; color: #444; margin-bottom: 20px; }

    /* Summary boxes */
    .summary-grid { display: flex; gap: 16px; margin-bottom: 24px; }
    .stat-box { flex: 1; border: 1px solid #ccc; border-radius: 4px; padding: 10px 14px; }
    .stat-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 4px; }
    .stat-value { font-size: 20px; font-weight: bold; }
    .stat-sub { font-size: 9px; color: #888; margin-top: 2px; }

    table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    th { font-size: 10px; font-weight: bold; text-align: left; padding: 5px 8px;
         border-top: 2px solid #000; border-bottom: 1px solid #000; }
    td { padding: 5px 8px; border-bottom: 1px solid #ccc; font-size: 11px; vertical-align: top; }
    .num { width: 28px; text-align: right; color: #666; }
    .center { text-align: center; }
    .mono { font-family: monospace; }
    .dim { color: #666; }

    .receipts { margin-bottom: 16px; font-size: 10px; color: #555; padding: 7px 10px; border: 1px solid #ccc; border-left: 3px solid #555; border-radius: 2px; }
    .footer { margin-top: 24px; font-size: 10px; color: #888; border-top: 1px solid #ccc; padding-top: 8px; }
    @media print { @page { size: A4; margin: 15mm; } }
  </style>
</head>
<body>
  <h1>Work Report</h1>
  <div class="meta">Period: ${periodLabel} &nbsp;&nbsp; Generated: ${generatedAt}</div>

  ${totalParking > 0 ? `<div class="receipts">Parking receipts (Google Drive): <a href="${PARKING_RECEIPTS_URL}">${PARKING_RECEIPTS_URL}</a></div>` : ''}

  <div class="summary-grid">
    <div class="stat-box">
      <div class="stat-label">Inspections</div>
      <div class="stat-value">${records.length}</div>
      <div class="stat-sub">${Object.entries(countByType).map(([n, c]) => `${n}: ${c}`).join(' · ')}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Office Hours</div>
      <div class="stat-value">${officeHours} hrs</div>
      <div class="stat-sub">${workdays} workdays × 1 hr/day</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Parking Fees</div>
      <div class="stat-value">${totalParking > 0 ? '$' + totalParking.toFixed(2) : '—'}</div>
      <div class="stat-sub">${totalParking > 0 ? 'Receipts in Google Drive' : 'No parking charges'}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="num">#</th>
        <th>Date</th>
        <th>Time</th>
        <th>Property Address</th>
        <th class="center">Type</th>
        <th class="center">Charge</th>
        <th class="center">Parking</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="7" style="text-align:center;color:#aaa;padding:16px">No records</td></tr>'}
    </tbody>
  </table>


  <div class="footer">Work Report &nbsp;|&nbsp; ${periodLabel} &nbsp;|&nbsp; Inspections: ${records.length} &nbsp;|&nbsp; Office: ${officeHours} hrs${totalParking > 0 ? ` &nbsp;|&nbsp; Parking: $${totalParking.toFixed(2)}` : ''}</div>
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
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #E9E9E7', flexWrap: 'wrap', gap: 8 }}>
        <IndTitle>History</IndTitle>
        <Space size={4} wrap>
          <RangePicker
            value={dateRange}
            onChange={(dates) => { if (dates?.[0] && dates[1]) setDateRange([dates[0], dates[1]]); }}
            allowClear={false}
            size="small"
            presets={[
              { label: 'This pay period (14 days)', value: [dayjs().subtract(13, 'day'), dayjs()] },
              { label: 'Last 30 days',              value: [dayjs().subtract(29, 'day'), dayjs()] },
            ]}
          />
          <Button icon={<ReloadOutlined />} size="small" onClick={fetchHistoryTasks} loading={loading}>Refresh</Button>
          <Button icon={<FilePdfOutlined />} size="small" type="primary" onClick={handleExportPdf} disabled={records.length === 0}>Export PDF</Button>
        </Space>
      </div>

      {/* ── Summary stats ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <StatCard
          label="Inspections"
          value={records.length}
          sub={
            types
              .map(t => {
                const count = records.filter(r => r.type === t.id).length;
                return count > 0 ? `${t.name}: ${count}` : null;
              })
              .filter(Boolean)
              .join('  ·  ') || undefined
          }
        />
        <StatCard
          label="Office Hours"
          value={`${stats.officeHours} hrs`}
          sub={`${stats.workdays} workdays × 1 hr/day`}
        />
        <StatCard
          label="Parking Fees"
          value={stats.totalParking > 0 ? `$${stats.totalParking.toFixed(2)}` : '—'}
          sub={
            stats.totalParking > 0
              ? <a href={PARKING_RECEIPTS_URL} target="_blank" rel="noreferrer" style={{ color: '#2383E2', fontSize: '12px' }}>View receipts ↗</a>
              : 'No parking this period'
          }
        />
      </div>

      {/* ── Search bar ── */}
      <div style={{ marginBottom: 12 }}>
        <Input
          prefix={<SearchOutlined style={{ color: '#ACABA9', fontSize: 14 }} />}
          suffix={
            searchText
              ? <CloseCircleOutlined
                  style={{ color: '#ACABA9', fontSize: 13, cursor: 'pointer' }}
                  onClick={() => setSearchText('')}
                />
              : null
          }
          placeholder="Search by address..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{ maxWidth: 320 }}
          allowClear={false}
        />
        {searchText && (
          <span style={{ marginLeft: 10, fontSize: '13px', color: '#787774' }}>
            {filteredRecords.length} of {records.length} records
          </span>
        )}
      </div>

      {/* ── Table ── */}
      <Spin spinning={loading}>
        <Table
          size="small"
          dataSource={filteredRecords}
          columns={columns}
          rowKey="id"
          onRow={(record) => ({
            onDoubleClick: () => {
              if (editingId !== record.id) startEdit(record);
            },
            style: {
              cursor: 'pointer',
              background: editingId === record.id ? 'rgba(35, 131, 226, 0.05)' : undefined,
              borderLeft: editingId === record.id ? '3px solid #2383E2' : '3px solid transparent',
            },
          })}
          pagination={{
            pageSize: 30,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => <span style={{ color: '#787774', fontSize: '13px' }}>{total} records</span>,
          }}
          locale={{
            emptyText: <Empty description={<span style={{ color: '#ACABA9', fontSize: '13px' }}>No records</span>} />,
          }}
        />
      </Spin>
    </div>
  );
};

export default HistoryPage;
