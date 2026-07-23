import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { Button, Card, Modal, Space, Tag, Typography, Spin, Empty, Input, message, Form, DatePicker, InputNumber } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, CopyOutlined, RobotOutlined, SwapOutlined } from '@ant-design/icons';
import type { TextAreaRef } from 'antd/es/input/TextArea';
import api from '../api';
import dayjs from 'dayjs';
import { useTasks } from '../hooks/useTasks';
import { useInspectionTypes } from '../hooks/useInspectionTypes';
import { useTemplates } from '../hooks/useTemplates';
import { API_ENDPOINTS } from '../config/api';
import type {
  AiInspectionPolishResponse,
  CombinedTask,
  InspectionType,
  InspectionTaskUpdateRequest,
  TaskCompletionRequest,
} from '../types/api';

const { Text, Title } = Typography;

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface InspectCardProps {
  task: CombinedTask;
  isOverdue: boolean;
  typeName: string;
  templateOptions: Array<{ id: number; name: string; text: string }>;
  templateLoading: boolean;
  templateError: unknown;
  onComplete: (id: number, data: TaskCompletionRequest) => Promise<unknown>;
}

const DEBOUNCE_MS = 800;
const SAVED_CLEAR_MS = 3000;

const InspectCard: React.FC<InspectCardProps> = ({
  task,
  isOverdue,
  typeName,
  templateOptions,
  templateLoading,
  templateError,
  onComplete,
}) => {
  const [completeForm] = Form.useForm();
  const [notes, setNotes] = useState<string>(task.notes ?? '');
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiInspectionPolishResponse | null>(null);
  const [insertLoading, setInsertLoading] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeLoading, setCompleteLoading] = useState(false);
  const notesInputRef = useRef<TextAreaRef>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestNotesRef = useRef<string>(task.notes ?? '');
  const lastSavedRef = useRef<string>(task.notes ?? '');
  const saveSeqRef = useRef<number>(0);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  const save = useCallback(async (value: string): Promise<boolean> => {
    if (value === lastSavedRef.current) {
      return true;
    }
    const mySeq = ++saveSeqRef.current;
    setStatus('saving');
    const payload: InspectionTaskUpdateRequest = {
      propertyId: task.propertyId!,
      scheduledAt: task.scheduledAt,
      notes: value,
      type: (task.type ?? 0) as InspectionType,
      isBillable: task.isBillable ?? false,
    };
    const run = saveQueueRef.current.then(async () => {
      try {
        // Direct PUT (not useTasks.updateInspectionTask) to avoid its success toast + full refetch on every keystroke.
        await api.put(`${API_ENDPOINTS.inspectionTasks}/${task.id}`, payload);
        if (mySeq !== saveSeqRef.current) return false;
        lastSavedRef.current = value;
        setStatus('saved');
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => setStatus('idle'), SAVED_CLEAR_MS);
        return true;
      } catch (err) {
        if (mySeq !== saveSeqRef.current) return false;
        console.warn('[InspectPage] save failed', err);
        setStatus('error');
        return false;
      }
    });
    saveQueueRef.current = run.then(() => undefined, () => undefined);
    return run;
  }, [task.id, task.propertyId, task.scheduledAt, task.type, task.isBillable]);

  const scheduleSave = useCallback((value: string) => {
    latestNotesRef.current = value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      save(value);
    }, DEBOUNCE_MS);
  }, [save]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        if (latestNotesRef.current !== lastSavedRef.current) {
          save(latestNotesRef.current);
        }
      }
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, [save]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setNotes(v);
    scheduleSave(v);
  };

  const handleRetry = () => {
    save(latestNotesRef.current);
  };

  const copy = async (label: string, text: string) => {
    if (!text.trim()) {
      message.warning('内容为空');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      message.success(`${label} 已复制`);
    } catch {
      message.error('复制失败');
    }
  };

  const handleAiPolish = async () => {
    const rawNotes = notes.trim();
    if (rawNotes.length < 2) {
      message.warning('先输入一些检查备注');
      return;
    }
    setAiLoading(true);
    try {
      const res = await api.post<AiInspectionPolishResponse>(API_ENDPOINTS.aiInspectionPolish, {
        address: task.propertyAddress,
        inspectionType: typeName,
        notes: rawNotes,
        isBillable: task.isBillable ?? false,
      });
      setAiResult(res.data);
    } catch {
      message.error('AI 润色失败，请检查后端 AI 配置');
    } finally {
      setAiLoading(false);
    }
  };

  const copyTemplate = (name: string, text: string) => {
    if (templateLoading) {
      message.info('Template 加载中');
      return;
    }
    if (templateError) {
      message.error('Template 加载失败');
      return;
    }
    copy(`${name} Template`, text);
  };

  const copyNotes = () => {
    copy('备注', notes);
  };

  const openComplete = () => {
    completeForm.setFieldsValue({
      executionDate: task.scheduledAt ? dayjs(task.scheduledAt) : dayjs(),
      parkingFee: undefined,
    });
    setCompleteOpen(true);
  };

  const handleComplete = async () => {
    const values = await completeForm.validateFields();
    setCompleteLoading(true);
    try {
      const result = await onComplete(task.id, {
        executionDate: values.executionDate.toISOString(),
        parkingFee: values.parkingFee ?? undefined,
      });
      if (result !== null) {
        setCompleteOpen(false);
        completeForm.resetFields();
      }
    } finally {
      setCompleteLoading(false);
    }
  };

  const insertGeneralIntoNotes = async () => {
    if (!aiResult?.englishGeneralText) return;
    const nextNotes = aiResult.englishGeneralText;
    setInsertLoading(true);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setNotes(nextNotes);
    latestNotesRef.current = nextNotes;
    setAiResult(null);
    try {
      const saved = await save(nextNotes);
      notesInputRef.current?.focus({ cursor: 'end' });
      if (saved) {
        message.success('已插入备注');
      } else {
        message.error('已插入备注，但自动保存失败，请点重试');
      }
    } finally {
      setInsertLoading(false);
    }
  };

  const dateLabel = task.scheduledAt ? dayjs(task.scheduledAt).format('MM-DD') : '';

  const aiTextBlock = (label: string, text: string) => (
    <div className="inspect-ai-block">
      <div className="inspect-ai-block-header">
        <Text strong style={{ fontSize: 13 }}>{label}</Text>
        <Button className="inspect-copy-button" size="small" icon={<CopyOutlined />} onClick={() => copy(label, text)}>
          复制
        </Button>
      </div>
      <div className="inspect-ai-text">
        {text || <Text type="secondary">（无内容）</Text>}
      </div>
    </div>
  );

  return (
    <Card size="small" className="inspect-card">
      <div className="inspect-card-topline">
        <div className="inspect-card-meta">
          <Tag color={isOverdue ? 'error' : undefined} className="inspect-date-tag" icon={<ClockCircleOutlined />}>
            {dateLabel || 'No date'}
          </Tag>
          <Tag className="inspect-type-tag">{typeName}</Tag>
          {task.isBillable && <Tag color="gold" className="inspect-type-tag">Billable</Tag>}
        </div>
        {isOverdue && <Text type="danger" className="inspect-overdue-text">Overdue</Text>}
      </div>
      <Text
        strong
        className="inspect-address"
        onClick={async () => {
          const addr = task.propertyAddress;
          if (!addr) return;
          try {
            await navigator.clipboard.writeText(addr);
            message.success('地址已复制');
          } catch {
            message.error('复制失败');
          }
        }}
      >
        {task.propertyAddress ?? '(no address)'}
      </Text>
      <div className="inspect-notes-shell">
        <Input.TextArea
          ref={notesInputRef}
          className="inspect-notes-input"
          value={notes}
          onChange={handleChange}
          autoSize={{ minRows: 4, maxRows: 12 }}
          placeholder="记录检查情况…"
        />
      </div>
      <div className="inspect-save-status">
        {status === 'saving' && <Text type="secondary">保存中…</Text>}
        {status === 'saved' && <Text type="success">已保存 ✓</Text>}
        {status === 'error' && (
          <>
            <Text type="danger">保存失败 </Text>
            <Typography.Link onClick={handleRetry}>重试</Typography.Link>
          </>
        )}
      </div>
      <div className="inspect-actions">
        <div className="inspect-template-strip" aria-label="Inspection templates">
          {templateOptions.map(template => (
            <Button
              key={template.id}
              className="inspect-template-button"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => copyTemplate(template.name, template.text)}
            >
              {template.name}
            </Button>
          ))}
        </div>
        <Space className="inspect-primary-actions" size={8}>
        <Button
          className="inspect-action-button inspect-copy-notes-button"
          size="middle"
          icon={<CopyOutlined />}
          onClick={copyNotes}
        >
          复制备注
        </Button>
        <Button
          className="inspect-action-button"
          size="middle"
          icon={<RobotOutlined />}
          loading={aiLoading}
          onClick={handleAiPolish}
        >
          AI 润色
        </Button>
        <Button
          className="inspect-action-button"
          size="middle"
          type="primary"
          icon={<CheckCircleOutlined />}
          onClick={openComplete}
        >
          Done
        </Button>
        </Space>
      </div>
      {aiResult?.summary && <Text type="secondary" className="inspect-ai-summary">{aiResult.summary}</Text>}
      <Modal
        open={completeOpen}
        title="Complete Task"
        onCancel={() => setCompleteOpen(false)}
        onOk={handleComplete}
        confirmLoading={completeLoading}
        okText="Confirm"
        cancelText="Cancel"
        destroyOnHidden
      >
        <Form form={completeForm} layout="vertical">
          <Form.Item name="executionDate" label="Execution Date" rules={[{ required: true, message: 'Please select a date' }]}>
            <DatePicker
              showTime
              format={['YYYY-MM-DD HH:mm', 'MM/DD HH:mm', 'MM/DD ha', 'MM/DD h:mma', 'M/D ha', 'M/D HH:mm']}
              style={{ width: '100%' }}
              placeholder="03/02 10am"
            />
          </Form.Item>
          <Form.Item name="parkingFee" label="Parking Fee (optional)">
            <InputNumber min={0} precision={2} prefix="$" placeholder="0.00" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        open={aiResult !== null}
        title="AI 正式话术"
        className="inspect-ai-modal"
        onCancel={() => setAiResult(null)}
        width={760}
        footer={
          <Space className="inspect-ai-footer">
            <Button onClick={() => setAiResult(null)}>关闭</Button>
            <Button
              type="primary"
              icon={<SwapOutlined />}
              loading={insertLoading}
              onClick={insertGeneralIntoNotes}
            >
              插入到备注
            </Button>
          </Space>
        }
      >
        {aiResult && (
          <>
            {aiTextBlock('English General（正式记录）', aiResult.englishGeneralText)}
            {aiTextBlock('English Tenant（发给房客）', aiResult.englishTenantText)}
            {aiTextBlock('English Landlord（发给房东）', aiResult.englishLandlordText)}
            <div className="inspect-ai-reference">
              <Text strong style={{ fontSize: 13 }}>中文参考（仅校对）</Text>
              <div className="inspect-ai-reference-text">
                {aiResult.chineseReferenceText || <Text type="secondary">（无内容）</Text>}
              </div>
            </div>
          </>
        )}
      </Modal>
    </Card>
  );
};

const InspectPage: React.FC = () => {
  const { overdueTasks, todayTasks, loading, completeInspectionTask } = useTasks();
  const { getType } = useInspectionTypes();
  const { data: templates, loading: templatesLoading, error: templatesError } = useTemplates();
  const templateOptions = useMemo(() => {
    if (!templates) return [];
    return templates.inspectionTypes.map(type => ({
      id: type.id,
      name: type.name,
      text: templates.generalTemplates.find(
        template => template.inspectionTypeId === type.id,
      )?.text ?? '',
    }));
  }, [templates]);

  const items = useMemo(() => {
    const overdue = overdueTasks.map(t => ({ task: t, isOverdue: true }));
    const today = todayTasks.map(t => ({ task: t, isOverdue: false }));
    return [...overdue, ...today].sort((a, b) => {
      const da = a.task.scheduledAt ? dayjs(a.task.scheduledAt).valueOf() : 0;
      const db = b.task.scheduledAt ? dayjs(b.task.scheduledAt).valueOf() : 0;
      return da - db;
    });
  }, [overdueTasks, todayTasks]);

  return (
    <div className="inspect-page">
      <div className="inspect-page-header">
        <div>
          <Title level={4} className="inspect-page-title">Inspect</Title>
          <Text type="secondary" className="inspect-page-subtitle">
            {items.length > 0 ? `${items.length} due today or overdue` : 'Field notes workspace'}
          </Text>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin />
        </div>
      ) : items.length === 0 ? (
        <Empty description="今天没有需要检查的任务" style={{ marginTop: 48 }} />
      ) : (
        <div className="inspect-list">
          {items.map(({ task, isOverdue }) => {
            const typeName = getType(task.type)?.name ?? `Type ${task.type ?? '?'}`;

            return (
              <InspectCard
                key={task.id}
                task={task}
                isOverdue={isOverdue}
                typeName={typeName}
                templateOptions={templateOptions}
                templateLoading={templatesLoading}
                templateError={templatesError}
                onComplete={completeInspectionTask}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InspectPage;
