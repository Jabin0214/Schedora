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
import type { InspectionType, InspectionStatus, CombinedTask } from '../types/api';

const { Title } = Typography;
const { TextArea } = Input;

const typeLabels: Record<InspectionType, { label: string; color: string }> = {
  MoveIn: { label: '入住检查', color: 'blue' },
  MoveOut: { label: '退房检查', color: 'orange' },
  Routine: { label: '例行检查', color: 'green' },
};

const statusLabels: Record<InspectionStatus, { label: string; color: string }> = {
  Pending: { label: '待预约', color: 'default' },
  Ready: { label: '待执行', color: 'blue' },
  Completed: { label: '已完成', color: 'success' },
};

const TasksPage: React.FC = () => {
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completingTask, setCompletingTask] = useState<CombinedTask | null>(null);
  const [isSundryModalOpen, setIsSundryModalOpen] = useState(false);
  const [sundrySubmitting, setSundrySubmitting] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<CombinedTask | null>(null);

  const [form] = Form.useForm();
  const [completeForm] = Form.useForm();
  const [sundryForm] = Form.useForm();
  const [rowForm] = Form.useForm();

  // 使用自定义hooks
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
    createSundryTask,
    updateSundryTask,
    deleteSundryTask,
  } = useTasks();

  const { properties, loading: propertiesLoading } = useProperties();

  const loading = tasksLoading || propertiesLoading;

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    form.resetFields();
  }, [form]);

  const openSundryModal = useCallback(() => {
    sundryForm.resetFields();
    setIsSundryModalOpen(true);
  }, [sundryForm]);

  const closeSundryModal = useCallback(() => {
    setIsSundryModalOpen(false);
    sundryForm.resetFields();
  }, [sundryForm]);

  const handleSundryOk = useCallback(async () => {
    try {
      const values = await sundryForm.validateFields();
      setSundrySubmitting(true);
      await createSundryTask({
        description: values.description,
        notes: values.notes,
        executionDate: values.executionDate ? values.executionDate.toISOString() : undefined,
      });
      closeSundryModal();
    } catch (error) {
      // Error handled by hook
    } finally {
      setSundrySubmitting(false);
    }
  }, [sundryForm, createSundryTask, closeSundryModal]);

  const handleOk = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      await createInspectionTask({
        propertyId: values.propertyId,
        type: values.type,
        status: values.status,
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

  const handleDelete = useCallback(async (id: number) => {
    await deleteInspectionTask(id);
  }, [deleteInspectionTask]);

  const openCompleteModal = useCallback((record: CombinedTask) => {
    setCompletingTask(record);
    completeForm.setFieldsValue({
      executionDate: dayjs(),
      notes: '',
    });
    setIsCompleteModalOpen(true);
  }, [completeForm]);

  const handleComplete = useCallback(async () => {
    try {
      const values = await completeForm.validateFields();
      if (!completingTask) return;

      await completeInspectionTask(completingTask.id, {
        executionDate: values.executionDate.toISOString(),
        notes: values.notes || '',
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

  const getPlannedDate = (task: CombinedTask) => {
    if (task.taskType === 'inspection') return task.scheduledAt;
    return task.executionDate;
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
    const key = `${record.taskType}-${record.id}`;
    setEditingKey(key);
    setEditingRecord(record);
    rowForm.setFieldsValue({
      propertyId: record.propertyId,
      type: record.type,
      status: record.status,
      scheduledAt: record.scheduledAt ? dayjs(record.scheduledAt) : null,
      notes: record.notes || '',
      description: record.description || '',
      executionDate: record.executionDate ? dayjs(record.executionDate) : null,
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

      if (editingRecord.taskType === 'inspection') {
        await updateInspectionTask(editingRecord.id, {
          propertyId: values.propertyId,
          type: values.type,
          status: values.status,
          scheduledAt: values.scheduledAt ? values.scheduledAt.toISOString() : undefined,
          notes: values.notes || '',
        });
      } else if (editingRecord.taskType === 'sundry') {
        await updateSundryTask(editingRecord.id, {
          description: values.description,
          executionDate: values.executionDate ? values.executionDate.toISOString() : undefined,
          notes: values.notes || '',
        });
      }

      cancelEdit();
    } catch (error) {
      // Error handled by hook
    }
  }, [editingRecord, rowForm, updateInspectionTask, updateSundryTask, cancelEdit]);

  const renderRow = (record: CombinedTask) => {
    const rowKey = `${record.taskType}-${record.id}`;
    const isEditing = editingKey === rowKey;
    const plannedDate = getPlannedDate(record);
    const statusConfig = record.status ? statusLabels[record.status] : null;
    const typeConfig = record.type ? typeLabels[record.type] : null;

    return (
      <div
        key={rowKey}
        style={{
          ...rowStyle,
          backgroundColor: isEditing ? '#f5f7fa' : 'transparent',
        }}
        onClick={() => {
          if (!isEditing) startEdit(record);
        }}
        onMouseEnter={(e) => {
          if (!isEditing) {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#fafafa';
          }
        }}
        onMouseLeave={(e) => {
          if (!isEditing) {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
          }
        }}
      >
        {/* 第一行：主要信息 */}
        <div style={firstRowStyle}>
          {/* 时间 */}
          <div style={{ ...cellTextStyle, color: '#444', fontWeight: 500 }}>
            {isEditing ? (
              record.taskType === 'inspection' ? (
                <Form.Item name="scheduledAt" style={{ margin: 0 }}>
                  <DatePicker
                    showTime
                    format="MM-DD ddd HH:mm"
                    style={{ width: '100%' }}
                    placeholder="选择时间"
                    size="small"
                  />
                </Form.Item>
              ) : (
                <Form.Item name="executionDate" style={{ margin: 0 }}>
                  <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" placeholder="选择日期" size="small" />
                </Form.Item>
              )
            ) : (
              <span style={{ fontSize: '13px' }}>{formattedDate(plannedDate)}</span>
            )}
          </div>

          {/* 地址/描述 */}
          <div style={cellTextStyle}>
            {record.taskType === 'inspection' ? (
              isEditing ? (
                <Form.Item name="propertyId" style={{ margin: 0 }}>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    placeholder="选择物业"
                    options={properties.map((p) => ({ value: p.id, label: p.address }))}
                    size="small"
                  />
                </Form.Item>
              ) : (
                <Tooltip title={record.propertyAddress}>
                  <span style={{ fontWeight: 500, fontSize: '14px' }}>{record.propertyAddress || '未填写地址'}</span>
                </Tooltip>
              )
            ) : isEditing ? (
              <Form.Item
                name="description"
                style={{ margin: 0 }}
                rules={[{ required: true, message: '描述必填' }, { max: 200, message: '最多200字' }]}
              >
                <Input placeholder="描述" size="small" />
              </Form.Item>
            ) : (
              <Tooltip title={record.description}>
                <span style={{ fontWeight: 500, fontSize: '14px' }}>{record.description || '未填写描述'}</span>
              </Tooltip>
            )}
          </div>

          {/* 类型 */}
          <div style={cellTextStyle}>
            {record.taskType === 'inspection' ? (
              isEditing ? (
                <Form.Item name="type" style={{ margin: 0 }} rules={[{ required: true, message: '选择类型' }]}>
                  <Select
                    size="small"
                    options={Object.entries(typeLabels).map(([value, cfg]) => ({
                      value,
                      label: cfg.label,
                    }))}
                  />
                </Form.Item>
              ) : typeConfig ? (
                <Tag color={typeConfig.color} style={{ margin: 0 }}>{typeConfig.label}</Tag>
              ) : (
                '-'
              )
            ) : (
              <Tag color="purple" style={{ margin: 0 }}>杂活</Tag>
            )}
          </div>

          {/* 状态/收费 */}
          <div style={cellTextStyle}>
            {record.taskType === 'inspection' ? (
              isEditing ? (
                <Form.Item name="status" style={{ margin: 0 }} rules={[{ required: true, message: '选择状态' }]}>
                  <Select
                    size="small"
                    style={{ width: 90 }}
                    options={Object.entries(statusLabels).map(([value, cfg]) => ({
                      value,
                      label: cfg.label,
                    }))}
                  />
                </Form.Item>
              ) : (
                <Space size={4}>
                  {statusConfig && <Tag color={statusConfig.color} style={{ margin: 0 }}>{statusConfig.label}</Tag>}
                  {record.isBillable !== undefined && (
                    <Tag color={record.isBillable ? 'gold' : 'green'} style={{ margin: 0 }}>
                      {record.isBillable ? '收费' : '免费'}
                    </Tag>
                  )}
                </Space>
              )
            ) : record.executionDate ? (
              <span style={{ fontSize: '13px' }}>{dayjs(record.executionDate).format('YYYY-MM-DD')}</span>
            ) : (
              <span style={{ color: '#999', fontSize: '13px' }}>待定</span>
            )}
          </div>

          {/* 操作按钮 */}
          <Space size="small" onClick={(e) => e.stopPropagation()}>
            {isEditing ? (
              <>
                <Button size="small" type="primary" icon={<SaveOutlined />} onClick={saveEdit}>
                  保存
                </Button>
                <Button size="small" icon={<CloseOutlined />} onClick={cancelEdit}>
                  取消
                </Button>
              </>
            ) : (
              <>
                <Button size="small" icon={<EditOutlined />} onClick={() => startEdit(record)}>
                  编辑
                </Button>
                {record.taskType === 'inspection' && record.status !== 'Completed' && (
                  <Button
                    size="small"
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={() => openCompleteModal(record)}
                  >
                    完成
                  </Button>
                )}
                {record.taskType === 'sundry' && (
                  <Popconfirm
                    title="确定删除这条杂活记录吗?"
                    onConfirm={() => deleteSundryTask(record.id)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button danger size="small" icon={<DeleteOutlined />} />
                  </Popconfirm>
                )}
                {record.taskType === 'inspection' && (
                  <Popconfirm
                    title="确定删除这条任务吗?"
                    onConfirm={() => handleDelete(record.id)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button danger size="small" icon={<DeleteOutlined />} />
                  </Popconfirm>
                )}
              </>
            )}
          </Space>
        </div>

        {/* 第二行：备注 - 仅在有内容或编辑时显示 */}
        {(isEditing || record.notes) && (
          <div style={secondRowStyle}>
            {/* 占位 - 对齐第一行的时间列 */}
            <div></div>

            {/* 备注 */}
            <div style={cellTextStyle}>
              {isEditing ? (
                <Form.Item name="notes" style={{ margin: 0 }}>
                  <Input placeholder="备注" size="small" />
                </Form.Item>
              ) : record.notes ? (
                <Tooltip title={record.notes}>
                  <span style={{ color: '#888', fontSize: '12px' }}>
                    💬 {record.notes}
                  </span>
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
      <div style={{
        padding: '5px 10px',
        background: '#fafafa',
        fontWeight: 600,
        cursor: 'default',
        borderBottom: '1px solid #e0e0e0',
        fontSize: '13px',
      }}>
        <div style={firstRowStyle}>
          <div>时间</div>
          <div>地址/描述</div>
          <div>类型</div>
          <div>状态/收费</div>
          <div>操作</div>
        </div>
        <div style={{...secondRowStyle, fontSize: '11px', color: '#999', marginTop: 2}}>
          <div></div>
          <div>💬 备注</div>
        </div>
      </div>
      {data.length === 0 ? (
        <div style={{ padding: '10px 16px' }}>
          <Empty description="暂无任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      ) : (
        <Form form={rowForm} component={false}>
          {data.map(renderRow)}
        </Form>
      )}
    </Card>
  );

  return (
    <div>
      <div
        style={{
          marginBottom: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          📅 任务计划
        </Title>
        <Space size="small">
          <Button size="small" icon={<ReloadOutlined />} onClick={fetchTasks} loading={loading}>
            刷新
          </Button>
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
            添加新任务
          </Button>
          <Button size="small" onClick={openSundryModal}>添加杂活</Button>
        </Space>
      </div>

      <Spin spinning={loading}>
        {renderSection('今日', todayTasks)}
        {renderSection('未来', upcomingTasks)}
        {renderSection('待定', unscheduledTasks)}
      </Spin>

      <Modal
        title="添加新任务"
        open={isModalOpen}
        onOk={handleOk}
        onCancel={closeModal}
        confirmLoading={submitting}
        okText="添加"
        cancelText="取消"
        destroyOnHidden
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="propertyId"
            label="选择物业"
            rules={[{ required: true, message: '请选择物业' }]}
          >
            <Select
              placeholder="请选择物业"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={properties.map((p) => ({
                value: p.id,
                label: p.address,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="type"
            label="检查类型"
            rules={[{ required: true, message: '请选择检查类型' }]}
          >
            <Select placeholder="请选择检查类型">
              {Object.entries(typeLabels).map(([value, config]) => (
                <Select.Option key={value} value={value}>
                  {config.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="请选择状态">
              {Object.entries(statusLabels).map(([value, config]) => (
                <Select.Option key={value} value={value}>
                  {config.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="scheduledAt" label="计划时间">
            <DatePicker
              showTime={{
                format: 'HH:mm',
                hideDisabledOptions: true, // 隐藏非 10 倍数的选项，让界面更整洁
                disabledMinutes: () => {
                  const disabled = [];
                  for (let i = 0; i < 60; i++) {
                    if (i % 10 !== 0) {
                      disabled.push(i);
                    }
                  }
                  return disabled;
                },
              }}
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              placeholder="选择计划时间"
            />
          </Form.Item>

          <Form.Item name="notes" label="预约备注">
            <TextArea rows={4} placeholder="输入预约备注..." showCount maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="完成任务"
        open={isCompleteModalOpen}
        onOk={handleComplete}
        onCancel={() => {
          setIsCompleteModalOpen(false);
          setCompletingTask(null);
          completeForm.resetFields();
        }}
        okText="完成"
        cancelText="取消"
        destroyOnHidden
        width={500}
      >
        <Form form={completeForm} layout="vertical">
          <Form.Item
            name="executionDate"
            label="执行日期"
            rules={[{ required: true, message: '请选择执行日期' }]}
          >
            <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="完成备注">
            <TextArea rows={3} placeholder="输入完成备注..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="记录杂活"
        open={isSundryModalOpen}
        onOk={handleSundryOk}
        onCancel={closeSundryModal}
        confirmLoading={sundrySubmitting}
        okText="保存"
        cancelText="取消"
        destroyOnHidden
        width={520}
      >
        <Form form={sundryForm} layout="vertical">
          <Form.Item
            name="description"
            label="描述"
            rules={[
              { required: true, message: '描述必填' },
              { max: 200, message: '描述不能超过200个字符' },
            ]}
          >
            <Input placeholder="例如：购买微波炉" showCount maxLength={200} />
          </Form.Item>

          <Form.Item name="executionDate" label="执行日期">
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item
            name="notes"
            label="备注"
            rules={[{ max: 500, message: '备注不能超过500个字符' }]}
          >
            <TextArea rows={3} placeholder="输入详细说明..." showCount maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TasksPage;