import React from 'react';
import type { FormInstance } from 'antd';
import { Alert, Button, DatePicker, Form, Input, message, Modal, Select, Space, Spin, Tag } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type {
  AiTaskDraftPropertyCandidate,
  InspectionRecordDto,
  Property,
  TaskTypeConfig,
} from '../../types/api';
import { modalStyles } from '../../components/modalStyles';
import { isSixMonthFreePolicy } from '../../utils/billingPolicy';
import { disabledMinutes, tagStyle } from './taskUi';

const { TextArea } = Input;

const routineInspectionEmailBody = `Kia Ora,

My name is Jabin, and I will be conducting the routine inspection of your property on behalf of ST International LTD.

To arrange a suitable time for the inspection, which should take no longer than 15 minutes, could you please let me know what days and times work best for you in the coming days?

Nga mihi,
Jabin
ST International LTD`;

const getRoutineInspectionEmailSubject = (address?: string): string =>
  address ? `Routine Inspection - ${address}` : 'Routine Inspection';

const ModalTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontSize: '15px', fontWeight: 600, color: '#37352F' }}>
    {children}
  </span>
);

interface SelectOption {
  value: number;
  label: string;
}

interface AddTaskModalProps {
  open: boolean;
  submitting: boolean;
  form: FormInstance;
  propertyOptions: SelectOption[];
  typeOptions: SelectOption[];
  selectedProperty?: Property;
  selectedPropertyId: number | null;
  recentRecords: InspectionRecordDto[];
  recordsLoading: boolean;
  isAiDraftApplied: boolean;
  aiDraftCandidates: AiTaskDraftPropertyCandidate[];
  aiDraftAddressQuery: string;
  getType: (id: number) => TaskTypeConfig | undefined;
  onOk: () => void;
  onCancel: () => void;
  onPropertyChange: (propertyId?: number) => void;
  onDraftCandidateSelect: (propertyId: number) => void;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  open,
  submitting,
  form,
  propertyOptions,
  typeOptions,
  selectedProperty,
  selectedPropertyId,
  recentRecords,
  recordsLoading,
  isAiDraftApplied,
  aiDraftCandidates,
  aiDraftAddressQuery,
  getType,
  onOk,
  onCancel,
  onPropertyChange,
  onDraftCandidateSelect,
}) => {
  const copyRoutineEmailSubject = () => {
    navigator.clipboard.writeText(getRoutineInspectionEmailSubject(selectedProperty?.address));
    message.success('Subject copied');
  };

  const copyRoutineEmailBody = () => {
    navigator.clipboard.writeText(routineInspectionEmailBody);
    message.success('Body copied');
  };

  return (
    <Modal
      title={<ModalTitle>Add Task</ModalTitle>}
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      confirmLoading={submitting}
      okText="Add"
      cancelText="Cancel"
      destroyOnHidden
      width={600}
      styles={modalStyles}
    >
      <Form
        form={form}
        layout="vertical"
        onValuesChange={(changed) => {
          if ('propertyId' in changed) {
            onPropertyChange(changed.propertyId as number | undefined);
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
                        onClick={() => onDraftCandidateSelect(candidate.propertyId)}
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
          <Select
            placeholder="Select a property"
            showSearch
            optionFilterProp="label"
            filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            options={propertyOptions}
          />
        </Form.Item>

        {selectedPropertyId && (() => {
          const isSixMonth = isSixMonthFreePolicy(selectedProperty?.billingPolicy);
          return (
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#F7F7F5', border: '1px solid #E9E9E7', borderLeft: `3px solid ${isSixMonth ? '#0F7B6C' : '#CB912F'}`, borderRadius: 4 }}>
              <span style={{ fontSize: '13px', color: isSixMonth ? '#0F7B6C' : '#CB912F', fontWeight: 500 }}>
                {isSixMonth ? '6-Month Cycle' : '3-Month Cycle'}
              </span>
              <span style={{ fontSize: '13px', color: '#787774' }}>
                {isSixMonth
                  ? '- inspection every 6 months, always free'
                  : '- inspection every 3 months, alternates Charged / Free'}
              </span>
            </div>
          );
        })()}

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
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
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
            showTime={{ format: 'HH:mm', hideDisabledOptions: true, disabledMinutes: () => disabledMinutes }}
            format={['YYYY-MM-DD HH:mm', 'MM/DD HH:mm', 'MM/DD ha', 'MM/DD h:mma', 'M/D ha', 'M/D HH:mm']}
            style={{ width: '100%' }}
            placeholder="03/02 10am  or  03/02 10:30am"
          />
        </Form.Item>

        <Form.Item name="notes" label="Notes">
          <TextArea rows={3} placeholder="Enter notes..." showCount maxLength={500} />
        </Form.Item>
      </Form>
    </Modal>
  );
};
