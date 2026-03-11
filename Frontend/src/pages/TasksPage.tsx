import React, { useState, useCallback, useMemo } from 'react';
import {
  Button, Modal, Form, Input, Select, DatePicker,
  Popconfirm, Spin, Empty, Space, Tag, Tooltip, Card, message,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, ReloadOutlined, EditOutlined,
  SaveOutlined, CloseOutlined, CheckCircleOutlined, SyncOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { useTasks } from '../hooks/useTasks';
import { useProperties } from '../hooks/useProperties';
import type { CombinedTask, InspectionRecordDto } from '../types/api';
import { API_ENDPOINTS } from '../config/api';
import { IndTitle, modalStyles, typeLabels } from '../components/shared';

const { TextArea } = Input;

// ── Module-level constants (computed once) ────────────────────
const DISABLED_MINUTES = Array.from({ length: 60 }, (_, i) => i).filter(i => i % 10 !== 0);

const formattedDate = (dateStr?: string): string => {
  if (!dateStr) return '待定';
  return dayjs(dateStr).format('MM-DD ddd HH:mm');
};

const ModalTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#e6edf3' }}>
    {children}
  </span>
);

const tagStyle: React.CSSProperties = { margin: 0, fontSize: '11px', letterSpacing: '0.3px' };

const TasksPage: React.FC = () => {
  const [syncing,             setSyncing]             = useState(false);
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
  const loading = tasksLoading || propertiesLoading;

  const propertyOptions = useMemo(
    () => properties.map(p => ({ value: p.id, label: p.address })),
    [properties]
  );

  // ── Handlers ────────────────────────────────────────────────
  const handleSync = useCallback(async (target: 'all' | 'calendar' | 'sheets') => {
    setSyncing(true);
    try {
      await axios.post(`${API_ENDPOINTS.googleSync}/${target}`);
      const label =
        target === 'all'      ? 'Calendar + Sheets' :
        target === 'calendar' ? 'Google Calendar'   : 'Google Sheets';
      message.success(`${label} 同步成功`);
    } catch {
      message.error('同步失败，请检查后端日志');
    } finally {
      setSyncing(false);
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
      await createInspectionTask({
        propertyId:  values.propertyId,
        type:        values.type,
        isBillable:  values.isBillable ?? false,
        scheduledAt: values.scheduledAt ? values.scheduledAt.toISOString() : undefined,
        notes:       values.notes,
      });
      closeModal();
    } catch {
      // Error handled by hook
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
      await completeInspectionTask(completingTask.id, {
        executionDate: values.executionDate.toISOString(),
      });
      closeCompleteModal();
    } catch {
      // Error handled by hook
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
  const gridTemplate = '130px 2fr 0.9fr 1fr 144px';

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
    const rowKey    = `inspection-${record.id}`;
    const isEditing = editingKey === rowKey;
    const typeConfig = record.type != null ? typeLabels[record.type] : null;

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
          {/* 时间 */}
          <div style={cellText}>
            {isEditing ? (
              <Form.Item name="scheduledAt" style={{ margin: 0 }}>
                <DatePicker showTime format="MM-DD HH:mm" style={{ width: '100%' }} placeholder="选择时间" size="small" />
              </Form.Item>
            ) : (
              <span style={{ fontSize: '12px', color: record.scheduledAt ? '#00d4ff' : '#484f58', fontFamily: 'monospace', letterSpacing: '0.3px' }}>
                {formattedDate(record.scheduledAt)}
              </span>
            )}
          </div>

          {/* 地址 */}
          <div style={cellText}>
            {isEditing ? (
              <Form.Item name="propertyId" style={{ margin: 0 }}>
                <Select showSearch optionFilterProp="label" placeholder="选择物业" size="small" options={propertyOptions} />
              </Form.Item>
            ) : (
              <Tooltip title={record.propertyAddress}>
                <span style={{ fontWeight: 600, fontSize: '13px', color: '#e6edf3' }}>
                  {record.propertyAddress || '未填写地址'}
                </span>
              </Tooltip>
            )}
          </div>

          {/* 类型 */}
          <div style={cellText}>
            {isEditing ? (
              <Form.Item name="type" style={{ margin: 0 }} rules={[{ required: true, message: '选择类型' }]}>
                <Select size="small" options={Object.entries(typeLabels).map(([v, cfg]) => ({ value: Number(v), label: cfg.label }))} />
              </Form.Item>
            ) : typeConfig ? (
              <Tag color={typeConfig.color} style={tagStyle}>{typeConfig.label}</Tag>
            ) : '-'}
          </div>

          {/* 收费 */}
          <div style={cellText}>
            {isEditing ? (
              <Form.Item name="isBillable" style={{ margin: 0 }}>
                <Select size="small" style={{ width: 80 }} options={[{ value: true, label: '收费' }, { value: false, label: '免费' }]} />
              </Form.Item>
            ) : (
              <Tag color={record.isBillable ? 'gold' : 'green'} style={tagStyle}>
                {record.isBillable ? '收费' : '免费'}
              </Tag>
            )}
          </div>

          {/* 操作 */}
          <Space size={4} onClick={(e) => e.stopPropagation()}>
            {isEditing ? (
              <>
                <Button size="small" type="primary" icon={<SaveOutlined />} onClick={saveEdit}>保存</Button>
                <Button size="small" icon={<CloseOutlined />} onClick={cancelEdit}>取消</Button>
              </>
            ) : (
              <>
                <Button size="small" icon={<EditOutlined />} onClick={() => startEdit(record)}>编辑</Button>
                <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => openCompleteModal(record)}>完成</Button>
                <Popconfirm title="确定删除这条任务吗?" onConfirm={() => deleteInspectionTask(record.id)} okText="确定" cancelText="取消">
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
                  <Input placeholder="备注" size="small" />
                </Form.Item>
              ) : record.notes ? (
                <Tooltip title={record.notes}>
                  <span style={{ color: '#484f58', fontSize: '11px', letterSpacing: '0.3px' }}>▸ {record.notes}</span>
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
              <div>时间</div><div>地址</div><div>类型</div><div>收费</div><div>操作</div>
            </div>
          </div>

          {data.length === 0 ? (
            <div style={{ padding: '20px 16px', textAlign: 'center' }}>
              <Empty description={<span style={{ color: '#484f58', fontSize: '11px', letterSpacing: '2px' }}>— 暂无任务 —</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
        <IndTitle>任务计划</IndTitle>
        <Space size={4} wrap>
          <Button size="small" icon={<ReloadOutlined />} onClick={fetchTasks} loading={loading}>刷新</Button>
          <Button size="small" icon={<SyncOutlined />} onClick={() => handleSync('calendar')} loading={syncing}>同步日历</Button>
          <Button size="small" icon={<SyncOutlined />} onClick={() => handleSync('sheets')} loading={syncing}>同步表格</Button>
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>添加任务</Button>
        </Space>
      </div>

      <Spin spinning={loading}>
        {overdueTasks.length > 0 && renderSection('逾期', overdueTasks, '#f85149')}
        {renderSection('今日', todayTasks)}
        {renderSection('未来', upcomingTasks)}
        {renderSection('待定', unscheduledTasks)}
      </Spin>

      {/* ── 添加任务弹窗 ── */}
      <Modal title={<ModalTitle>添加任务</ModalTitle>} open={isModalOpen} onOk={handleOk} onCancel={closeModal}
        confirmLoading={submitting} okText="添加" cancelText="取消" destroyOnHidden width={600} styles={modalStyles}>
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
          <Form.Item name="propertyId" label="选择物业" rules={[{ required: true, message: '请选择物业' }]}>
            <Select placeholder="请选择物业" showSearch optionFilterProp="label"
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={propertyOptions} />
          </Form.Item>

          {/* ── 最近记录 ── */}
          {selectedPropertyId && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '10px', color: '#484f58', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>
                最近记录
              </div>
              <Spin spinning={recordsLoading} size="small">
                <div style={{ background: '#0d1117', border: '1px solid #30363d', borderLeft: '3px solid #444d56', borderRadius: 2, padding: '6px 10px', minHeight: 32 }}>
                  {!recordsLoading && recentRecords.length === 0 ? (
                    <span style={{ color: '#484f58', fontSize: '11px' }}>暂无历史记录</span>
                  ) : (
                    recentRecords.map((r, idx) => (
                      <div key={r.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '3px 0',
                        borderBottom: idx < recentRecords.length - 1 ? '1px solid #30363d' : 'none',
                      }}>
                        <span style={{ color: '#00d4ff', fontFamily: 'monospace', fontSize: '11px', minWidth: 115 }}>
                          {dayjs(r.executionDate).format('YYYY-MM-DD HH:mm')}
                        </span>
                        <Tag color={typeLabels[r.type]?.color} style={tagStyle}>
                          {typeLabels[r.type]?.label ?? String(r.type)}
                        </Tag>
                        <Tag color={r.isCharged ? 'gold' : 'green'} style={tagStyle}>
                          {r.isCharged ? '收费' : '免费'}
                        </Tag>
                      </div>
                    ))
                  )}
                </div>
              </Spin>
            </div>
          )}

          <Form.Item name="type" label="检查类型" rules={[{ required: true, message: '请选择检查类型' }]}>
            <Select placeholder="请选择检查类型">
              {Object.entries(typeLabels).map(([value, config]) => (
                <Select.Option key={value} value={Number(value)}>{config.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="isBillable" label="是否收费" initialValue={false} rules={[{ required: true, message: '请选择收费状态' }]}>
            <Select options={[{ value: false, label: '免费' }, { value: true, label: '收费' }]} />
          </Form.Item>

          <Form.Item name="scheduledAt" label="计划时间">
            <DatePicker
              showTime={{ format: 'HH:mm', hideDisabledOptions: true, disabledMinutes: () => DISABLED_MINUTES }}
              format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} placeholder="选择计划时间（留空则放入待定）" />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <TextArea rows={3} placeholder="输入备注..." showCount maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── 完成任务弹窗 ── */}
      <Modal title={<ModalTitle>完成任务</ModalTitle>} open={isCompleteModalOpen} onOk={handleComplete}
        onCancel={closeCompleteModal} okText="完成" cancelText="取消" destroyOnHidden width={400} styles={modalStyles}>
        <Form form={completeForm} layout="vertical">
          <Form.Item name="executionDate" label="时间" rules={[{ required: true, message: '请选择时间' }]}>
            <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TasksPage;
