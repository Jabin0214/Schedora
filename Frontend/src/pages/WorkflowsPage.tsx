import React, { useMemo, useCallback, useState } from 'react';
import {
  Button, Checkbox, DatePicker, Empty, Form, Input, Modal,
  Popconfirm, Progress, Select, Space, Spin, Tag, Tooltip,
} from 'antd';
import {
  PlusOutlined, ReloadOutlined, DeleteOutlined,
  CalendarOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Workflow } from '../types/api';
import { IndTitle } from '../components/shared';
import { modalStyles } from '../components/modalStyles';
import { useMoveInWorkflows } from '../hooks/useWorkflows';
import { useProperties } from '../hooks/useProperties';
import {
  WorkflowStage,
  getWorkflowProgress,
  sortMoveInWorkflowsForList,
} from './workflows/workflowKanban';

const stageLabel: Record<WorkflowStage, string> = {
  [WorkflowStage.DeclarationEmail]: '声明邮件',
  [WorkflowStage.WaitingDeclarationReply]: '等声明回复',
  [WorkflowStage.DraftPack]: '合同草稿包',
  [WorkflowStage.SignedAndTenancySetup]: '签回后建档',
  [WorkflowStage.MoveInAndWrapUp]: '入住与收尾',
  [WorkflowStage.Completed]: '已完成',
};

const formatAppointment = (value?: string | null) =>
  value ? dayjs(value).format('MMM D, HH:mm') : 'No move in time';

const WorkflowsPage: React.FC = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [savingWorkflowId, setSavingWorkflowId] = useState<number | null>(null);
  const [createForm] = Form.useForm();

  const {
    workflows,
    loading: workflowsLoading,
    fetchWorkflows,
    createWorkflow,
    updateWorkflow,
    updateChecklistItem,
    archiveWorkflow,
  } = useMoveInWorkflows();
  const { properties, loading: propertiesLoading } = useProperties();

  const loading = workflowsLoading || propertiesLoading;

  const propertyOptions = useMemo(
    () => properties.map(property => ({ value: property.address, label: property.address })),
    [properties]
  );

  const sortedWorkflows = useMemo(
    () => sortMoveInWorkflowsForList(workflows),
    [workflows]
  );

  const handleCreate = useCallback(async () => {
    const values = await createForm.validateFields();
    const created = await createWorkflow({
      address: values.address,
      moveInAppointmentAt: values.moveInAppointmentAt ? values.moveInAppointmentAt.toISOString() : undefined,
      notes: values.notes ?? '',
    });
    if (created) {
      createForm.resetFields();
      setIsCreateOpen(false);
    }
  }, [createForm, createWorkflow]);

  const updateWorkflowDetails = useCallback(async (
    workflow: Workflow,
    patch: { moveInAppointmentAt?: string | null; notes?: string }
  ) => {
    setSavingWorkflowId(workflow.id);
    try {
      const hasMoveInAppointmentAt = Object.prototype.hasOwnProperty.call(patch, 'moveInAppointmentAt');
      await updateWorkflow(workflow.id, {
        address: workflow.address,
        moveInAppointmentAt: hasMoveInAppointmentAt
          ? patch.moveInAppointmentAt ?? undefined
          : workflow.moveInAppointmentAt ?? undefined,
        notes: patch.notes ?? workflow.notes ?? '',
      });
    } finally {
      setSavingWorkflowId(null);
    }
  }, [updateWorkflow]);

  const renderWorkflow = (workflow: Workflow) => {
    const progress = getWorkflowProgress(workflow);
    const nextItem = workflow.items.find(item => !item.isCompleted);
    const toggleChecklistItem = (itemKey: string, isCompleted: boolean) => {
      updateChecklistItem(workflow.id, itemKey, isCompleted);
    };

    return (
      <section key={workflow.id} className="workflow-list-card">
        <div className="workflow-list-card-header">
          <div className="workflow-list-title-block">
            <div className="workflow-list-address">{workflow.address}</div>
            <div className="workflow-list-meta">
              <span><CalendarOutlined /> {formatAppointment(workflow.moveInAppointmentAt)}</span>
              <Tag style={{ margin: 0 }}>{stageLabel[workflow.stage as WorkflowStage]}</Tag>
            </div>
          </div>
          <Space size={6}>
            <Tooltip title="Archive workflow">
              <Popconfirm title="Archive this workflow?" onConfirm={() => archiveWorkflow(workflow.id)} okText="Archive" cancelText="Cancel">
                <Button danger size="small" icon={<DeleteOutlined />} aria-label="Archive workflow" />
              </Popconfirm>
            </Tooltip>
          </Space>
        </div>

        <div className="workflow-list-progress">
          <Progress percent={progress} />
          <div className="workflow-list-next">
            {nextItem ? `Next: ${nextItem.label}` : 'All checklist items done'}
          </div>
        </div>

        <div className="workflow-list-controls">
          <DatePicker
            showTime
            size="small"
            value={workflow.moveInAppointmentAt ? dayjs(workflow.moveInAppointmentAt) : null}
            placeholder="Move in time"
            onChange={value => updateWorkflowDetails(workflow, {
              moveInAppointmentAt: value ? value.toISOString() : null,
            })}
          />
          <Input
            size="small"
            defaultValue={workflow.notes ?? ''}
            placeholder="Notes"
            disabled={savingWorkflowId === workflow.id}
            onBlur={event => updateWorkflowDetails(workflow, { notes: event.target.value })}
          />
        </div>

        <div className="workflow-long-checklist">
          {workflow.items.map(item => (
            <div
              key={item.key}
              className="workflow-long-checklist-row"
              role="button"
              onClick={() => toggleChecklistItem(item.key, !item.isCompleted)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  toggleChecklistItem(item.key, !item.isCompleted);
                }
              }}
            >
              <Checkbox
                checked={item.isCompleted}
                onClick={event => event.stopPropagation()}
                onChange={event => toggleChecklistItem(item.key, event.target.checked)}
              />
              <span className={item.isCompleted ? 'workflow-checklist-label done' : 'workflow-checklist-label'}>
                {item.label}
              </span>
              {item.isCompleted && <CheckCircleOutlined className="workflow-checklist-done-icon" />}
            </div>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div>
      <div className="page-toolbar">
        <div>
          <IndTitle>Workflows</IndTitle>
          <div className="workflow-page-subtitle">Move in checklist · {workflows.length} active</div>
        </div>
        <Space className="page-toolbar-actions" size={4} wrap>
          <Button size="small" icon={<ReloadOutlined />} onClick={fetchWorkflows} loading={workflowsLoading}>
            Refresh
          </Button>
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateOpen(true)}>
            New Move In
          </Button>
        </Space>
      </div>

      <Spin spinning={loading}>
        {sortedWorkflows.length === 0 ? (
          <div className="workflow-empty">
            <Empty description="No move in workflows" />
          </div>
        ) : (
          <div className="workflow-list">
            {sortedWorkflows.map(renderWorkflow)}
          </div>
        )}
      </Spin>

      <Modal
        title="New Move In Workflow"
        open={isCreateOpen}
        onOk={handleCreate}
        onCancel={() => setIsCreateOpen(false)}
        okText="Create"
        cancelText="Cancel"
        destroyOnHidden
        width={460}
        styles={modalStyles}
      >
        <Form form={createForm} layout="vertical">
          <Form.Item name="address" label="Address" rules={[{ required: true, message: 'Select an address' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Search property, e.g. 1401A"
              options={propertyOptions}
              loading={propertiesLoading}
            />
          </Form.Item>
          <Form.Item name="moveInAppointmentAt" label="Move in appointment">
            <DatePicker showTime style={{ width: '100%' }} placeholder="Optional" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} placeholder="Optional" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default WorkflowsPage;
