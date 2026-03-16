import React, { useState } from 'react';
import {
  Button, Modal, Form, Input, Select, Space, Tag,
  Popconfirm, Spin, message,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
import { useInspectionTypes } from '../hooks/useInspectionTypes';
import type { TaskTypeConfig } from '../types/api';
import { IndTitle, modalStyles } from '../components/shared';

const COLOR_OPTIONS = [
  'cyan', 'blue', 'geekblue', 'purple', 'magenta',
  'gold', 'orange', 'volcano', 'red',
  'green', 'lime', 'default',
];

const ModalTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#e6edf3' }}>
    {children}
  </span>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#484f58', marginBottom: 10 }}>
    {children}
  </div>
);

// ── Task Types section ────────────────────────────────────────
const TaskTypesSection: React.FC = () => {
  const { types, loading, refresh } = useInspectionTypes();
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<TaskTypeConfig | null>(null);
  const [form] = Form.useForm();

  const openAdd = () => {
    setEditingType(null);
    form.resetFields();
    form.setFieldsValue({ color: 'cyan' });
    setIsModalOpen(true);
  };

  const openEdit = (t: TaskTypeConfig) => {
    setEditingType(t);
    form.setFieldsValue({ name: t.name, color: t.color });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingType(null);
    form.resetFields();
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editingType) {
        await axios.put(`${API_ENDPOINTS.taskTypes}/${editingType.id}`, {
          name: values.name,
          color: values.color,
          displayOrder: editingType.displayOrder,
        });
        message.success('Type updated');
      } else {
        await axios.post(API_ENDPOINTS.taskTypes, {
          name: values.name,
          color: values.color,
        });
        message.success('Type created');
      }
      closeModal();
      refresh();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        message.error(err.response?.data?.message ?? (editingType ? 'Update failed' : 'Create failed'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (t: TaskTypeConfig) => {
    try {
      await axios.delete(`${API_ENDPOINTS.taskTypes}/${t.id}`);
      message.success('Type deleted');
      refresh();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        message.error(err.response?.data?.message ?? 'Delete failed');
      }
    }
  };

  const rowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '48px 1fr 140px 100px',
    alignItems: 'center',
    gap: 12,
    padding: '10px 16px',
    borderBottom: '1px solid #30363d',
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <SectionTitle>Task Types</SectionTitle>
        <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openAdd}>
          Add Type
        </Button>
      </div>

      <Spin spinning={loading}>
        <div style={{ border: '1px solid #30363d', borderTop: '2px solid #00d4ff', borderRadius: 2, background: '#0d1117' }}>
          <div style={{ ...rowStyle, fontSize: '10px', color: '#484f58', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            <div>ID</div>
            <div>Name</div>
            <div>Color</div>
            <div>Actions</div>
          </div>

          {types.length === 0 && !loading && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#484f58', fontSize: '11px', letterSpacing: '2px' }}>
              — No types —
            </div>
          )}

          {types.map(t => (
            <div
              key={t.id}
              style={rowStyle}
              onMouseEnter={e => (e.currentTarget.style.background = '#1c2128')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ color: '#484f58', fontFamily: 'monospace', fontSize: '12px' }}>{t.id}</span>
              <span style={{ fontWeight: 600, color: '#e6edf3', fontSize: '13px' }}>{t.name}</span>
              <div>
                <Tag color={t.color} style={{ fontSize: '11px' }}>{t.color}</Tag>
              </div>
              <Space size={4}>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(t)} />
                <Popconfirm
                  title={`Delete "${t.name}"?`}
                  description="Types in use by existing tasks cannot be deleted."
                  onConfirm={() => handleDelete(t)}
                  okText="Delete"
                  cancelText="Cancel"
                >
                  <Button danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            </div>
          ))}
        </div>
      </Spin>

      <Modal
        title={<ModalTitle>{editingType ? 'Edit Type' : 'New Type'}</ModalTitle>}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={closeModal}
        confirmLoading={submitting}
        okText={editingType ? 'Save' : 'Add'}
        cancelText="Cancel"
        destroyOnHidden
        width={400}
        styles={modalStyles}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name is required' }, { max: 50, message: 'Max 50 characters' }]}>
            <Input placeholder="e.g. Pre-sale Inspection" maxLength={50} showCount />
          </Form.Item>
          <Form.Item name="color" label="Color" rules={[{ required: true }]}>
            <Select>
              {COLOR_OPTIONS.map(c => (
                <Select.Option key={c} value={c}>
                  <Tag color={c} style={{ fontSize: '11px', marginRight: 6 }}>{c}</Tag>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

// ── Config page ───────────────────────────────────────────────
const ConfigPage: React.FC = () => (
  <div>
    <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #30363d' }}>
      <IndTitle>Config</IndTitle>
    </div>

    <section style={{ marginBottom: 32 }}>
      <TaskTypesSection />
    </section>

    {/* Future sections go here */}
  </div>
);

export default ConfigPage;
