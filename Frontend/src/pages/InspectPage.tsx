import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { Button, Card, Modal, Space, Tag, Typography, Spin, Empty, Input, message, Form, DatePicker, InputNumber } from 'antd';
import { CheckCircleOutlined, CopyOutlined, RobotOutlined, SwapOutlined } from '@ant-design/icons';
import api from '../api';
import dayjs from 'dayjs';
import { useTasks } from '../hooks/useTasks';
import { useInspectionTypes } from '../hooks/useInspectionTypes';
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
  onComplete: (id: number, data: TaskCompletionRequest) => Promise<unknown>;
}

const DEBOUNCE_MS = 800;
const SAVED_CLEAR_MS = 3000;

const InspectCard: React.FC<InspectCardProps> = ({ task, isOverdue, typeName, onComplete }) => {
  const [completeForm] = Form.useForm();
  const [notes, setNotes] = useState<string>(task.notes ?? '');
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiInspectionPolishResponse | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeLoading, setCompleteLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestNotesRef = useRef<string>(task.notes ?? '');
  const lastSavedRef = useRef<string>(task.notes ?? '');
  const saveSeqRef = useRef<number>(0);

  const save = useCallback(async (value: string) => {
    if (value === lastSavedRef.current) {
      return;
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
    try {
      // Direct PUT (not useTasks.updateInspectionTask) to avoid its success toast + full refetch on every keystroke.
      await api.put(`${API_ENDPOINTS.inspectionTasks}/${task.id}`, payload);
      if (mySeq !== saveSeqRef.current) return;
      lastSavedRef.current = value;
      setStatus('saved');
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setStatus('idle'), SAVED_CLEAR_MS);
    } catch (err) {
      if (mySeq !== saveSeqRef.current) return;
      console.warn('[InspectPage] save failed', err);
      setStatus('error');
    }
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

  const replaceWithGeneral = () => {
    if (!aiResult?.englishGeneralText) return;
    setNotes(aiResult.englishGeneralText);
    latestNotesRef.current = aiResult.englishGeneralText;
    scheduleSave(aiResult.englishGeneralText);
    message.success('已填入 English General');
  };

  const dateLabel = task.scheduledAt ? dayjs(task.scheduledAt).format('MM-DD') : '';

  const aiTextBlock = (label: string, text: string) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <Text strong style={{ fontSize: 13 }}>{label}</Text>
        <Button size="small" icon={<CopyOutlined />} onClick={() => copy(label, text)}>
          复制
        </Button>
      </div>
      <div style={{ whiteSpace: 'pre-wrap', background: '#F7F7F5', border: '1px solid #E9E9E7', borderRadius: 4, padding: 10, fontSize: 13 }}>
        {text || <Text type="secondary">（无内容）</Text>}
      </div>
    </div>
  );

  return (
    <Card size="small" style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Tag color={isOverdue ? 'error' : undefined} style={{ margin: 0 }}>
          {dateLabel}
        </Tag>
        {isOverdue && <Text type="secondary" style={{ fontSize: 12 }}>Overdue</Text>}
      </div>
      <Text
        strong
        style={{ fontSize: 16, display: 'block', marginBottom: 8, cursor: 'pointer' }}
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
      <Input.TextArea
        value={notes}
        onChange={handleChange}
        autoSize={{ minRows: 4, maxRows: 10 }}
        placeholder="记录检查情况…"
      />
      <div style={{ marginTop: 6, minHeight: 18, fontSize: 12, textAlign: 'right' }}>
        {status === 'saving' && <Text type="secondary">保存中…</Text>}
        {status === 'saved' && <Text type="success">已保存 ✓</Text>}
        {status === 'error' && (
          <>
            <Text type="danger">保存失败 </Text>
            <Typography.Link onClick={handleRetry}>重试</Typography.Link>
          </>
        )}
      </div>
      <Space size={8}>
        <Button
          size="small"
          icon={<RobotOutlined />}
          loading={aiLoading}
          onClick={handleAiPolish}
        >
          AI 润色
        </Button>
        <Button
          size="small"
          type="primary"
          icon={<CheckCircleOutlined />}
          onClick={openComplete}
        >
          Done
        </Button>
        {aiResult?.summary && <Text type="secondary" style={{ fontSize: 12 }}>{aiResult.summary}</Text>}
      </Space>
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
        onCancel={() => setAiResult(null)}
        width={760}
        footer={
          <Space>
            <Button onClick={() => setAiResult(null)}>关闭</Button>
            <Button type="primary" icon={<SwapOutlined />} onClick={replaceWithGeneral}>
              填入 English General
            </Button>
          </Space>
        }
      >
        {aiResult && (
          <>
            {aiTextBlock('English General（正式记录）', aiResult.englishGeneralText)}
            {aiTextBlock('English Tenant（发给房客）', aiResult.englishTenantText)}
            {aiTextBlock('English Landlord（发给房东）', aiResult.englishLandlordText)}
            <div style={{ marginTop: 4, paddingTop: 12, borderTop: '1px solid #E9E9E7' }}>
              <Text strong style={{ fontSize: 13 }}>中文参考（仅校对）</Text>
              <div style={{ whiteSpace: 'pre-wrap', background: '#FAFAF9', border: '1px dashed #D9D9D6', borderRadius: 4, padding: 10, fontSize: 13, marginTop: 6, color: '#55534E' }}>
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
      <Title level={4} style={{ marginTop: 0 }}>Inspect</Title>

      {loading && items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin />
        </div>
      ) : items.length === 0 ? (
        <Empty description="今天没有需要检查的任务" style={{ marginTop: 48 }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(({ task, isOverdue }) => (
            <InspectCard
              key={task.id}
              task={task}
              isOverdue={isOverdue}
              typeName={getType(task.type)?.name ?? `Type ${task.type ?? '?'}`}
              onComplete={completeInspectionTask}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default InspectPage;
