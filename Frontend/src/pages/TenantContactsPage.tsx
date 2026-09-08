import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Button, Empty, Input, Modal, Space, Spin, Table, Tag, Upload, message,
} from 'antd';
import type { UploadProps } from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, EyeOutlined, ImportOutlined, ReloadOutlined, SearchOutlined, UploadOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import api, { isAxiosError } from '../api';
import { API_ENDPOINTS } from '../config/api';
import { IndTitle } from '../components/shared';
import { handleApiError } from '../utils/errorHandler';
import type { TenantContact, TenantContactImportResponse } from '../types/api';

interface PropertyContactSummary {
  propertyId: number;
  propertyAddress: string;
  count: number;
  phones: string[];
  emails: string[];
  leaseEnds: string[];
  sourceAddresses: string[];
}

const TenantContactsPage: React.FC = () => {
  const [contacts, setContacts] = useState<TenantContact[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<TenantContactImportResponse | null>(null);
  const [previewResult, setPreviewResult] = useState<TenantContactImportResponse | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<TenantContact[]>(API_ENDPOINTS.tenantContacts, {
        params: searchText.trim() ? { search: searchText.trim() } : undefined,
      });
      setContacts(res.data);
    } catch (error) {
      handleApiError(error, 'Failed to fetch tenant contacts');
    } finally {
      setLoading(false);
    }
  }, [searchText]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const uploadProps: UploadProps = {
    accept: '.csv,text/csv',
    maxCount: 1,
    beforeUpload: (file) => {
      setSelectedFile(file);
      setPreviewResult(null);
      setImportResult(null);
      return false;
    },
    onRemove: () => {
      setSelectedFile(null);
      setPreviewResult(null);
    },
  };

  const buildFormData = () => {
    if (!selectedFile) {
      message.warning('Choose a CSV file first');
      return null;
    }
    const formData = new FormData();
    formData.append('file', selectedFile);
    return formData;
  };

  const handlePreview = async () => {
    const formData = buildFormData();
    if (!formData) return;

    setChecking(true);
    try {
      const res = await api.post<TenantContactImportResponse>(
        `${API_ENDPOINTS.tenantContacts}/preview`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      setPreviewResult(res.data);
      setIsPreviewOpen(true);
    } catch (error) {
      if (isAxiosError(error)) handleApiError(error, 'CSV check failed');
    } finally {
      setChecking(false);
    }
  };

  const handleImport = async () => {
    const formData = buildFormData();
    if (!formData) return;

    setUploading(true);
    try {
      const res = await api.post<TenantContactImportResponse>(
        `${API_ENDPOINTS.tenantContacts}/import`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      setImportResult(res.data);
      message.success(`Imported ${res.data.importedRows} tenant contacts`);
      setSelectedFile(null);
      setPreviewResult(null);
      setIsPreviewOpen(false);
      fetchContacts();
    } catch (error) {
      if (isAxiosError(error)) handleApiError(error, 'Import failed');
    } finally {
      setUploading(false);
    }
  };

  const unmatchedPreview = useMemo(() => importResult?.unmatched.slice(0, 8) ?? [], [importResult]);
  const previewUnmatched = useMemo(() => previewResult?.unmatched.slice(0, 8) ?? [], [previewResult]);
  const propertySummaries = useMemo<PropertyContactSummary[]>(() => {
    const map = new Map<number, PropertyContactSummary>();
    for (const contact of contacts) {
      const current = map.get(contact.propertyId) ?? {
        propertyId: contact.propertyId,
        propertyAddress: contact.propertyAddress,
        count: 0,
        phones: [],
        emails: [],
        leaseEnds: [],
        sourceAddresses: [],
      };
      current.count += 1;
      if (contact.phone && !current.phones.includes(contact.phone)) current.phones.push(contact.phone);
      if (contact.email && !current.emails.includes(contact.email)) current.emails.push(contact.email);
      if (contact.leaseDateEnded && !current.leaseEnds.includes(contact.leaseDateEnded)) current.leaseEnds.push(contact.leaseDateEnded);
      if (contact.sourceAddress && !current.sourceAddresses.includes(contact.sourceAddress)) current.sourceAddresses.push(contact.sourceAddress);
      map.set(contact.propertyId, current);
    }
    return Array.from(map.values()).sort((a, b) => a.propertyAddress.localeCompare(b.propertyAddress));
  }, [contacts]);

  const compactList = (items: string[]) => {
    if (items.length === 0) return <span style={{ color: '#ACABA9' }}>-</span>;
    const text = items.slice(0, 2).join('; ');
    const suffix = items.length > 2 ? ` +${items.length - 2}` : '';
    return <span title={items.join('; ')}>{text}{suffix}</span>;
  };

  const columns = [
    {
      title: 'Property',
      dataIndex: 'propertyAddress',
      key: 'propertyAddress',
      ellipsis: { showTitle: false },
      render: (text: string, record: PropertyContactSummary) => (
        <Link to={`/properties/${record.propertyId}`} title={text} style={{ color: '#2383E2', fontWeight: 600, fontSize: 14 }}>
          {text}
        </Link>
      ),
    },
    {
      title: 'Contacts',
      dataIndex: 'count',
      key: 'count',
      width: 100,
      render: (count: number) => <Tag color="blue">{count}</Tag>,
    },
    {
      title: 'Phone',
      dataIndex: 'phones',
      key: 'phone',
      width: 220,
      render: (phones: string[]) => compactList(phones),
    },
    {
      title: 'Email',
      dataIndex: 'emails',
      key: 'email',
      width: 250,
      ellipsis: { showTitle: false },
      render: (emails: string[]) => compactList(emails),
    },
    {
      title: 'Lease End',
      dataIndex: 'leaseEnds',
      key: 'leaseDateEnded',
      width: 120,
      render: (leaseEnds: string[]) => compactList(leaseEnds),
    },
    {
      title: 'Action',
      key: 'action',
      width: 90,
      render: (_: unknown, record: PropertyContactSummary) => (
        <Link to={`/properties/${record.propertyId}`}>
          <Button icon={<EyeOutlined />} size="small">View</Button>
        </Link>
      ),
    },
  ];

  return (
    <div>
      <div className="page-toolbar">
        <IndTitle>Tenant Contacts</IndTitle>
        <Space className="page-toolbar-actions" size={4} wrap>
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />} size="small">Choose CSV</Button>
          </Upload>
          <Button
            icon={<CheckCircleOutlined />}
            size="small"
            onClick={handlePreview}
            loading={checking}
          >
            Check CSV
          </Button>
          <Button
            type="primary"
            icon={<ImportOutlined />}
            size="small"
            onClick={handleImport}
            loading={uploading}
            disabled={!previewResult}
          >
            Apply Update
          </Button>
          <Button icon={<ReloadOutlined />} size="small" onClick={fetchContacts} loading={loading}>Refresh</Button>
        </Space>
      </div>

      <div className="responsive-search">
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
          placeholder="Search address, phone, or email..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          onPressEnter={fetchContacts}
          allowClear={false}
        />
        <span className="responsive-search-meta">
          {propertySummaries.length} properties · {contacts.length} unique contacts
        </span>
      </div>

      {importResult && (
        <Alert
          style={{ marginBottom: 12 }}
          type={importResult.unmatchedRows > 0 ? 'warning' : 'success'}
          showIcon
          message={
            <Space size={6} wrap>
              <Tag color="green">{importResult.importedRows} imported</Tag>
              <Tag color="blue">{importResult.matchedProperties} properties</Tag>
              <Tag color="cyan">{importResult.newOrChangedRows} new/changed</Tag>
              <Tag>{importResult.unchangedRows} unchanged</Tag>
              <Tag>{importResult.skippedRows} blank skipped</Tag>
              <Tag color={importResult.unmatchedRows > 0 ? 'gold' : 'default'}>{importResult.unmatchedRows} unmatched</Tag>
            </Space>
          }
          description={
            unmatchedPreview.length > 0
              ? unmatchedPreview.map(row => row.sourceAddress).join(' · ')
              : 'All contact rows with phone or email were matched to properties.'
          }
        />
      )}

      <Spin spinning={loading}>
        <Table
          className="responsive-table"
          dataSource={propertySummaries}
          columns={columns}
          rowKey="propertyId"
          size="small"
          scroll={{ x: 980 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => <span style={{ color: '#787774', fontSize: 13 }}>{total} properties</span>,
          }}
          locale={{
            emptyText: <Empty description={<span style={{ color: '#ACABA9', fontSize: 13 }}>No tenant contacts</span>} />,
          }}
        />
      </Spin>

      <Modal
        title="CSV Check"
        open={isPreviewOpen}
        onCancel={() => setIsPreviewOpen(false)}
        onOk={handleImport}
        okText="Apply Update"
        cancelText="Review Later"
        confirmLoading={uploading}
        okButtonProps={{ disabled: !previewResult }}
      >
        {previewResult && (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space size={6} wrap>
              <Tag color="blue">{previewResult.matchedProperties} properties matched</Tag>
              <Tag color="green">{previewResult.matchedRows} contact rows ready</Tag>
              <Tag color="cyan">{previewResult.newOrChangedRows} new/changed</Tag>
              <Tag>{previewResult.unchangedRows} unchanged</Tag>
              <Tag>{previewResult.existingRowsToReplace} existing will be replaced</Tag>
              <Tag color={previewResult.unmatchedRows > 0 ? 'gold' : 'default'}>
                {previewResult.unmatchedRows} unmatched
              </Tag>
            </Space>
            <Alert
              type={previewResult.unmatchedRows > 0 ? 'warning' : 'success'}
              showIcon
              message="Safe matches only"
              description={
                previewUnmatched.length > 0
                  ? previewUnmatched.map(row => row.leaseDateEnded ? `${row.sourceAddress} (${row.leaseDateEnded})` : row.sourceAddress).join(' · ')
                  : 'All contact rows with phone or email can be matched to properties.'
              }
            />
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default TenantContactsPage;
