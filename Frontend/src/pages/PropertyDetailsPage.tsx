import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Empty, Space, Spin, Tag } from 'antd';
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

const DetailSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="property-section">
    <div className="property-section-title">{title}</div>
    {children}
  </section>
);

const Muted: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ color: '#787774' }}>{children}</span>
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
  const recentTasks = tasks.slice(0, 3);
  const recentRecords = records.slice(0, 5);

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
                <span>ID #{property.id}</span>
                <span>{billingPolicy === 'SixMonthFree' ? '6-Month Free' : '3-Month Toggle'}</span>
                <span>{contacts.length} contacts</span>
                <span>Latest: {latestRecord ? dayjs(latestRecord.executionDate).format('YYYY-MM-DD') : '-'}</span>
              </div>
            </div>

            <DetailSection title="Tenant Contacts">
              {contacts.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No tenant contacts" />
              ) : (
                <div className="property-simple-list">
                  {contacts.map(contact => (
                    <div className="property-simple-row" key={contact.id}>
                      <div className="property-simple-main">{contact.email || contact.phone || 'Contact'}</div>
                      <div className="property-simple-meta">
                        {contact.phone && <span>{contact.phone}</span>}
                        {contact.leaseDateEnded && <span>Lease end {contact.leaseDateEnded}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DetailSection>

            <DetailSection title="Open Tasks">
              {recentTasks.length === 0 ? (
                <Muted>No open tasks</Muted>
              ) : (
                <div className="property-simple-list">
                  {recentTasks.map(task => {
                    const cfg = task.type != null ? getType(task.type) : undefined;
                    return (
                      <div className="property-simple-row" key={task.id}>
                        <div className="property-simple-main">
                          {task.scheduledAt ? dayjs(task.scheduledAt).format('YYYY-MM-DD HH:mm') : 'Unscheduled'}
                        </div>
                        <div className="property-simple-meta">
                          {cfg && <Tag color={cfg.color} style={tagStyle}>{cfg.name}</Tag>}
                          <span>{task.isBillable ? 'Billable' : 'Free'}</span>
                          {task.notes && <span>{task.notes}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </DetailSection>

            <DetailSection title="Recent Inspections">
              {recentRecords.length === 0 ? (
                <Muted>No inspection records</Muted>
              ) : (
                <div className="property-simple-list">
                  {recentRecords.map(record => {
                    const cfg = getType(record.type);
                    return (
                      <div className="property-simple-row" key={record.id}>
                        <div className="property-simple-main">{dayjs(record.executionDate).format('YYYY-MM-DD HH:mm')}</div>
                        <div className="property-simple-meta">
                          {cfg && <Tag color={cfg.color} style={tagStyle}>{cfg.name}</Tag>}
                          <span>{record.isCharged ? 'Charged' : 'Free'}</span>
                          {record.parkingFee ? <span>Parking ${record.parkingFee.toFixed(2)}</span> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
