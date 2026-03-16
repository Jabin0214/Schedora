import React, { useState, useCallback, useMemo } from 'react';
import {
  Button, Modal, Form, Input, Select, DatePicker, InputNumber,
  Popconfirm, Spin, Empty, Space, Tag, Tooltip, Card, message,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, ReloadOutlined, CopyOutlined,
  SaveOutlined, CloseOutlined, CheckCircleOutlined, SyncOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { useTasks } from '../hooks/useTasks';
import { useProperties } from '../hooks/useProperties';
import { useInspectionTypes } from '../hooks/useInspectionTypes';
import type { CombinedTask, InspectionRecordDto } from '../types/api';
import { API_ENDPOINTS } from '../config/api';
import { IndTitle, modalStyles } from '../components/shared';

const { TextArea } = Input;

const DISABLED_MINUTES = Array.from({ length: 60 }, (_, i) => i).filter(i => i % 10 !== 0);

const formattedDate = (dateStr?: string): string => {
  if (!dateStr) return 'Unscheduled';
  return dayjs(dateStr).format('MM-DD ddd HH:mm');
};

const ModalTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#e6edf3' }}>
    {children}
  </span>
);

const tagStyle: React.CSSProperties = { margin: 0, fontSize: '11px', letterSpacing: '0.3px' };

const TasksPage: React.FC = () => {
  const [syncing,             setSyncing]             = useState<'calendar' | 'sheets' | null>(null);
  const [submitting,          setSubmitting]          = useState(false);
  const [isModalOpen,         setIsModalOpen]         = useState(false);
  const [recentRecords,       setRecentRecords]       = useState<InspectionRecordDto[]>([]);
  const [recordsLoading,      setRecordsLoading]      = useState(false);
  const [selectedPropertyId,  setSelectedPropertyId]  = useState<number | null>(null);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completingTask,      setCompletingTask]      = useState<CombinedTask | null>(null);
  const [editingKey,          setEditingKey]          = useState<string | null>(null);
  const [editingRecord,       setEditingRecord]       = useState<CombinedTask | null>(null);

  const [form]         = Form.useForm();
  const [completeForm] = Form.useForm();
  const [rowForm]      = Form.useForm();

  const {
    loading: tasksLoading,
    overdueTasks, todayTasks, upcomingTasks, unscheduledTasks,
    fetchTasks, createInspectionTask, updateInspectionTask,
    deleteInspectionTask, completeInspectionTask,
  } = useTasks();

  const { properties, loading: propertiesLoading } = useProperties();
  const { types: taskTypes, getType } = useInspectionTypes();
  const loading = tasksLoading || propertiesLoading;

  const propertyOptions = useMemo(
    () => properties.map(p => ({ value: p.id, label: p.address })),
    [properties]
  );

  const typeOptions = useMemo(
    () => taskTypes.map(t => ({ value: t.id, label: t.name })),
    [taskTypes]
  );

  // ── Handlers ────────────────────────────────────────────────
  const handleSync = useCallback(async (target: 'all' | 'calendar' | 'sheets') => {
    if (target !== 'all') setSyncing(target);
    try {
      await axios.post(`${API_ENDPOINTS.googleSync}/${target}`);
      const label =
        target === 'all'      ? 'Calendar + Sheets' :
        target === 'calendar' ? 'Google Calendar'   : 'Google Sheets';
      message.success(`${label} synced successfully`);
    } catch {
      message.error('Sync failed — check backend logs');
    } finally {
      setSyncing(null);
    }
  }, []);

  const fetchRecentRecords = useCallback(async (propertyId: number) => {
    setRecordsLoading(true);
    try {
      const res = await axios.get<InspectionRecordDto[]>(API_ENDPOINTS.inspectionRecords, {
        params: {
          propertyId,
          startDate: dayjs().subtract(2, 'year').toISOString(),
          endDate: dayjs().toISOString(),
        },
      });
      const sorted = res.data
        .filter(r => r.propertyId === propertyId)
        .sort((a, b) => dayjs(b.executionDate).valueOf() - dayjs(a.executionDate).valueOf())
        .slice(0, 2);
      setRecentRecords(sorted);
    } catch {
      setRecentRecords([]);
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setRecentRecords([]);
    setSelectedPropertyId(null);
    form.resetFields();
  }, [form]);

  const handleOk = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const result = await createInspectionTask({
        propertyId:  values.propertyId,
        type:        values.type,
        isBillable:  values.isBillable ?? false,
        scheduledAt: values.scheduledAt ? values.scheduledAt.toISOString() : undefined,
        notes:       values.notes,
      });
      if (result !== null) closeModal();
    } catch {
      // Form validation error
    } finally {
      setSubmitting(false);
    }
  }, [form, createInspectionTask, closeModal]);

  const closeCompleteModal = useCallback(() => {
    setIsCompleteModalOpen(false);
    setCompletingTask(null);
    completeForm.resetFields();
  }, [completeForm]);

  const openCompleteModal = useCallback((record: CombinedTask) => {
    setCompletingTask(record);
    completeForm.setFieldsValue({
      executionDate: record.scheduledAt ? dayjs(record.scheduledAt) : dayjs(),
    });
    setIsCompleteModalOpen(true);
  }, [completeForm]);

  const handleComplete = useCallback(async () => {
    try {
      const values = await completeForm.validateFields();
      if (!completingTask) return;
      const result = await completeInspectionTask(completingTask.id, {
        executionDate: values.executionDate.toISOString(),
        parkingFee: values.parkingFee ?? undefined,
      });
      if (result !== null) closeCompleteModal();
    } catch {
      // Form validation error
    }
  }, [completeForm, completingTask, completeInspectionTask, closeCompleteModal]);

  // ── Inline edit ─────────────────────────────────────────────
  const startEdit = useCallback((record: CombinedTask) => {
    setEditingKey(`inspection-${record.id}`);
    setEditingRecord(record);
    rowForm.setFieldsValue({
      propertyId:  record.propertyId,
      type:        record.type,
      isBillable:  record.isBillable,
      scheduledAt: record.scheduledAt ? dayjs(record.scheduledAt) : null,
      notes:       record.notes || '',
    });
  }, [rowForm]);

  const cancelEdit = useCallback(() => {
    setEditingKey(null);
    setEditingRecord(null);
    rowForm.resetFields();
  }, [rowForm]);

  const saveEdit = useCallback(async () => {
    try {
      if (!editingRecord) return;
      const values = await rowForm.validateFields();
      await updateInspectionTask(editingRecord.id, {
        propertyId:  values.propertyId,
        type:        values.type,
        isBillable:  values.isBillable,
        scheduledAt: values.scheduledAt ? values.scheduledAt.toISOString() : undefined,
        notes:       values.notes || '',
      });
      cancelEdit();
    } catch {
      // Error handled by hook
    }
  }, [editingRecord, rowForm, updateInspectionTask, cancelEdit]);

  // ── Layout constants ─────────────────────────────────────────
  const gridTemplate = '130px 2fr 0.9fr 1fr 164px';

  const firstRowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: gridTemplate,
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  };

  const secondRowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '130px 1fr',
    alignItems: 'center',
    gap: 6,
    fontSize: '11px',
    color: '#484f58',
  };

  const cellText: React.CSSProperties = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  // ── Row renderer ─────────────────────────────────────────────
  const renderRow = (record: CombinedTask) => {
    const rowKey     = `inspection-${record.id}`;
    const isEditing  = editingKey === rowKey;
    const typeConfig = record.type != null ? getType(record.type) : undefined;

    return (
      <div
        key={rowKey}
        style={{
          padding:         '7px 10px 7px 13px',
          borderBottom:    '1px solid #30363d',
          borderLeft:      isEditing ? '3px solid #00d4ff' : '3px solid transparent',
          backgroundColor: isEditing ? '#1a2535' : 'transparent',
          cursor:          isEditing ? 'default' : 'pointer',
          transition:      'background-color 0.12s ease-out, border-left-color 0.12s ease-out',
        }}
        onClick={() => { if (!isEditing) startEdit(record); }}
        onMouseEnter={(e) => { if (!isEditing) (e.currentTarget as HTMLElement).style.backgroundColor = '#1c2128'; }}
        onMouseLeave={(e) => { if (!isEditing) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
      >
        <div style={firstRowStyle}>
          {/* Time */}
          <div style={cellText}>
            {isEditing ? (
              <Form.Item name="scheduledAt" style={{ margin: 0 }}>
                <DatePicker showTime format={['MM-DD HH:mm', 'MM/DD HH:mm', 'MM/DD ha', 'MM/DD h:mma', 'M/D ha', 'M/D HH:mm']} style={{ width: '100%' }} placeholder="03/02 10am" size="small" />
              </Form.Item>
            ) : (
              <span style={{ fontSize: '12px', color: record.scheduledAt ? '#00d4ff' : '#484f58', fontFamily: 'monospace', letterSpacing: '0.3px' }}>
                {formattedDate(record.scheduledAt)}
              </span>
            )}
          </div>

          {/* Address */}
          <div style={cellText}>
            {isEditing ? (
              <Form.Item name="propertyId" style={{ margin: 0 }}>
                <Select showSearch optionFilterProp="label" placeholder="Select property" size="small" options={propertyOptions} />
              </Form.Item>
            ) : (
              <Tooltip title={record.propertyAddress}>
                <span style={{ fontWeight: 600, fontSize: '13px', color: '#e6edf3' }}>
                  {record.propertyAddress || 'No address'}
                </span>
              </Tooltip>
            )}
          </div>

          {/* Type */}
          <div style={cellText}>
            {isEditing ? (
              <Form.Item name="type" style={{ margin: 0 }} rules={[{ required: true, message: 'Select type' }]}>
                <Select size="small" options={typeOptions} />
              </Form.Item>
            ) : typeConfig ? (
              <Tag color={typeConfig.color} style={tagStyle}>{typeConfig.name}</Tag>
            ) : '-'}
          </div>

          {/* Charge */}
          <div style={cellText}>
            {isEditing ? (
              <Form.Item name="isBillable" style={{ margin: 0 }}>
                <Select size="small" style={{ width: 90 }} options={[{ value: true, label: 'Charged' }, { value: false, label: 'Free' }]} />
              </Form.Item>
            ) : (
              <Tag color={record.isBillable ? 'gold' : 'green'} style={tagStyle}>
                {record.isBillable ? 'Charged' : 'Free'}
              </Tag>
            )}
          </div>

          {/* Actions */}
          <Space size={4} onClick={(e) => e.stopPropagation()}>
            {isEditing ? (
              <>
                <Button size="small" type="primary" icon={<SaveOutlined />} onClick={saveEdit}>Save</Button>
                <Button size="small" icon={<CloseOutlined />} onClick={cancelEdit}>Cancel</Button>
              </>
            ) : (
              <>
                <Tooltip title="Copy">
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => {
                      const formatted = record.scheduledAt
                        ? `${dayjs(record.scheduledAt).format('DMMMYYYY')}:${record.propertyAddress}`
                        : record.propertyAddress ?? '';
                      navigator.clipboard.writeText(formatted);
                      message.success('Copied');
                    }}
                  />
                </Tooltip>
                <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => openCompleteModal(record)}>Done</Button>
                <Popconfirm title="Delete this task?" onConfirm={() => deleteInspectionTask(record.id)} okText="Delete" cancelText="Cancel">
                  <Button danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
              </>
            )}
          </Space>
        </div>

        {(isEditing || record.notes) && (
          <div style={secondRowStyle}>
            <div />
            <div style={cellText}>
              {isEditing ? (
                <Form.Item name="notes" style={{ margin: 0 }}>
                  <Input placeholder="Notes" size="small" />
                </Form.Item>
              ) : record.notes ? (
                <Tooltip title={record.notes}>
                  <span style={{ color: '#8b949e', fontSize: '12px', fontStyle: 'italic', letterSpacing: '0.3px' }}>▸ {record.notes}</span>
                </Tooltip>
              ) : null}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Section renderer ─────────────────────────────────────────
  const renderSection = (title: string, data: CombinedTask[], accentColor = '#00d4ff') => (
    <Card
      size="small"
      title={
        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#8b949e' }}>
          <span style={{ color: accentColor, marginRight: 6 }}>▶</span>
          {title}
          <span style={{ color: '#484f58', marginLeft: 8, fontWeight: 400 }}>[{data.length}]</span>
        </span>
      }
      styles={{
        body:   { padding: 0 },
        header: { background: '#0d1117', borderBottom: '1px solid #30363d', minHeight: 36, padding: '0 10px' },
      }}
      style={{ marginBottom: 8, border: '1px solid #30363d', borderTop: `2px solid ${accentColor}`, borderRadius: 2, background: '#161b22' }}
    >
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 620 }}>
          <div style={{ padding: '4px 10px 4px 16px', background: '#0d1117', borderBottom: '1px solid #30363d', fontSize: '10px', color: '#484f58', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, alignItems: 'center', gap: 6 }}>
              <div>Time</div><div>Address</div><div>Type</div><div>Charge</div><div>Actions</div>
            </div>
          </div>

          {data.length === 0 ? (
            <div style={{ padding: '20px 16px', textAlign: 'center' }}>
              <Empty description={<span style={{ color: '#484f58', fontSize: '11px', letterSpacing: '2px' }}>— No tasks —</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
          ) : (
            <Form form={rowForm} component={false}>{data.map(renderRow)}</Form>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div>
      {/* ── Toolbar ── */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #30363d', flexWrap: 'wrap', gap: 8 }}>
        <IndTitle>Tasks</IndTitle>
        <Space size={4} wrap>
          <Button size="small" icon={<ReloadOutlined />} onClick={fetchTasks} loading={loading}>Refresh</Button>
          <Button size="small" icon={<SyncOutlined />} onClick={() => handleSync('calendar')} loading={syncing === 'calendar'}>Sync Calendar</Button>
          <Button size="small" icon={<SyncOutlined />} onClick={() => handleSync('sheets')} loading={syncing === 'sheets'}>Sync Sheets</Button>
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>Add Task</Button>
        </Space>
      </div>

      <Spin spinning={loading}>
        {overdueTasks.length > 0 && renderSection('Overdue', overdueTasks, '#f85149')}
        {renderSection('Today', todayTasks)}
        {renderSection('Upcoming', upcomingTasks)}
        {renderSection('Unscheduled', unscheduledTasks)}
      </Spin>

      {/* ── Add task modal ── */}
      <Modal title={<ModalTitle>Add Task</ModalTitle>} open={isModalOpen} onOk={handleOk} onCancel={closeModal}
        confirmLoading={submitting} okText="Add" cancelText="Cancel" destroyOnHidden width={600} styles={modalStyles}>
        <Form
          form={form}
          layout="vertical"
          onValuesChange={(changed) => {
            if ('propertyId' in changed) {
              const pid = changed.propertyId as number | undefined;
              setSelectedPropertyId(pid ?? null);
              if (pid) fetchRecentRecords(pid);
              else setRecentRecords([]);
            }
          }}
        >
          <Form.Item name="propertyId" label="Property" rules={[{ required: true, message: 'Please select a property' }]}>
            <Select placeholder="Select a property" showSearch optionFilterProp="label"
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={propertyOptions} />
          </Form.Item>

          {/* ── Billing policy badge ── */}
          {selectedPropertyId && (() => {
            const prop = properties.find(p => p.id === selectedPropertyId);
            const isSixMonth = prop?.billingPolicy === 'SixMonthFree';
            return (
              <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#0d1117', border: '1px solid #30363d', borderLeft: `3px solid ${isSixMonth ? '#3fb950' : '#d29922'}`, borderRadius: 2 }}>
                <span style={{ fontSize: '11px', color: isSixMonth ? '#3fb950' : '#d29922', fontWeight: 600 }}>
                  {isSixMonth ? '6-Month Cycle' : '3-Month Cycle'}
                </span>
                <span style={{ fontSize: '11px', color: '#8b949e' }}>
                  {isSixMonth
                    ? '— inspection every 6 months, always free'
                    : '— inspection every 3 months, alternates Charged / Free'}
                </span>
              </div>
            );
          })()}

          {/* ── Recent records ── */}
          {selectedPropertyId && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '10px', color: '#484f58', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>
                Recent Records
              </div>
              <Spin spinning={recordsLoading} size="small">
                <div style={{ background: '#0d1117', border: '1px solid #30363d', borderLeft: '3px solid #444d56', borderRadius: 2, padding: '6px 10px', minHeight: 32 }}>
                  {!recordsLoading && recentRecords.length === 0 ? (
                    <span style={{ color: '#484f58', fontSize: '11px' }}>No history</span>
                  ) : (
                    recentRecords.map((r, idx) => {
                      const tc = getType(r.type);
                      return (
                        <div key={r.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '3px 0',
                          borderBottom: idx < recentRecords.length - 1 ? '1px solid #30363d' : 'none',
                        }}>
                          <span style={{ color: '#00d4ff', fontFamily: 'monospace', fontSize: '11px', minWidth: 115 }}>
                            {dayjs(r.executionDate).format('YYYY-MM-DD HH:mm')}
                          </span>
                          <Tag color={tc?.color ?? 'default'} style={tagStyle}>
                            {tc?.name ?? String(r.type)}
                          </Tag>
                          <Tag color={r.isCharged ? 'gold' : 'green'} style={tagStyle}>
                            {r.isCharged ? 'Charged' : 'Free'}
                          </Tag>
                        </div>
                      );
                    })
                  )}
                </div>
              </Spin>
            </div>
          )}

          <Form.Item name="type" label="Inspection Type" rules={[{ required: true, message: 'Please select a type' }]}>
            <Select placeholder="Select inspection type" options={typeOptions} />
          </Form.Item>

          <Form.Item name="isBillable" label="Billable" initialValue={false} rules={[{ required: true, message: 'Please select billing status' }]}>
            <Select options={[{ value: false, label: 'Free' }, { value: true, label: 'Charged' }]} />
          </Form.Item>

          <Form.Item name="scheduledAt" label="Scheduled Time">
            <DatePicker
              showTime={{ format: 'HH:mm', hideDisabledOptions: true, disabledMinutes: () => DISABLED_MINUTES }}
              format={['YYYY-MM-DD HH:mm', 'MM/DD HH:mm', 'MM/DD ha', 'MM/DD h:mma', 'M/D ha', 'M/D HH:mm']}
              style={{ width: '100%' }} placeholder="03/02 10am  or  03/02 10:30am" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <TextArea rows={3} placeholder="Enter notes..." showCount maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Complete task modal ── */}
      <Modal title={<ModalTitle>Complete Task</ModalTitle>} open={isCompleteModalOpen} onOk={handleComplete}
        onCancel={closeCompleteModal} okText="Confirm" cancelText="Cancel" destroyOnHidden width={400} styles={modalStyles}>
        <Form form={completeForm} layout="vertical">
          <Form.Item name="executionDate" label="Execution Date" rules={[{ required: true, message: 'Please select a date' }]}>
            <DatePicker showTime format={['YYYY-MM-DD HH:mm', 'MM/DD HH:mm', 'MM/DD ha', 'MM/DD h:mma', 'M/D ha', 'M/D HH:mm']} style={{ width: '100%' }} placeholder="03/02 10am" />
          </Form.Item>
          <Form.Item name="parkingFee" label="Parking Fee (optional)">
            <InputNumber min={0} precision={2} prefix="$" placeholder="0.00" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TasksPage;
