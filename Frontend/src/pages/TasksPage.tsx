import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
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
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
import { handleApiError } from '../utils/errorHandler';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import isBetween from 'dayjs/plugin/isBetween';

const { Title } = Typography;
const { TextArea } = Input;

type InspectionType = 'MoveIn' | 'MoveOut' | 'Routine';
type InspectionStatus = 'Pending' | 'Ready' | 'Completed';

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

interface Property {
  id: number;
  address: string;
  billingPolicy?: 'SixMonthFree' | 'ThreeMonthToggle';
  lastInspectionDate?: string;
  lastInspectionType?: InspectionType;
  lastInspectionWasCharged?: boolean;
}

interface InspectionTask {
  id: number;
  propertyId: number;
  propertyAddress?: string;
  propertyBillingPolicy?: Property['billingPolicy'];
  scheduledAt?: string;
  type: InspectionType;
  status: InspectionStatus;
  isBillable: boolean;
  notes?: string;
  createdAt?: string;
  completedAt?: string;
  lastInspectionDate?: string;
  lastInspectionType?: InspectionType;
  lastInspectionWasCharged?: boolean;
}

interface SundryTask {
  id: number;
  description: string;
  notes?: string;
  createdAt: string;
  executionDate?: string;
}

interface CombinedTask {
  id: number;
  taskType: 'inspection' | 'sundry';
  propertyId?: number;
  propertyAddress?: string;
  propertyBillingPolicy?: Property['billingPolicy'];
  scheduledAt?: string;
  type?: InspectionType;
  status?: InspectionStatus;
  isBillable?: boolean;
  description?: string;
  executionDate?: string;
  notes?: string;
  createdAt: string;
}

dayjs.extend(isBetween);

const TasksPage: React.FC = () => {
  dayjs.locale('zh-cn');

  const [tasks, setTasks] = useState<InspectionTask[]>([]);
  const [sundryTasks, setSundryTasks] = useState<SundryTask[]>([]);
  const [combinedTasks, setCombinedTasks] = useState<CombinedTask[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completingTask, setCompletingTask] = useState<InspectionTask | null>(null);
  const [isSundryModalOpen, setIsSundryModalOpen] = useState(false);
  const [sundrySubmitting, setSundrySubmitting] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<CombinedTask | null>(null);
  const [editingInspection, setEditingInspection] = useState<InspectionTask | null>(null);
  const [editingSundry, setEditingSundry] = useState<SundryTask | null>(null);

  const [form] = Form.useForm();
  const [completeForm] = Form.useForm();
  const [sundryForm] = Form.useForm();
  const [rowForm] = Form.useForm();
  const [propertyHistory, setPropertyHistory] = useState<InspectionTask[]>([]);

  const updatePropertyHistory = (propertyId: number) => {
    const history = tasks
      .filter((t) => t.propertyId === propertyId && t.status === 'Completed')
      .sort(
        (a, b) =>
          new Date(b.completedAt || b.createdAt || '').getTime() -
          new Date(a.completedAt || a.createdAt || '').getTime()
      )
      .slice(0, 2);
    setPropertyHistory(history);
  };

  const fetchProperties = useCallback(async () => {
    try {
      const res = await axios.get<Property[]>(API_ENDPOINTS.properties);
      setProperties(res.data);
    } catch (error) {
      handleApiError(error, '获取物业列表失败');
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get<InspectionTask[]>(API_ENDPOINTS.inspectionTasks);
      setTasks(res.data);
    } catch (error) {
      handleApiError(error, '获取任务列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSundryTasks = useCallback(async () => {
    try {
      const res = await axios.get<SundryTask[]>(API_ENDPOINTS.sundryTasks);
      setSundryTasks(res.data);
    } catch (error) {
      handleApiError(error, '获取杂活列表失败');
    }
  }, []);

  useEffect(() => {
    const combined: CombinedTask[] = [
      ...tasks.map((task) => ({
        id: task.id,
        taskType: 'inspection' as const,
        propertyId: task.propertyId,
        propertyAddress: task.propertyAddress,
        propertyBillingPolicy: task.propertyBillingPolicy as Property['billingPolicy'] | undefined,
        scheduledAt: task.scheduledAt,
        type: task.type,
        status: task.status,
        isBillable: task.isBillable,
        notes: task.notes,
        createdAt: task.createdAt || '',
      })),
      ...sundryTasks.map((sundry) => ({
        id: sundry.id,
        taskType: 'sundry' as const,
        description: sundry.description,
        executionDate: sundry.executionDate,
        notes: sundry.notes,
        createdAt: sundry.createdAt,
      })),
    ];
    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setCombinedTasks(combined);
  }, [tasks, sundryTasks]);

  useEffect(() => {
    fetchProperties();
    fetchTasks();
    fetchSundryTasks();
  }, [fetchProperties, fetchTasks, fetchSundryTasks]);

  const closeModal = () => {
    setIsModalOpen(false);
    form.resetFields();
    setPropertyHistory([]);
  };

  const openSundryModal = () => {
    sundryForm.resetFields();
    setIsSundryModalOpen(true);
  };

  const closeSundryModal = () => {
    setIsSundryModalOpen(false);
    sundryForm.resetFields();
  };

  const handleSundryOk = async () => {
    try {
      const values = await sundryForm.validateFields();
      setSundrySubmitting(true);
      await axios.post(API_ENDPOINTS.sundryTasks, {
        description: values.description,
        notes: values.notes,
        executionDate: values.executionDate ? values.executionDate.toISOString() : null,
      });
      message.success('杂活已记录');
      closeSundryModal();
      fetchSundryTasks();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        handleApiError(error, '添加杂活失败');
      }
    } finally {
      setSundrySubmitting(false);
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const taskData = {
        ...values,
        scheduledAt: values.scheduledAt ? values.scheduledAt.toISOString() : null,
        isBillable: values.isBillable,
      };

      await axios.post(API_ENDPOINTS.inspectionTasks, taskData);
      message.success('添加成功');

      closeModal();
      fetchTasks();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        handleApiError(error, '添加失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API_ENDPOINTS.inspectionTasks}/${id}`);
      message.success('删除成功');
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      handleApiError(error, '删除失败');
    }
  };

  const openCompleteModal = (record: InspectionTask) => {
    setCompletingTask(record);
    completeForm.setFieldsValue({
      executionDate: dayjs(),
      notes: '',
    });
    setIsCompleteModalOpen(true);
  };

  const handleComplete = async () => {
    try {
      const values = await completeForm.validateFields();
      if (!completingTask) return;

      await axios.post(
        `${API_ENDPOINTS.inspectionTasks}/${completingTask.id}/complete`,
        {
          executionDate: values.executionDate.toISOString(),
          notes: values.notes || '',
        }
      );
      message.success('任务完成');
      setIsCompleteModalOpen(false);
      setCompletingTask(null);
      completeForm.resetFields();
      fetchTasks();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        handleApiError(error, '完成任务失败');
      }
    }
  };

  const startOfToday = dayjs().startOf('day');
  const endOfToday = dayjs().endOf('day');

  const getPlannedDate = (task: CombinedTask) => {
    if (task.taskType === 'inspection') return task.scheduledAt;
    return task.executionDate;
  };

  const formattedDate = (dateStr?: string) => {
    if (!dateStr) return '待定';
    return dayjs(dateStr).format('MM-DD ddd HH:mm');
  };

  const visibleTasks = useMemo(() => {
    const list = combinedTasks.filter((item) => {
      if (item.taskType === 'inspection' && item.status === 'Completed') return false; // 已完成归档到历史
      const dateStr = getPlannedDate(item);
      if (dateStr) {
        const d = dayjs(dateStr);
        if (d.isBefore(startOfToday)) return false;
      }
      return true;
    });
    list.sort((a, b) => {
      const da = getPlannedDate(a);
      const db = getPlannedDate(b);
      if (da && db) return dayjs(da).valueOf() - dayjs(db).valueOf();
      if (da && !db) return -1;
      if (!da && db) return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    return list;
  }, [combinedTasks, startOfToday]);

  const todayTasks = useMemo(
    () =>
      visibleTasks.filter((item) => {
        const d = getPlannedDate(item);
        return d ? dayjs(d).isBetween(startOfToday, endOfToday, 'minute', '[]') : false;
      }),
    [visibleTasks, startOfToday, endOfToday]
  );

  const upcomingTasks = useMemo(
    () =>
      visibleTasks.filter((item) => {
        const d = getPlannedDate(item);
        return d ? dayjs(d).isAfter(endOfToday) : false;
      }),
    [visibleTasks, endOfToday]
  );

  const unscheduledTasks = useMemo(
    () => visibleTasks.filter((item) => !getPlannedDate(item)),
    [visibleTasks]
  );

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

  const startEdit = (record: CombinedTask) => {
    const key = `${record.taskType}-${record.id}`;
    const inspection = record.taskType === 'inspection' ? tasks.find((t) => t.id === record.id) : null;
    const sundry = record.taskType === 'sundry' ? sundryTasks.find((s) => s.id === record.id) : null;
    setEditingKey(key);
    setEditingRecord(record);
    setEditingInspection(inspection || null);
    setEditingSundry(sundry || null);
    rowForm.setFieldsValue({
      propertyId: inspection?.propertyId ?? record.propertyId,
      type: inspection?.type ?? record.type,
      status: inspection?.status ?? record.status,
      isBillable: inspection?.isBillable ?? record.isBillable,
      scheduledAt: record.scheduledAt ? dayjs(record.scheduledAt) : null,
      notes: record.notes || '',
      description: record.description || '',
      executionDate: record.executionDate ? dayjs(record.executionDate) : null,
    });
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditingRecord(null);
    setEditingInspection(null);
    setEditingSundry(null);
    rowForm.resetFields();
  };

  const saveEdit = async () => {
    try {
      if (!editingRecord) return;
      const values = await rowForm.validateFields();
      if (editingRecord.taskType === 'inspection' && editingInspection) {
        const payload = {
          ...editingInspection,
          propertyId: values.propertyId ?? editingInspection.propertyId,
          type: values.type ?? editingInspection.type,
          status: values.status ?? editingInspection.status,
          isBillable: values.isBillable ?? editingInspection.isBillable,
          scheduledAt: values.scheduledAt ? values.scheduledAt.toISOString() : null,
          notes: values.notes ?? '',
        };
        await axios.put(`${API_ENDPOINTS.inspectionTasks}/${editingInspection.id}`, payload);
      } else if (editingRecord.taskType === 'sundry') {
        const targetId = editingSundry?.id ?? editingRecord.id;
        const payload = {
          id: targetId,
          description: values.description,
          executionDate: values.executionDate ? values.executionDate.toISOString() : null,
          notes: values.notes ?? '',
        };
        await axios.put(`${API_ENDPOINTS.sundryTasks}/${targetId}`, payload);
      }
      message.success('已保存');
      cancelEdit();
      fetchTasks();
      fetchSundryTasks();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        handleApiError(error, '保存失败');
      }
    }
  };

  const renderRow = (record: CombinedTask) => {
    const rowKey = `${record.taskType}-${record.id}`;
    const isEditing = editingKey === rowKey;
    const plannedDate = getPlannedDate(record);
    const statusConfig = record.status ? statusLabels[record.status] : null;
    const typeConfig = record.type ? typeLabels[record.type] : null;
    const inspectionTask = record.taskType === 'inspection' ? tasks.find((t) => t.id === record.id) : null;

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
            e.currentTarget.style.backgroundColor = '#fafafa';
          }
        }}
        onMouseLeave={(e) => {
          if (!isEditing) {
            e.currentTarget.style.backgroundColor = 'transparent';
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
                <Space size={4}>
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
                  <Form.Item name="isBillable" style={{ margin: 0 }}>
                    <Select
                      size="small"
                      style={{ width: 70 }}
                      options={[
                        { value: true, label: '收费' },
                        { value: false, label: '免费' },
                      ]}
                    />
                  </Form.Item>
                </Space>
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
                {record.taskType === 'inspection' && record.status !== 'Completed' && inspectionTask && (
                  <Button
                    size="small"
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={() => openCompleteModal(inspectionTask)}
                  >
                    完成
                  </Button>
                )}
                {record.taskType === 'sundry' && (
                  <Popconfirm
                    title="确定删除这条杂活记录吗?"
                    onConfirm={async () => {
                      try {
                        await axios.delete(`${API_ENDPOINTS.sundryTasks}/${record.id}`);
                        message.success('删除成功');
                        fetchSundryTasks();
                      } catch (error) {
                        handleApiError(error, '删除失败');
                      }
                    }}
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
              onChange={(value) => {
                updatePropertyHistory(value);
              }}
            />
          </Form.Item>
          <div style={{ marginTop: -16, marginBottom: 16, padding: '8px 10px', background: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0' }}>
            {propertyHistory.length === 0 ? (
              <div style={{ color: '#999', fontSize: 12 }}>最近两次记录：无</div>
            ) : (
              propertyHistory.map((h) => {
                const date = h.completedAt
                  ? dayjs(h.completedAt).format('YYYY-MM-DD')
                  : h.createdAt
                  ? dayjs(h.createdAt).format('YYYY-MM-DD')
                  : '未知';
                const typeLabel = h.type ? typeLabels[h.type]?.label : '';
                const charge = h.isBillable ? '收费' : '免费';
                return (
                  <div key={`history-${h.id}`} style={{ color: '#555', fontSize: 12, lineHeight: '18px' }}>
                    {date} ｜ {typeLabel} ｜ {charge} ｜ {h.notes || '无备注'}
                  </div>
                );
              })
            )}
          </div>

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
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              placeholder="选择计划时间"
            />
          </Form.Item>

          <Form.Item
            name="isBillable"
            label="是否收费"
            rules={[{ required: true, message: '请选择是否收费' }]}
            initialValue={true}
          >
            <Select
              options={[
                { value: true, label: '收费' },
                { value: false, label: '免费' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="notes"
            label="预约备注"
            rules={[{ max: 500, message: '备注不能超过500个字符' }]}
          >
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
