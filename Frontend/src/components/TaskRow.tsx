import React, { memo, useCallback } from 'react';
import {
  Button,
  Form,
  Input,
  Select,
  DatePicker,
  Space,
  Tag,
  Tooltip,
  Popconfirm,
} from 'antd';
import {
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { CombinedTask, InspectionType, InspectionStatus, Property } from '../types/api';

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

interface TaskRowProps {
  record: CombinedTask;
  editingKey: string | null;
  properties: Property[];
  onStartEdit: (record: CombinedTask) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onComplete: (record: CombinedTask) => void;
  onDeleteInspection: (id: number) => void;
  onDeleteSundry: (id: number) => void;
}

const TaskRow: React.FC<TaskRowProps> = memo(({
  record,
  editingKey,
  properties,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onComplete,
  onDeleteInspection,
  onDeleteSundry,
}) => {
  const rowKey = `${record.taskType}-${record.id}`;
  const isEditing = editingKey === rowKey;

  const getPlannedDate = (task: CombinedTask) => {
    if (task.taskType === 'inspection') return task.scheduledAt;
    return task.executionDate;
  };

  const formattedDate = (dateStr?: string) => {
    if (!dateStr) return '待定';
    return dayjs(dateStr).format('MM-DD ddd HH:mm');
  };

  const plannedDate = getPlannedDate(record);
  const statusConfig = record.status ? statusLabels[record.status] : null;
  const typeConfig = record.type ? typeLabels[record.type] : null;

  const rowStyle: React.CSSProperties = {
    padding: '6px 10px',
    borderBottom: '1px solid #f0f0f0',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    backgroundColor: isEditing ? '#f5f7fa' : 'transparent',
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

  const handleClick = useCallback(() => {
    if (!isEditing) onStartEdit(record);
  }, [isEditing, onStartEdit, record]);

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditing) {
      e.currentTarget.style.backgroundColor = '#fafafa';
    }
  }, [isEditing]);

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditing) {
      e.currentTarget.style.backgroundColor = 'transparent';
    }
  }, [isEditing]);

  return (
    <div
      style={rowStyle}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
              <Button size="small" type="primary" icon={<SaveOutlined />} onClick={onSaveEdit}>
                保存
              </Button>
              <Button size="small" icon={<CloseOutlined />} onClick={onCancelEdit}>
                取消
              </Button>
            </>
          ) : (
            <>
              <Button size="small" icon={<EditOutlined />} onClick={() => onStartEdit(record)}>
                编辑
              </Button>
              {record.taskType === 'inspection' && record.status !== 'Completed' && (
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => onComplete(record)}
                >
                  完成
                </Button>
              )}
              {record.taskType === 'sundry' && (
                <Popconfirm
                  title="确定删除这条杂活记录吗?"
                  onConfirm={() => onDeleteSundry(record.id)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
              )}
              {record.taskType === 'inspection' && (
                <Popconfirm
                  title="确定删除这条任务吗?"
                  onConfirm={() => onDeleteInspection(record.id)}
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
});

TaskRow.displayName = 'TaskRow';

export default TaskRow;