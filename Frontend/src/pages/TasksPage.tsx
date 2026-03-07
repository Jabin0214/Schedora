import React, { useState, useCallback } from 'react';
import {
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Popconfirm,
  Spin,
  Empty,
  Typography,
  Space,
  Tag,
  Tooltip,
  Card,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  ReloadOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTasks } from '../hooks/useTasks';
import { useProperties } from '../hooks/useProperties';
import type { InspectionType, CombinedTask } from '../types/api';

const { Title } = Typography;
const { TextArea } = Input;

const typeLabels: Record<InspectionType, { label: string; color: string }> = {
  MoveIn: { label: '入住检查', color: 'blue' },
  MoveOut: { label: '退房检查', color: 'orange' },
  Routine: { label: '例行检查', color: 'green' },
};

const TasksPage: React.FC = () => {
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completingTask, setCompletingTask] = useState<CombinedTask | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<CombinedTask | null>(null);

  const [form] = Form.useForm();
  const [completeForm] = Form.useForm();
  const [rowForm] = Form.useForm();

  const {
    loading: tasksLoading,
    todayTasks,
    upcomingTasks,
    unscheduledTasks,
    fetchTasks,
    createInspectionTask,
    updateInspectionTask,
    deleteInspectionTask,
    completeInspectionTask,
  } = useTasks();

  const { properties, loading: propertiesLoading } = useProperties();
  const loading = tasksLoading || propertiesLoading;

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    form.resetFields();
  }, [form]);

  const handleOk = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await createInspectionTask({
        propertyId: values.propertyId,
        type: values.type,
        scheduledAt: values.scheduledAt ? values.scheduledAt.toISOString() : undefined,
        notes: values.notes,
      });
      closeModal();
    } catch (error) {
      // Error handled by hook
    } finally {
      setSubmitting(false);
    }
  }, [form, createInspectionTask, closeModal]);

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
      setIsCompleteModalOpen(false);
      setCompletingTask(null);
      completeForm.resetFields();
    } catch (error) {
      // Error handled by hook
    }
  }, [completeForm, completingTask, completeInspectionTask]);

  const formattedDate = (dateStr?: string) => {
    if (!dateStr) return '待定';
    return dayjs(dateStr).format('MM-DD ddd HH:mm');
  };

  const rowStyle: React.CSSProperties = {
    padding: '6px 10px',
    borderBottom: '1px solid #f0f0f0',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  };

  const cellTextStyle: React.CSSProperties = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const firstRowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '130px 2fr 0.9fr 1fr 140px',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  };

  const secondRowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '130px 1fr',
    alignItems: 'center',
    gap: 6,
    fontSize: '12px',
    color: '#666',
  };

  const startEdit = useCallback((record: CombinedTask) => {
    setEditingKey(`inspection-${record.id}`);
    setEditingRecord(record);
    rowForm.setFieldsValue({
      propertyId: record.propertyId,
      type: record.type,
      isBillable: record.isBillable,
      scheduledAt: record.scheduledAt ? dayjs(record.scheduledAt) : null,
      notes: record.notes || '',
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
        propertyId: values.propertyId,
        type: values.type,
        isBillable: values.isBillable,
        scheduledAt: values.scheduledAt ? values.scheduledAt.toISOString() : undefined,
        notes: values.notes || '',
      });
      cancelEdit();
    } catch (error) {
      // Error handled by hook
    }
  }, [editingRecord, rowForm, updateInspectionTask, cancelEdit]);

  const renderRow = (record: CombinedTask) => {
    const rowKey = `inspection-${record.id}`;
    const isEditing = editingKey === rowKey;
    const typeConfig = record.type ? typeLabels[record.type] : null;

    return (
      <div
        key={rowKey}
        style={{ ...rowStyle, backgroundColor: isEditing ? '#f5f7fa' : 'transparent' }}
        onClick={() => { if (!isEditing) startEdit(record); }}
        onMouseEnter={(e) => { if (!isEditing) (e.currentTarget as HTMLElement).style.backgroundColor = '#fafafa'; }}
        onMouseLeave={(e) => { if (!isEditing) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
      >
        <div style={firstRowStyle}>
          {/* 时间 */}
          <div style={{ ...cellTextStyle, color: '#444', fontWeight: 500 }}>
            {isEditing ? (
              <Form.Item name="scheduledAt" style={{ margin: 0 }}>
                <DatePicker showTime format="MM-DD HH:mm" style={{ width: '100%' }} placeholder="选择时间" size="small" />
              </Form.Item>
            ) : (
              <span style={{ fontSize: '13px' }}>{formattedDate(record.scheduledAt)}</span>
            )}
          </div>

          {/* 地址 */}
          <div style={cellTextStyle}>
            {isEditing ? (
              <Form.Item name="propertyId" style={{ margin: 0 }}>
                <Select
                  showSearch optionFilterProp="label" placeholder="选择物业" size="small"
                  options={properties.map((p) => ({ value: p.id, label: p.address }))}
                />
              </Form.Item>
            ) : (
              <Tooltip title={record.propertyAddress}>
                <span style={{ fontWeight: 500, fontSize: '14px' }}>{record.propertyAddress || '未填写地址'}</span>
              </Tooltip>
            )}
          </div>

          {/* 类型 */}
          <div style={cellTextStyle}>
            {isEditing ? (
              <Form.Item name="type" style={{ margin: 0 }} rules={[{ required: true, message: '选择类型' }]}>
                <Select size="small" options={Object.entries(typeLabels).map(([value, cfg]) => ({ value, label: cfg.label }))} />
              </Form.Item>
            ) : typeConfig ? (
              <Tag color={typeConfig.color} style={{ margin: 0 }}>{typeConfig.label}</Tag>
            ) : '-'}
          </div>

          {/* 收费 */}
          <div style={cellTextStyle}>
            {isEditing ? (
              <Form.Item name="isBillable" style={{ margin: 0 }}>
                <Select size="small" style={{ width: 80 }} options={[
                  { value: true, label: '收费' },
                  { value: false, label: '免费' },
                ]} />
              </Form.Item>
            ) : (
              <Tag color={record.isBillable ? 'gold' : 'green'} style={{ margin: 0 }}>
                {record.isBillable ? '收费' : '免费'}
              </Tag>
            )}
          </div>

          {/* 操作 */}
          <Space size="small" onClick={(e) => e.stopPropagation()}>
            {isEditing ? (
              <>
                <Button size="small" type="primary" icon={<SaveOutlined />} onClick={saveEdit}>保存</Button>
                <Button size="small" icon={<CloseOutlined />} onClick={cancelEdit}>取消</Button>
              </>
            ) : (
              <>
                <Button size="small" icon={<EditOutlined />} onClick={() => startEdit(record)}>编辑</Button>
                <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => openCompleteModal(record)}>
                  完成
                </Button>
                <Popconfirm title="确定删除这条任务吗?" onConfirm={() => deleteInspectionTask(record.id)} okText="确定" cancelText="取消">
                  <Button danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
              </>
            )}
          </Space>
        </div>

        {(isEditing || record.notes) && (
          <div style={secondRowStyle}>
            <div></div>
            <div style={cellTextStyle}>
              {isEditing ? (
                <Form.Item name="notes" style={{ margin: 0 }}>
                  <Input placeholder="备注" size="small" />
                </Form.Item>
              ) : record.notes ? (
                <Tooltip title={record.notes}>
                  <span style={{ color: '#888', fontSize: '12px' }}>💬 {record.notes}</span>
                </Tooltip>
              ) : null}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSection = (title: string, data: CombinedTask[]) => (
    <Card
      size="small"
      title={<span style={{ fontSize: '14px', fontWeight: 600 }}>{`${title}（${data.length}）`}</span>}
      styles={{ body: { padding: 0 } }}
      style={{ marginBottom: 8 }}
    >
      <div style={{ padding: '5px 10px', background: '#fafafa', fontWeight: 600, cursor: 'default', borderBottom: '1px solid #e0e0e0', fontSize: '13px' }}>
        <div style={firstRowStyle}>
          <div>时间</div><div>地址</div><div>类型</div><div>收费</div><div>操作</div>
        </div>
        <div style={{ ...secondRowStyle, fontSize: '11px', color: '#999', marginTop: 2 }}>
          <div></div><div>💬 备注</div>
        </div>
      </div>
      {data.length === 0 ? (
        <div style={{ padding: '10px 16px' }}>
          <Empty description="暂无任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      ) : (
        <Form form={rowForm} component={false}>{data.map(renderRow)}</Form>
      )}
    </Card>
  );

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>📅 任务计划</Title>
        <Space size="small">
          <Button size="small" icon={<ReloadOutlined />} onClick={fetchTasks} loading={loading}>刷新</Button>
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>添加任务</Button>
        </Space>
      </div>

      <Spin spinning={loading}>
        {renderSection('今日', todayTasks)}
        {renderSection('未来', upcomingTasks)}
        {renderSection('待定', unscheduledTasks)}
      </Spin>

      {/* 添加任务弹窗 */}
      <Modal title="添加任务" open={isModalOpen} onOk={handleOk} onCancel={closeModal}
        confirmLoading={submitting} okText="添加" cancelText="取消" destroyOnHidden width={600}>
        <Form form={form} layout="vertical">
          <Form.Item name="propertyId" label="选择物业" rules={[{ required: true, message: '请选择物业' }]}>
            <Select placeholder="请选择物业" showSearch optionFilterProp="children"
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={properties.map((p) => ({ value: p.id, label: p.address }))} />
          </Form.Item>
          <Form.Item name="type" label="检查类型" rules={[{ required: true, message: '请选择检查类型' }]}>
            <Select placeholder="请选择检查类型">
              {Object.entries(typeLabels).map(([value, config]) => (
                <Select.Option key={value} value={value}>{config.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="scheduledAt" label="计划时间">
            <DatePicker
              showTime={{ format: 'HH:mm', hideDisabledOptions: true, disabledMinutes: () => Array.from({ length: 60 }, (_, i) => i).filter(i => i % 10 !== 0) }}
              format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} placeholder="选择计划时间（留空则放入待定）" />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <TextArea rows={3} placeholder="输入备注..." showCount maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 完成任务弹窗 */}
      <Modal title="完成任务" open={isCompleteModalOpen} onOk={handleComplete}
        onCancel={() => { setIsCompleteModalOpen(false); setCompletingTask(null); completeForm.resetFields(); }}
        okText="完成" cancelText="取消" destroyOnHidden width={400}>
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
