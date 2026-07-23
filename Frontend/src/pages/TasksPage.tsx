import React, { useState, useCallback, useMemo } from 'react';
import {
  Button, Modal, Form, Input, Select, DatePicker, InputNumber,
  Popconfirm, Spin, Empty, Space, Tag, Tooltip, Card, message,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, ReloadOutlined, CopyOutlined,
  SaveOutlined, CloseOutlined, CheckCircleOutlined, SyncOutlined,
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
import { getSuggestedBillable } from '../utils/billingPolicy';
import { AddTaskModal } from './tasks/AddTaskModal';
import { TaskDraftBar } from './tasks/TaskDraftBar';
import { formatTaskDate, tagStyle } from './tasks/taskUi';

const ModalTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontSize: '15px', fontWeight: 600, color: '#37352F' }}>
    {children}
  </span>
);

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

  const handlePropertyChange = useCallback((propertyId?: number) => {
    setSelectedPropertyId(propertyId ?? null);
    if (propertyId) fetchRecentRecords(propertyId);
    else {
      setRecentRecords([]);
      form.setFieldValue('isBillable', false);
    }
  }, [fetchRecentRecords, form]);

  const handleDraftCandidateSelect = useCallback((propertyId: number) => {
    form.setFieldValue('propertyId', propertyId);
    handlePropertyChange(propertyId);
  }, [form, handlePropertyChange]);

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
                {formatTaskDate(record.scheduledAt)}
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

      <TaskDraftBar
        value={aiTaskText}
        loading={aiDraftLoading}
        onChange={setAiTaskText}
        onDraft={handleAiTaskDraft}
      />

      <Spin spinning={loading}>
        {overdueTasks.length > 0 && renderSection('Overdue', overdueTasks, '#E03E3E')}
        {renderSection('Today', todayTasks)}
        {renderSection('Tomorrow', tomorrowTasks, '#0F7B6C')}
        {renderSection('Upcoming', upcomingTasks, '#2383E2', true)}
        {renderSection('Unscheduled', unscheduledTasks)}
      </Spin>

      <AddTaskModal
        open={isModalOpen}
        submitting={submitting}
        form={form}
        propertyOptions={propertyOptions}
        typeOptions={typeOptions}
        selectedProperty={selectedProperty}
        selectedPropertyId={selectedPropertyId}
        recentRecords={recentRecords}
        recordsLoading={recordsLoading}
        isAiDraftApplied={isAiDraftApplied}
        aiDraftCandidates={aiDraftCandidates}
        aiDraftAddressQuery={aiDraftAddressQuery}
        getType={getType}
        onOk={handleOk}
        onCancel={closeModal}
        onPropertyChange={handlePropertyChange}
        onDraftCandidateSelect={handleDraftCandidateSelect}
      />

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
