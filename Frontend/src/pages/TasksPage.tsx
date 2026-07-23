import React, { useState, useCallback, useMemo } from 'react';
import {
  Button, Modal, Form, Input, Select, DatePicker, InputNumber,
  Popconfirm, Spin, Empty, Space, Tag, Tooltip, Card, message,
  Alert,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, ReloadOutlined, CopyOutlined,
  SaveOutlined, CloseOutlined, CheckCircleOutlined, SyncOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import api from '../api';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
dayjs.extend(isoWeek);
import { useTasks } from '../hooks/useTasks';
import { useProperties } from '../hooks/useProperties';
import { useInspectionTypes } from '../hooks/useInspectionTypes';
import type { AiTaskDraftPropertyCandidate, AiTaskDraftResponse, CombinedTask, InspectionRecordDto } from '../types/api';
import { API_ENDPOINTS } from '../config/api';
import { IndTitle } from '../components/shared';
import { modalStyles } from '../components/modalStyles';
import { getSuggestedBillable, isSixMonthFreePolicy } from '../utils/billingPolicy';

const { Search, TextArea } = Input;

const DISABLED_MINUTES = Array.from({ length: 60 }, (_, i) => i).filter(i => i % 10 !== 0);

const formattedDate = (dateStr?: string): string => {
  if (!dateStr) return 'Unscheduled';
  return dayjs(dateStr).format('MM-DD ddd HH:mm');
};

const routineInspectionEmailBody = `Kia Ora,

My name is Jabin, and I will be conducting the routine inspection of your property on behalf of ST International LTD.

To arrange a suitable time for the inspection, which should take no longer than 15 minutes, could you please let me know what days and times work best for you in the coming days?

Ngā mihi,
Jabin
ST International LTD`;

const getRoutineInspectionEmailSubject = (address?: string): string =>
  address ? `Routine Inspection - ${address}` : 'Routine Inspection';

const ModalTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontSize: '15px', fontWeight: 600, color: '#37352F' }}>
    {children}
  </span>
);

const tagStyle: React.CSSProperties = { margin: 0, fontSize: '12px', letterSpacing: '0.2px' };

const TasksPage: React.FC = () => {
  const [syncingCalendar,     setSyncingCalendar]     = useState(false);
  const [syncingSheets,       setSyncingSheets]       = useState(false);
  const [submitting,          setSubmitting]          = useState(false);
  const [isModalOpen,         setIsModalOpen]         = useState(false);
  const [recentRecords,       setRecentRecords]       = useState<InspectionRecordDto[]>([]);
  const [recordsLoading,      setRecordsLoading]      = useState(false);
  const [selectedPropertyId,  setSelectedPropertyId]  = useState<number | null>(null);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completingTask,      setCompletingTask]      = useState<CombinedTask | null>(null);
  const [editingKey,          setEditingKey]          = useState<string | null>(null);
  const [editingRecord,       setEditingRecord]       = useState<CombinedTask | null>(null);
  const [aiTaskText,          setAiTaskText]          = useState('');
  const [aiDraftLoading,      setAiDraftLoading]      = useState(false);
  const [isAiDraftApplied,    setIsAiDraftApplied]    = useState(false);
  const [aiDraftCandidates,   setAiDraftCandidates]   = useState<AiTaskDraftPropertyCandidate[]>([]);
  const [aiDraftAddressQuery, setAiDraftAddressQuery] = useState('');

  const [form]         = Form.useForm();
  const [completeForm] = Form.useForm();
  const [rowForm]      = Form.useForm();

  const {
    loading: tasksLoading,
    overdueTasks, todayTasks, tomorrowTasks, upcomingTasks, unscheduledTasks,
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

  const selectedProperty = useMemo(
    () => properties.find(p => p.id === selectedPropertyId),
    [properties, selectedPropertyId]
  );

  const copyRoutineEmailSubject = useCallback(() => {
    navigator.clipboard.writeText(getRoutineInspectionEmailSubject(selectedProperty?.address));
    message.success('Subject copied');
  }, [selectedProperty?.address]);

  const copyRoutineEmailBody = useCallback(() => {
    navigator.clipboard.writeText(routineInspectionEmailBody);
    message.success('Body copied');
  }, []);

  // ── Handlers ────────────────────────────────────────────────
  const handleSync = useCallback(async (target: 'calendar' | 'sheets') => {
    const setLoading = target === 'calendar' ? setSyncingCalendar : setSyncingSheets;
    setLoading(true);
    try {
      await api.post(`${API_ENDPOINTS.googleSync}/${target}`);
      const label = target === 'calendar' ? 'Google Calendar' : 'Google Sheets';
      message.success(`${label} synced successfully`);
      await fetchTasks();
    } catch {
      message.error('Sync failed — check backend logs');
    } finally {
      setLoading(false);
    }
  }, [fetchTasks]);

  const fetchRecentRecords = useCallback(async (propertyId: number) => {
    setRecordsLoading(true);
    try {
      const res = await api.get<InspectionRecordDto[]>(API_ENDPOINTS.inspectionRecords, {
        params: {
          propertyId,
          startDate: dayjs().subtract(364, 'day').toISOString(),
          endDate: dayjs().toISOString(),
        },
      });
      const sorted = res.data
        .sort((a, b) => dayjs(b.executionDate).valueOf() - dayjs(a.executionDate).valueOf())
        .slice(0, 2);
      setRecentRecords(sorted);

      const property = properties.find(p => p.id === propertyId);
      form.setFieldValue('isBillable', getSuggestedBillable(property?.billingPolicy, sorted));
    } catch {
      setRecentRecords([]);
      const property = properties.find(p => p.id === propertyId);
      form.setFieldValue('isBillable', getSuggestedBillable(property?.billingPolicy, []));
    } finally {
      setRecordsLoading(false);
    }
  }, [form, properties]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setRecentRecords([]);
    setSelectedPropertyId(null);
    setIsAiDraftApplied(false);
    setAiDraftCandidates([]);
    setAiDraftAddressQuery('');
    form.resetFields();
  }, [form]);

  const handleAiTaskDraft = useCallback(async (value?: string) => {
    const text = (value ?? aiTaskText).trim();
    if (!text) {
      message.warning('Enter a task first');
      return;
    }

    setAiDraftLoading(true);
    try {
      const res = await api.post<AiTaskDraftResponse>(API_ENDPOINTS.aiTaskDraft, { text });
      const draft = res.data;
      const propertyId = draft.propertyCandidates.length === 1
        ? draft.propertyCandidates[0].propertyId
        : undefined;

      setRecentRecords([]);
      setSelectedPropertyId(propertyId ?? null);
      setIsAiDraftApplied(true);
      setAiDraftCandidates(draft.propertyCandidates);
      setAiDraftAddressQuery(draft.addressQuery);
      form.resetFields();
      form.setFieldsValue({
        propertyId,
        type: draft.type,
        isBillable: draft.isBillable,
        scheduledAt: draft.scheduledAt ? dayjs(draft.scheduledAt) : null,
        notes: draft.notes ?? '',
      });
      setIsModalOpen(true);

      if (propertyId) {
        await fetchRecentRecords(propertyId);
        form.setFieldValue('isBillable', draft.isBillable);
      }

      if (draft.propertyCandidates.length === 0) {
        message.warning('Draft filled what it could. Please choose the property.');
      } else if (draft.propertyCandidates.length > 1) {
        message.info('Draft filled. Please choose the matching property.');
      } else {
        message.success('Draft filled. Review and add when ready.');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'AI task draft failed');
    } finally {
      setAiDraftLoading(false);
    }
  }, [aiTaskText, fetchRecentRecords, form]);

  const handleOk = useCallback(async () => {
    if (submitting) return;
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
  }, [submitting, form, createInspectionTask, closeModal]);

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
          borderBottom:    '1px solid #E9E9E7',
          borderLeft:      isEditing ? '3px solid #2383E2' : '3px solid transparent',
          backgroundColor: isEditing ? 'rgba(35, 131, 226, 0.05)' : 'transparent',
          cursor:          isEditing ? 'default' : 'pointer',
          transition:      'background-color 0.1s ease-out, border-left-color 0.1s ease-out',
        }}
        onClick={() => { if (!isEditing) startEdit(record); }}
        onMouseEnter={(e) => { if (!isEditing) (e.currentTarget as HTMLElement).style.backgroundColor = '#EBEBEA'; }}
        onMouseLeave={(e) => { if (!isEditing) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
      >
        <div className="tasks-grid-row" style={{ marginBottom: 3 }}>
          {/* Time */}
          <div style={cellText}>
            {isEditing ? (
              <Form.Item name="scheduledAt" style={{ margin: 0 }}>
                <DatePicker showTime format={['MM-DD HH:mm', 'MM/DD HH:mm', 'MM/DD ha', 'MM/DD h:mma', 'M/D ha', 'M/D HH:mm']} style={{ width: '100%' }} placeholder="03/02 10am" size="small" />
              </Form.Item>
            ) : (
              <span style={{ fontSize: '13px', fontWeight: 500, color: record.scheduledAt ? '#2383E2' : '#ACABA9', letterSpacing: '0.1px' }}>
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
                <span style={{ fontWeight: 600, fontSize: '14px', color: '#37352F' }}>
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
          <Space className="tasks-row-actions" size={4} onClick={(e) => e.stopPropagation()}>
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
                    aria-label="Copy task"
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
                  <Button danger size="small" icon={<DeleteOutlined />} aria-label="Delete task" />
                </Popconfirm>
              </>
            )}
          </Space>
        </div>

        {(isEditing || record.notes) && (
          <div className="tasks-notes-row">
            <div />
            <div style={cellText}>
              {isEditing ? (
                <Form.Item name="notes" style={{ margin: 0 }}>
                  <Input placeholder="Notes" size="small" />
                </Form.Item>
              ) : record.notes ? (
                <Tooltip title={record.notes}>
                  <span style={{ color: '#787774', fontSize: '13px', fontStyle: 'italic' }}>▸ {record.notes}</span>
                </Tooltip>
              ) : null}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Section renderer ─────────────────────────────────────────
  const renderSection = (title: string, data: CombinedTask[], accentColor = '#2383E2', groupByWeek = false) => {
    const rows: React.ReactNode[] = [];
    if (groupByWeek) {
      let lastWeekKey = '';
      data.forEach((task) => {
        const d = task.scheduledAt ? dayjs(task.scheduledAt) : null;
        const weekKey = d ? `${d.isoWeekYear()}-W${d.isoWeek()}` : '__unscheduled__';
        if (weekKey !== lastWeekKey) {
          if (lastWeekKey !== '') {
            rows.push(
              <div key={`divider-${weekKey}`} style={{ display: 'flex', alignItems: 'center', padding: '0 12px', height: 20 }}>
                <div style={{ flex: 1, borderTop: '1px dashed #E9E9E7' }} />
                {d && (
                  <span style={{ margin: '0 10px', fontSize: '11px', color: '#787774', whiteSpace: 'nowrap' }}>
                    {d.isoWeekday(1).format('MMM D')} – {d.isoWeekday(7).format('MMM D')}
                  </span>
                )}
                <div style={{ flex: 1, borderTop: '1px dashed #E9E9E7' }} />
              </div>
            );
          }
          lastWeekKey = weekKey;
        }
        rows.push(renderRow(task));
      });
    }

    return (
      <Card
        size="small"
        title={
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#37352F', letterSpacing: '0.1px' }}>
            <span style={{ color: accentColor, marginRight: 6 }}>▶</span>
            {title}
            <span style={{ color: '#ACABA9', marginLeft: 8, fontWeight: 400, fontSize: '12px' }}>{data.length}</span>
          </span>
        }
        styles={{
          body:   { padding: 0 },
          header: { background: '#F7F7F5', borderBottom: '1px solid #E9E9E7', minHeight: 36, padding: '0 10px' },
        }}
        style={{ marginBottom: 8, border: '1px solid #E9E9E7', borderTop: `2px solid ${accentColor}`, borderRadius: 6, background: '#FFFFFF' }}
      >
        <div className="tasks-list-scroll">
          <div className="tasks-list-inner">
            <div className="tasks-list-header" style={{ padding: '4px 10px 4px 16px', background: '#F7F7F5', borderBottom: '1px solid #E9E9E7', fontSize: '11px', color: '#787774', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 500 }}>
              <div className="tasks-grid-row">
                <div>Time</div><div>Address</div><div>Type</div><div>Charge</div><div>Actions</div>
              </div>
            </div>

            {data.length === 0 ? (
              <div style={{ padding: '20px 16px', textAlign: 'center' }}>
                <Empty description={<span style={{ color: '#ACABA9', fontSize: '13px' }}>No tasks</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            ) : (
              <Form form={rowForm} component={false}>
                {groupByWeek ? rows : data.map(renderRow)}
              </Form>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div>
      {/* ── Toolbar ── */}
      <div className="page-toolbar">
        <IndTitle>Tasks</IndTitle>
        <Space className="page-toolbar-actions" size={4} wrap>
          <Button size="small" icon={<ReloadOutlined />} onClick={fetchTasks} loading={loading}>Refresh</Button>
          <Button size="small" icon={<SyncOutlined />} onClick={() => handleSync('calendar')} loading={syncingCalendar} disabled={syncingSheets}>Sync Calendar</Button>
          <Button size="small" icon={<SyncOutlined />} onClick={() => handleSync('sheets')} loading={syncingSheets} disabled={syncingCalendar}>Sync Sheets</Button>
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setAiDraftCandidates([]);
              setAiDraftAddressQuery('');
              setIsAiDraftApplied(false);
              setIsModalOpen(true);
            }}
          >
            Add Task
          </Button>
        </Space>
      </div>

      <div style={{
        marginBottom: 10,
        padding: '8px 10px',
        border: '1px solid #E9E9E7',
        borderRadius: 6,
        background: '#FFFFFF',
      }}>
        <Search
          value={aiTaskText}
          onChange={(event) => setAiTaskText(event.target.value)}
          onSearch={handleAiTaskDraft}
          loading={aiDraftLoading}
          enterButton={<Button type="primary" icon={<ThunderboltOutlined />} loading={aiDraftLoading}>Draft</Button>}
          placeholder="Try: tomorrow 3pm routine for queen street, free, bring keys"
          allowClear
        />
      </div>

      <Spin spinning={loading}>
        {overdueTasks.length > 0 && renderSection('Overdue', overdueTasks, '#E03E3E')}
        {renderSection('Today', todayTasks)}
        {renderSection('Tomorrow', tomorrowTasks, '#0F7B6C')}
        {renderSection('Upcoming', upcomingTasks, '#2383E2', true)}
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
              else {
                setRecentRecords([]);
                form.setFieldValue('isBillable', false);
              }
            }
          }}
        >
          {isAiDraftApplied && (
            <Alert
              type={aiDraftCandidates.length > 0 ? 'info' : 'warning'}
              showIcon
              message={aiDraftCandidates.length > 0 ? 'AI draft filled the form' : 'AI could not match a property'}
              description={
                <div>
                  {aiDraftAddressQuery && (
                    <div style={{ marginBottom: aiDraftCandidates.length > 0 ? 8 : 0 }}>
                      Matched from: {aiDraftAddressQuery}
                    </div>
                  )}
                  {aiDraftCandidates.length === 0 && (
                    <div>Please choose the property manually before adding.</div>
                  )}
                  {aiDraftCandidates.length > 0 && (
                    <Space size={4} wrap>
                      {aiDraftCandidates.map(candidate => (
                        <Button
                          key={candidate.propertyId}
                          size="small"
                          onClick={() => {
                            form.setFieldValue('propertyId', candidate.propertyId);
                            setSelectedPropertyId(candidate.propertyId);
                            fetchRecentRecords(candidate.propertyId);
                          }}
                        >
                          {candidate.address}
                        </Button>
                      ))}
                    </Space>
                  )}
                </div>
              }
              style={{ marginBottom: 12 }}
            />
          )}

          <Form.Item name="propertyId" label="Property" rules={[{ required: true, message: 'Please select a property' }]}>
            <Select placeholder="Select a property" showSearch optionFilterProp="label"
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={propertyOptions} />
          </Form.Item>

          {/* ── Billing policy badge ── */}
          {selectedPropertyId && (() => {
            const isSixMonth = isSixMonthFreePolicy(selectedProperty?.billingPolicy);
            return (
              <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#F7F7F5', border: '1px solid #E9E9E7', borderLeft: `3px solid ${isSixMonth ? '#0F7B6C' : '#CB912F'}`, borderRadius: 4 }}>
                <span style={{ fontSize: '13px', color: isSixMonth ? '#0F7B6C' : '#CB912F', fontWeight: 500 }}>
                  {isSixMonth ? '6-Month Cycle' : '3-Month Cycle'}
                </span>
                <span style={{ fontSize: '13px', color: '#787774' }}>
                  {isSixMonth
                    ? '— inspection every 6 months, always free'
                    : '— inspection every 3 months, alternates Charged / Free'}
                </span>
              </div>
            );
          })()}

          {/* ── Tenant contact quick view ── */}
          {selectedPropertyId && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: '11px', color: '#787774', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 6 }}>
                Tenant Contact
              </div>
              <div style={{ background: '#F7F7F5', border: '1px solid #E9E9E7', borderLeft: '3px solid #2383E2', borderRadius: 4, padding: '7px 10px', minHeight: 34 }}>
                {selectedProperty?.tenantContactSummary ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <Space size={8} wrap>
                      <Tag color="blue" style={tagStyle}>
                        {selectedProperty.tenantContactCount ?? 1}
                      </Tag>
                      <span style={{ color: '#37352F', fontSize: '13px', fontWeight: 500 }}>
                        {selectedProperty.tenantContactSummary}
                      </span>
                    </Space>
                    <Space size={4}>
                      <Button size="small" icon={<CopyOutlined />} onClick={copyRoutineEmailSubject}>Subject</Button>
                      <Button size="small" icon={<CopyOutlined />} onClick={copyRoutineEmailBody}>Body</Button>
                    </Space>
                  </div>
                ) : (
                  <span style={{ color: '#ACABA9', fontSize: '13px' }}>No tenant contact</span>
                )}
              </div>
            </div>
          )}

          {/* ── Recent records ── */}
          {selectedPropertyId && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '11px', color: '#787774', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 6 }}>
                Recent Records
              </div>
              <Spin spinning={recordsLoading} size="small">
                <div style={{ background: '#F7F7F5', border: '1px solid #E9E9E7', borderLeft: '3px solid #ACABA9', borderRadius: 4, padding: '6px 10px', minHeight: 32 }}>
                  {!recordsLoading && recentRecords.length === 0 ? (
                    <span style={{ color: '#ACABA9', fontSize: '13px' }}>No history</span>
                  ) : (
                    recentRecords.map((r, idx) => {
                      const tc = getType(r.type);
                      return (
                        <div key={r.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '3px 0',
                          borderBottom: idx < recentRecords.length - 1 ? '1px solid #E9E9E7' : 'none',
                        }}>
                          <span style={{ color: '#2383E2', fontSize: '12px', minWidth: 115 }}>
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
