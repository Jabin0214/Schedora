import React, { useMemo, useState } from 'react';
import { Card, Radio, Button, Empty, Spin, message } from 'antd';
import { CopyOutlined, SettingOutlined } from '@ant-design/icons';
import { useTemplates } from '../hooks/useTemplates';
import { assemble } from '../utils/templateAssembly';
import { IndTitle } from '../components/shared';
import TemplatesManager from '../components/TemplatesManager';
import type { AssemblyState } from '../types/templates';

const TemplatesPage: React.FC = () => {
  const { data, loading, error, refresh } = useTemplates();
  const [showManager, setShowManager] = useState(false);

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

  if (loading) return <Spin />;
  if (error || !data) {
    return (
      <Empty description="加载模板失败">
        <Button onClick={refresh}>重试</Button>
      </Empty>
    );
  }
  if (data.inspectionTypes.length === 0) {
    return <Empty description="还没有检查类型，先去管理模板里加一个" />;
  }

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

  return (
    <div>
      <div className="page-toolbar">
        <IndTitle>快速模板</IndTitle>
        <Button icon={<SettingOutlined />} onClick={() => setShowManager(true)}>
          管理模板
        </Button>
      </div>

      {/* Inspection-type selector */}
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

      <Card title="General 整体描述" size="small" style={{ marginBottom: 16 }}>
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

      {showManager && (
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
