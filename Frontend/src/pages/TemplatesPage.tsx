import React, { useMemo, useState } from 'react';
import { Card, Radio, Button, DatePicker, Empty, Input, Select, Space, Spin, Tabs, message } from 'antd';
import { CopyOutlined, SettingOutlined } from '@ant-design/icons';
import { useTemplates } from '../hooks/useTemplates';
import { assemble } from '../utils/templateAssembly';
import { IndTitle } from '../components/shared';
import TemplatesManager from '../components/TemplatesManager';
import type { AssemblyState } from '../types/templates';
import { reviewCommentTemplates } from '../data/reviewCommentTemplates';
import {
  defaultTemplateSection,
  templateSections,
  type TemplateSection,
} from './templateSections';
import {
  buildReviewComment,
  calculateFixedTermEndDate,
  formatReviewDate,
} from '../utils/reviewCommentGenerator';
import type { Dayjs } from 'dayjs';

const TemplatesPage: React.FC = () => {
  const { data, loading, error, refresh } = useTemplates();
  const [showManager, setShowManager] = useState(false);
  const [activeSection, setActiveSection] = useState<TemplateSection>(defaultTemplateSection);
  const [reviewRent, setReviewRent] = useState('');
  const [reviewStartDate, setReviewStartDate] = useState<Dayjs | null>(null);
  const [reviewTenancyType, setReviewTenancyType] = useState<'fixed' | 'periodic'>('fixed');
  const [reviewTermWeeks, setReviewTermWeeks] = useState<26 | 52>(26);

  const [state, setState] = useState<AssemblyState>({
    inspectionTypeId: null,
  });

  const output = useMemo(() => {
    if (!data) return { generalText: '' };
    return assemble(state, data);
  }, [state, data]);

  // Default-select first inspection type once data arrives
  React.useEffect(() => {
    if (data && state.inspectionTypeId == null && data.inspectionTypes.length > 0) {
      setState(s => ({ ...s, inspectionTypeId: data.inspectionTypes[0].id }));
    }
  }, [data, state.inspectionTypeId]);

  const copy = async (label: string, text: string) => {
    if (!text) {
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

  const generatedReviewComment = buildReviewComment({
    rent: reviewRent,
    startDate: reviewStartDate?.format('YYYY-MM-DD') ?? '',
    tenancyType: reviewTenancyType,
    term: `${reviewTermWeeks} weeks`,
    endDate: calculateFixedTermEndDate(reviewStartDate?.format('YYYY-MM-DD') ?? '', reviewTermWeeks),
  });
  const automaticEndDate = calculateFixedTermEndDate(reviewStartDate?.format('YYYY-MM-DD') ?? '', reviewTermWeeks);

  const reviewComments = (
    <div>
      <Card title="自定义租约评论" size="small" style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <Input
            value={reviewRent}
            onChange={event => setReviewRent(event.target.value)}
            placeholder="新租金，例如 650/week（可留空）"
            style={{ width: 250 }}
          />
          <DatePicker
            value={reviewStartDate}
            onChange={setReviewStartDate}
            placeholder="生效日期"
            format="DD MMM YYYY"
          />
          <Select
            value={reviewTenancyType}
            onChange={setReviewTenancyType}
            style={{ width: 130 }}
            options={[
              { value: 'fixed', label: '固定期' },
              { value: 'periodic', label: '周期性' },
            ]}
          />
          {reviewTenancyType === 'fixed' && (
            <>
              <Select
                value={reviewTermWeeks}
                onChange={value => setReviewTermWeeks(value as 26 | 52)}
                style={{ width: 195 }}
                options={[
                  { value: 26, label: '6 months (26 weeks)' },
                  { value: 52, label: '1 year (52 weeks)' },
                ]}
              />
              <Input
                value={formatReviewDate(automaticEndDate)}
                placeholder="自动计算截止日期"
                readOnly
                style={{ width: 180 }}
              />
            </>
          )}
        </Space>
        <div style={{ background: '#F7F7F5', border: '1px solid #E9E9E7', borderRadius: 4, padding: 12, marginTop: 16, whiteSpace: 'pre-wrap', fontSize: 13, color: '#37352F' }}>
          {generatedReviewComment}
        </div>
        <Button type="primary" icon={<CopyOutlined />} onClick={() => copy('自定义租约评论', generatedReviewComment)} style={{ marginTop: 12 }}>
          复制评论
        </Button>
      </Card>
      {reviewCommentTemplates.map(template => (
        <Card key={template.title} title={template.title} size="small" style={{ marginBottom: 12 }}>
          <p style={{ marginTop: 0, color: '#6B6B69' }}>{template.description}</p>
          <div style={{ background: '#F7F7F5', border: '1px solid #E9E9E7', borderRadius: 4, padding: 12, whiteSpace: 'pre-wrap', fontSize: 13, color: '#37352F' }}>
            {template.copyText}
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: '#6B6B69' }}>
            实际范例：{template.example}
          </div>
          <Button type="primary" icon={<CopyOutlined />} onClick={() => copy(template.title, template.copyText)} style={{ marginTop: 12 }}>
            复制模板
          </Button>
        </Card>
      ))}
    </div>
  );

  const previewStyle: React.CSSProperties = {
    background: '#F7F7F5',
    border: '1px solid #E9E9E7',
    borderRadius: 4,
    padding: 12,
    minHeight: 80,
    whiteSpace: 'pre-wrap',
    fontSize: 13,
    color: '#37352F',
  };

  const reportDescriptions = loading ? (
    <Spin />
  ) : error || !data ? (
    <Empty description="报告描述模板加载失败">
      <Button onClick={refresh}>重试</Button>
    </Empty>
  ) : data.inspectionTypes.length === 0 ? (
    <Empty description="还没有检查类型，先去管理模板里加一个" />
  ) : (
    <>
      <div style={{ marginBottom: 16 }}>
        <Radio.Group
          className="responsive-radio-group"
          value={state.inspectionTypeId ?? undefined}
          onChange={e => setState(s => ({ ...s, inspectionTypeId: e.target.value }))}
          optionType="button"
          buttonStyle="solid"
          options={data.inspectionTypes.map(t => ({ label: t.name, value: t.id }))}
        />
      </div>

      <Card title="General 整体描述" size="small">
        <div style={previewStyle}>{output.generalText || <span style={{ color: '#ACABA9' }}>（无文字）</span>}</div>
        <Button
          type="primary"
          icon={<CopyOutlined />}
          onClick={() => copy('General', output.generalText)}
          style={{ marginTop: 8 }}
        >
          复制
        </Button>
      </Card>
    </>
  );

  return (
    <div>
      <div className="page-toolbar">
        <IndTitle>快速模板</IndTitle>
        {activeSection === 'reports' && (
          <Button icon={<SettingOutlined />} onClick={() => setShowManager(true)}>
            管理模板
          </Button>
        )}
      </div>

      <Tabs
        activeKey={activeSection}
        onChange={key => setActiveSection(key as TemplateSection)}
        items={templateSections.map(section => ({
          ...section,
          children: section.key === 'reports' ? reportDescriptions : reviewComments,
        }))}
      />

      {showManager && data && (
        <TemplatesManager
          data={data}
          onClose={() => setShowManager(false)}
          onChanged={refresh}
        />
      )}
    </div>
  );
};

export default TemplatesPage;
