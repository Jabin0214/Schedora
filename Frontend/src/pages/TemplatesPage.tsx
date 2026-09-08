import React, { useMemo, useState } from 'react';
import { Card, Radio, Button, Empty, Spin, Tabs, message } from 'antd';
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

const TemplatesPage: React.FC = () => {
  const { data, loading, error, refresh } = useTemplates();
  const [showManager, setShowManager] = useState(false);
  const [activeSection, setActiveSection] = useState<TemplateSection>(defaultTemplateSection);

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

  const reviewComments = (
    <div>
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
