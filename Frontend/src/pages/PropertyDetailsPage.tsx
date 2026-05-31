import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Empty, Space, Spin, Table, Tag } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { Link, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../api';
import { API_ENDPOINTS } from '../config/api';
import { IndTitle } from '../components/shared';
import { handleApiError } from '../utils/errorHandler';
import { normalizeBillingPolicy } from '../utils/billingPolicy';
import type { CombinedTask, InspectionRecordDto, Property, TenantContact } from '../types/api';
import { useInspectionTypes } from '../hooks/useInspectionTypes';

const tagStyle: React.CSSProperties = { fontSize: 12, letterSpacing: 0 };

const DetailSection: React.FC<{ title: string; count?: number; children: React.ReactNode }> = ({ title, count, children }) => (
  <section className="property-section">
    <div className="property-section-title">
      <span>{title}</span>
      {count !== undefined && <Tag>{count}</Tag>}
    </div>
    {children}
  </section>
);

const PropertyDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const propertyId = Number(id);
  const { getType } = useInspectionTypes();
  const [property, setProperty] = useState<Property | null>(null);
  const [contacts, setContacts] = useState<TenantContact[]>([]);
  const [tasks, setTasks] = useState<CombinedTask[]>([]);
  const [records, setRecords] = useState<InspectionRecordDto[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPropertyInfo = useCallback(async () => {
    if (!Number.isFinite(propertyId)) return;
    setLoading(true);
    try {
      const [propertyRes, contactsRes, tasksRes, recordsRes] = await Promise.all([
        api.get<Property>(`${API_ENDPOINTS.properties}/${propertyId}`),
        api.get<TenantContact[]>(`${API_ENDPOINTS.tenantContacts}/property/${propertyId}`),
        api.get<CombinedTask[]>(API_ENDPOINTS.inspectionTasks),
        api.get<InspectionRecordDto[]>(API_ENDPOINTS.inspectionRecords, { params: { propertyId } }),
      ]);
      setProperty(propertyRes.data);
      setContacts(contactsRes.data);
      setTasks(tasksRes.data.filter(task => task.propertyId === propertyId));
      setRecords(recordsRes.data);
    } catch (error) {
      handleApiError(error, 'Failed to fetch property info');
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchPropertyInfo();
  }, [fetchPropertyInfo]);

  const billingPolicy = normalizeBillingPolicy(property?.billingPolicy);
  const latestRecord = useMemo(() => records[0], [records]);

  const contactColumns = [
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      width: 150,
      render: (text: string) => text || <span style={{ color: '#ACABA9' }}>-</span>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      ellipsis: { showTitle: false },
      render: (text: string) => (
        <span title={text} style={{ color: text ? '#37352F' : '#ACABA9' }}>{text || '-'}</span>
      ),
    },
    {
      title: 'Lease End',
      dataIndex: 'leaseDateEnded',
      key: 'leaseDateEnded',
      width: 120,
      render: (text: string) => text || <span style={{ color: '#ACABA9' }}>-</span>,
    },
    {
      title: 'Source',
      dataIndex: 'sourceAddress',
      key: 'sourceAddress',
      width: 280,
      ellipsis: { showTitle: false },
      render: (text: string) => <span title={text} style={{ color: '#787774', fontSize: 13 }}>{text}</span>,
    },
  ];

  const taskColumns = [
    {
      title: 'Scheduled',
      dataIndex: 'scheduledAt',
      key: 'scheduledAt',
      width: 170,
      render: (value?: string) => value ? dayjs(value).format('YYYY-MM-DD HH:mm') : <span style={{ color: '#ACABA9' }}>Unscheduled</span>,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: number) => {
        const cfg = getType(type);
        return cfg ? <Tag color={cfg.color} style={tagStyle}>{cfg.name}</Tag> : type;
      },
    },
    {
      title: 'Billable',
      dataIndex: 'isBillable',
      key: 'isBillable',
      width: 100,
      render: (value: boolean) => <Tag color={value ? 'gold' : 'green'} style={tagStyle}>{value ? 'Yes' : 'No'}</Tag>,
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: { showTitle: false },
      render: (text?: string) => <span title={text}>{text || '-'}</span>,
    },
  ];

  const recordColumns = [
    {
      title: 'Date',
      dataIndex: 'executionDate',
      key: 'executionDate',
      width: 170,
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: number) => {
        const cfg = getType(type);
        return cfg ? <Tag color={cfg.color} style={tagStyle}>{cfg.name}</Tag> : type;
      },
    },
    {
      title: 'Charged',
      dataIndex: 'isCharged',
      key: 'isCharged',
      width: 100,
      render: (value: boolean) => <Tag color={value ? 'gold' : 'green'} style={tagStyle}>{value ? 'Yes' : 'No'}</Tag>,
    },
    {
      title: 'Parking',
      dataIndex: 'parkingFee',
      key: 'parkingFee',
      width: 100,
      render: (value?: number) => value ? `$${value.toFixed(2)}` : '-',
    },
  ];

  return (
    <div>
      <div className="page-toolbar">
        <Space size={8} align="center">
          <Link to="/">
            <Button icon={<ArrowLeftOutlined />} size="small" aria-label="Back to properties" />
          </Link>
          <IndTitle>Property Info</IndTitle>
        </Space>
        <Space className="page-toolbar-actions" size={4} wrap>
          <Button icon={<ReloadOutlined />} size="small" onClick={fetchPropertyInfo} loading={loading}>Refresh</Button>
        </Space>
      </div>

      <Spin spinning={loading}>
        {property ? (
          <div className="property-page">
            <div className="property-summary">
              <h2>{property.address}</h2>
              <div className="property-summary-meta">
                <span>#{property.id}</span>
                <span>{billingPolicy === 'SixMonthFree' ? '6-Month Free' : '3-Month Toggle'}</span>
                <span>{contacts.length} contacts</span>
                <span>Latest: {latestRecord ? dayjs(latestRecord.executionDate).format('YYYY-MM-DD') : '-'}</span>
              </div>
            </div>

            <DetailSection title="Tenant Contacts" count={contacts.length}>
            <Table
              className="responsive-table"
              dataSource={contacts}
              columns={contactColumns}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 8, showSizeChanger: false }}
              scroll={{ x: 850 }}
              locale={{ emptyText: <Empty description="No tenant contacts" /> }}
            />
            </DetailSection>

            <DetailSection title="Open Tasks" count={tasks.length}>
            <Table
              className="responsive-table"
              dataSource={tasks}
              columns={taskColumns}
              rowKey={(row) => `task-${row.id}`}
              size="small"
              pagination={{ pageSize: 6, showSizeChanger: false }}
              scroll={{ x: 720 }}
              locale={{ emptyText: <Empty description="No open tasks" /> }}
            />
            </DetailSection>

            <DetailSection title="Inspection Records" count={records.length}>
            <Table
              className="responsive-table"
              dataSource={records}
              columns={recordColumns}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 6, showSizeChanger: false }}
              scroll={{ x: 620 }}
              locale={{ emptyText: <Empty description="No inspection records" /> }}
            />
            </DetailSection>
          </div>
        ) : (
          <Empty description="Property not found" />
        )}
      </Spin>
    </div>
  );
};

export default PropertyDetailsPage;
