import React, { useEffect, useState, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, Select,
  message, Popconfirm, Spin, Empty, Space, Tag,
} from 'antd';
import { PlusOutlined, DeleteOutlined, ReloadOutlined, EditOutlined } from '@ant-design/icons';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
import { handleApiError } from '../utils/errorHandler';
import type { Property } from '../types/api';
import { IndTitle, modalStyles } from '../components/shared';

// ── Billing policy tag styles (custom bg/border, keep borderRadius explicit) ──
const policyTagStyle: React.CSSProperties = { fontSize: '11px', letterSpacing: '0.3px' };

const PropertiesPage: React.FC = () => {
  const [properties,      setProperties]      = useState<Property[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [submitting,      setSubmitting]      = useState(false);
  const [isModalOpen,     setIsModalOpen]     = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [form] = Form.useForm();

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get<Property[]>(API_ENDPOINTS.properties);
      setProperties(res.data);
    } catch (error) {
      handleApiError(error, 'Failed to fetch properties');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const openEditModal = (property: Property) => {
    setEditingProperty(property);
    form.setFieldsValue({ ...property, billingPolicy: property.billingPolicy || 'ThreeMonthToggle' });
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    form.resetFields();
    form.setFieldsValue({ address: '', billingPolicy: 'ThreeMonthToggle' });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProperty(null);
    form.resetFields();
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editingProperty) {
        await axios.put(`${API_ENDPOINTS.properties}/${editingProperty.id}`, { ...values, id: editingProperty.id });
        message.success('Property updated');
      } else {
        await axios.post(API_ENDPOINTS.properties, values);
        message.success('Property added');
      }
      closeModal();
      fetchProperties();
    } catch (error) {
      if (axios.isAxiosError(error)) handleApiError(error, editingProperty ? 'Update failed' : 'Add failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API_ENDPOINTS.properties}/${id}`);
      message.success('Property deleted');
      setProperties(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      handleApiError(error, 'Delete failed');
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 70,
      render: (id: number) => (
        <span style={{ color: '#484f58', fontFamily: 'monospace', fontSize: '12px' }}>#{id}</span>
      ),
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      ellipsis: { showTitle: false },
      render: (text: string) => (
        <span title={text} style={{ color: '#e6edf3', fontWeight: 500 }}>{text}</span>
      ),
    },
    {
      title: 'Billing Policy',
      dataIndex: 'billingPolicy',
      key: 'billingPolicy',
      width: 180,
      render: (policy: unknown) => {
        if (policy === 0 || policy === 'SixMonthFree')
          return <Tag style={{ ...policyTagStyle, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.4)', color: '#22c55e' }}>6-Month Free</Tag>;
        if (policy === 1 || policy === 'ThreeMonthToggle')
          return <Tag style={{ ...policyTagStyle, background: 'rgba(240,165,0,0.08)', border: '1px solid rgba(240,165,0,0.4)', color: '#f0a500' }}>3-Month Toggle</Tag>;
        return <Tag style={{ ...policyTagStyle, background: 'rgba(139,148,158,0.08)', border: '1px solid rgba(139,148,158,0.3)', color: '#8b949e' }}>{String(policy ?? 'Not set')}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: unknown, record: Property) => (
        <Space size={4}>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEditModal(record)} title="Edit" />
          <Popconfirm title="Delete this property?" description="This cannot be undone." onConfirm={() => handleDelete(record.id)} okText="Delete" cancelText="Cancel">
            <Button danger icon={<DeleteOutlined />} size="small" title="Delete" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* ── Toolbar ── */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #30363d', flexWrap: 'wrap', gap: 8 }}>
        <IndTitle>Properties</IndTitle>
        <Space size={4}>
          <Button icon={<ReloadOutlined />} size="small" onClick={fetchProperties} loading={loading}>Refresh</Button>
          <Button type="primary" icon={<PlusOutlined />} size="small" onClick={openAddModal}>Add Property</Button>
        </Space>
      </div>

      <Spin spinning={loading}>
        <Table
          dataSource={properties}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => <span style={{ color: '#8b949e', fontSize: '12px' }}>{total} records</span>,
          }}
          locale={{
            emptyText: <Empty description={<span style={{ color: '#484f58', fontSize: '11px', letterSpacing: '2px' }}>— No properties —</span>} />,
          }}
        />
      </Spin>

      {/* ── Add / Edit modal ── */}
      <Modal
        title={<span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#e6edf3' }}>{editingProperty ? 'Edit Property' : 'New Property'}</span>}
        open={isModalOpen} onOk={handleOk} onCancel={closeModal}
        confirmLoading={submitting} okText={editingProperty ? 'Save' : 'Add'} cancelText="Cancel"
        destroyOnHidden styles={modalStyles}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="address" label="Address" rules={[{ required: true, message: 'Address is required' }, { min: 5, message: 'At least 5 characters' }, { max: 200, message: 'Max 200 characters' }]}>
            <Input placeholder="Enter property address..." showCount maxLength={200} />
          </Form.Item>
          <Form.Item name="billingPolicy" label="Billing Policy" rules={[{ required: true, message: 'Select a billing policy' }]}>
            <Select options={[{ value: 'SixMonthFree', label: '6-Month Free' }, { value: 'ThreeMonthToggle', label: '3-Month Toggle' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PropertiesPage;
