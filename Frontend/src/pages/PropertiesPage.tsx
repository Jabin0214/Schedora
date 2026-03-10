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
      handleApiError(error, '获取数据失败');
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
        message.success('修改成功');
      } else {
        await axios.post(API_ENDPOINTS.properties, values);
        message.success('添加成功');
      }
      closeModal();
      fetchProperties();
    } catch (error) {
      if (axios.isAxiosError(error)) handleApiError(error, editingProperty ? '修改失败' : '添加失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API_ENDPOINTS.properties}/${id}`);
      message.success('删除成功');
      setProperties(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      handleApiError(error, '删除失败');
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
      title: '物业地址',
      dataIndex: 'address',
      key: 'address',
      ellipsis: { showTitle: false },
      render: (text: string) => (
        <span title={text} style={{ color: '#e6edf3', fontWeight: 500 }}>{text}</span>
      ),
    },
    {
      title: '计费策略',
      dataIndex: 'billingPolicy',
      key: 'billingPolicy',
      width: 160,
      render: (policy: unknown) => {
        // API returns 0 = 不收费(SixMonthFree), 1 = 收费(ThreeMonthToggle)
        if (policy === 0 || policy === 'SixMonthFree')
          return <Tag style={{ ...policyTagStyle, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.4)', color: '#22c55e' }}>六个月不收费</Tag>;
        if (policy === 1 || policy === 'ThreeMonthToggle')
          return <Tag style={{ ...policyTagStyle, background: 'rgba(240,165,0,0.08)', border: '1px solid rgba(240,165,0,0.4)', color: '#f0a500' }}>三个月交替收费</Tag>;
        return <Tag style={{ ...policyTagStyle, background: 'rgba(139,148,158,0.08)', border: '1px solid rgba(139,148,158,0.3)', color: '#8b949e' }}>{String(policy ?? '未设置')}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: unknown, record: Property) => (
        <Space size={4}>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEditModal(record)} title="编辑" />
          <Popconfirm title="确定删除吗?" description="删除后无法恢复" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
            <Button danger icon={<DeleteOutlined />} size="small" title="删除" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* ── Toolbar ── */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #30363d', flexWrap: 'wrap', gap: 8 }}>
        <IndTitle>物业档案</IndTitle>
        <Space size={4}>
          <Button icon={<ReloadOutlined />} size="small" onClick={fetchProperties} loading={loading}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} size="small" onClick={openAddModal}>添加物业</Button>
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
            showTotal: (total) => <span style={{ color: '#8b949e', fontSize: '12px' }}>共 {total} 条记录</span>,
          }}
          locale={{
            emptyText: <Empty description={<span style={{ color: '#484f58', fontSize: '11px', letterSpacing: '2px' }}>— 暂无数据 —</span>} />,
          }}
        />
      </Spin>

      {/* ── 添加/编辑弹窗 ── */}
      <Modal
        title={<span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#e6edf3' }}>{editingProperty ? '编辑物业信息' : '录入新物业'}</span>}
        open={isModalOpen} onOk={handleOk} onCancel={closeModal}
        confirmLoading={submitting} okText={editingProperty ? '保存' : '添加'} cancelText="取消"
        destroyOnHidden styles={modalStyles}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="address" label="物业地址" rules={[{ required: true, message: '地址必填' }, { min: 5, message: '地址至少5个字符' }, { max: 200, message: '地址不能超过200个字符' }]}>
            <Input placeholder="请输入物业地址..." showCount maxLength={200} />
          </Form.Item>
          <Form.Item name="billingPolicy" label="计费策略" rules={[{ required: true, message: '请选择计费策略' }]}>
            <Select options={[{ value: 'SixMonthFree', label: '六个月不收费' }, { value: 'ThreeMonthToggle', label: '三个月交替收费' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PropertiesPage;
