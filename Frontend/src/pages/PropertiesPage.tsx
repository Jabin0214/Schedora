import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Table, Button, Modal, Form, Input, Select,
  message, Popconfirm, Spin, Empty, Space, Tag,
} from 'antd';
import { PlusOutlined, DeleteOutlined, ReloadOutlined, EditOutlined, SearchOutlined, CloseCircleOutlined } from '@ant-design/icons';
import api, { isAxiosError } from '../api';
import { API_ENDPOINTS } from '../config/api';
import { handleApiError } from '../utils/errorHandler';
import { normalizeBillingPolicy } from '../utils/billingPolicy';
import type { Property } from '../types/api';
import { IndTitle, modalStyles } from '../components/shared';

// ── Billing policy tag styles ──────────────────────────────────
const policyTagStyle: React.CSSProperties = { fontSize: '12px', letterSpacing: '0.2px' };

const PropertiesPage: React.FC = () => {
  const [properties,      setProperties]      = useState<Property[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [submitting,      setSubmitting]      = useState(false);
  const [isModalOpen,     setIsModalOpen]     = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [searchText,      setSearchText]      = useState('');
  const [form] = Form.useForm();

  const filteredProperties = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return properties;
    return properties.filter(p => p.address.toLowerCase().includes(q));
  }, [properties, searchText]);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<Property[]>(API_ENDPOINTS.properties);
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
    form.setFieldsValue({
      ...property,
      billingPolicy: normalizeBillingPolicy(property.billingPolicy),
    });
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
        await api.put(`${API_ENDPOINTS.properties}/${editingProperty.id}`, { ...values, id: editingProperty.id });
        message.success('Property updated');
      } else {
        await api.post(API_ENDPOINTS.properties, values);
        message.success('Property added');
      }
      closeModal();
      fetchProperties();
    } catch (error) {
      if (isAxiosError(error)) handleApiError(error, editingProperty ? 'Update failed' : 'Add failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`${API_ENDPOINTS.properties}/${id}`);
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
        <span style={{ color: '#787774', fontSize: '13px' }}>#{id}</span>
      ),
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      ellipsis: { showTitle: false },
      render: (text: string) => (
        <span title={text} style={{ color: '#37352F', fontWeight: 600, fontSize: '14px' }}>{text}</span>
      ),
    },
    {
      title: 'Billing Policy',
      dataIndex: 'billingPolicy',
      key: 'billingPolicy',
      width: 180,
      render: (policy: unknown) => {
        if (normalizeBillingPolicy(policy as Property['billingPolicy']) === 'SixMonthFree')
          return <Tag style={{ ...policyTagStyle, background: 'rgba(15,123,108,0.08)', border: '1px solid rgba(15,123,108,0.3)', color: '#0F7B6C' }}>6-Month Free</Tag>;
        return <Tag style={{ ...policyTagStyle, background: 'rgba(203,145,47,0.08)', border: '1px solid rgba(203,145,47,0.3)', color: '#CB912F' }}>3-Month Toggle</Tag>;
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
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #E9E9E7', flexWrap: 'wrap', gap: 8 }}>
        <IndTitle>Properties</IndTitle>
        <Space size={4}>
          <Button icon={<ReloadOutlined />} size="small" onClick={fetchProperties} loading={loading}>Refresh</Button>
          <Button type="primary" icon={<PlusOutlined />} size="small" onClick={openAddModal}>Add Property</Button>
        </Space>
      </div>

      {/* ── Search bar ── */}
      <div style={{ marginBottom: 12 }}>
        <Input
          prefix={<SearchOutlined style={{ color: '#ACABA9', fontSize: 14 }} />}
          suffix={
            searchText
              ? <CloseCircleOutlined
                  style={{ color: '#ACABA9', fontSize: 13, cursor: 'pointer' }}
                  onClick={() => setSearchText('')}
                />
              : null
          }
          placeholder="Search by address..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{ maxWidth: 320 }}
          allowClear={false}
        />
        {searchText && (
          <span style={{ marginLeft: 10, fontSize: '13px', color: '#787774' }}>
            {filteredProperties.length} of {properties.length} properties
          </span>
        )}
      </div>

      <Spin spinning={loading}>
        <Table
          dataSource={filteredProperties}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => <span style={{ color: '#787774', fontSize: '13px' }}>{total} records</span>,
          }}
          locale={{
            emptyText: <Empty description={<span style={{ color: '#ACABA9', fontSize: '13px' }}>No properties</span>} />,
          }}
        />
      </Spin>

      {/* ── Add / Edit modal ── */}
      <Modal
        title={<span style={{ fontSize: '15px', fontWeight: 600, color: '#37352F' }}>{editingProperty ? 'Edit Property' : 'New Property'}</span>}
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
