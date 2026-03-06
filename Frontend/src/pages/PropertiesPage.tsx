import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Popconfirm, Spin, Empty, Typography, Space } from 'antd';
import { PlusOutlined, DeleteOutlined, ReloadOutlined, EditOutlined } from '@ant-design/icons';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
import { handleApiError } from '../utils/errorHandler';
import type { Property } from '../types/api';

const { Title } = Typography;

const PropertiesPage: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [form] = Form.useForm();

  // 1. 获取数据
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

  // 打开编辑弹窗
  const openEditModal = (property: Property) => {
    setEditingProperty(property);
    form.setFieldsValue({
      ...property,
      billingPolicy: property.billingPolicy || 'ThreeMonthToggle', // 若没有计费策略，默认三个月交替
    });
    setIsModalOpen(true);
  };

  // 打开新增弹窗
  const openAddModal = () => {
    form.resetFields();
    form.setFieldsValue({
      address: '',
      billingPolicy: 'ThreeMonthToggle',
    });
    setIsModalOpen(true);
  };

  // 关闭弹窗
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProperty(null);
    form.resetFields();
  };

  // 2. 提交添加/编辑
  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (editingProperty) {
        // 编辑模式
        await axios.put(`${API_ENDPOINTS.properties}/${editingProperty.id}`, {
          ...values,
          id: editingProperty.id,
        });
        message.success('修改成功');
      } else {
        // 新增模式
        await axios.post(API_ENDPOINTS.properties, values);
        message.success('添加成功');
      }

      closeModal();
      fetchProperties(); // 刷新列表
    } catch (error) {
      if (axios.isAxiosError(error)) {
        handleApiError(error, editingProperty ? '修改失败' : '添加失败');
      }
      // 表单验证错误不需要额外提示
    } finally {
      setSubmitting(false);
    }
  };

  // 3. 删除
  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API_ENDPOINTS.properties}/${id}`);
      message.success('删除成功');
      // 本地更新状态，避免重新请求整个列表
      setProperties(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      handleApiError(error, '删除失败');
    }
  };

  // 表格列定义
  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    {
      title: '物业地址',
      dataIndex: 'address',
      key: 'address',
      ellipsis: { showTitle: false },
      render: (text: string) => <span title={text}>{text}</span>,
    },
    {
      title: '计费策略',
      dataIndex: 'billingPolicy',
      key: 'billingPolicy',
      width: 140,
      render: (policy: Property['billingPolicy']) => {
        if (policy === 'SixMonthFree') return '六个月不收费';
        if (policy === 'ThreeMonthToggle') return '三个月交替收费';
        return '未设置';
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_: unknown, record: Property) => (
        <Space size="small">
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => openEditModal(record)}
            title="编辑"
          />
          <Popconfirm
            title="确定删除吗?"
            description="删除后无法恢复"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              size="small"
              title="删除"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>🏡 物业档案列表</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchProperties} loading={loading}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
            添加新物业
          </Button>
        </Space>
      </div>

      <Spin spinning={loading}>
        <Table
          dataSource={properties}
          columns={columns}
          rowKey="id"
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          locale={{
            emptyText: <Empty description="暂无数据" />,
          }}
        />
      </Spin>

      {/* 添加/编辑弹窗 */}
      <Modal
        title={editingProperty ? '编辑物业信息' : '录入新物业'}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={closeModal}
        confirmLoading={submitting}
        okText={editingProperty ? '保存' : '添加'}
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="address"
            label="物业地址"
            rules={[
              { required: true, message: '地址必填' },
              { min: 5, message: '地址至少5个字符' },
              { max: 200, message: '地址不能超过200个字符' },
            ]}
          >
            <Input placeholder="请输入物业地址..." showCount maxLength={200} />
          </Form.Item>

          <Form.Item
            name="billingPolicy"
            label="计费策略"
            rules={[{ required: true, message: '请选择计费策略' }]}
          >
            <Select
              options={[
                { value: 'SixMonthFree', label: '六个月不收费' },
                { value: 'ThreeMonthToggle', label: '三个月交替收费' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PropertiesPage;