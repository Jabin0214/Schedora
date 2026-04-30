import React, { useMemo, useState } from 'react';
import { Card, Radio, Checkbox, Button, Input, Empty, Spin, Space, message } from 'antd';
import { CopyOutlined, SettingOutlined, PlusOutlined, CloseOutlined } from '@ant-design/icons';
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
    selectedAreaIds: [],
    selectedDamageItemIds: [],
    customDamageEntries: [],
  });
  const [customInput, setCustomInput] = useState('');

  const output = useMemo(() => {
    if (!data) return { generalText: '', tenantText: '', landlordText: '' };
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

  const addCustomDamage = () => {
    const v = customInput.trim();
    if (!v) return;
    setState(s => ({ ...s, customDamageEntries: [...s.customDamageEntries, v] }));
    setCustomInput('');
  };

  const removeCustomDamage = (i: number) => {
    setState(s => ({
      ...s,
      customDamageEntries: s.customDamageEntries.filter((_, idx) => idx !== i),
    }));
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <IndTitle>快速模板</IndTitle>
        <Button icon={<SettingOutlined />} onClick={() => setShowManager(true)}>
          管理模板
        </Button>
      </div>

      {/* Inspection-type selector */}
      <div style={{ marginBottom: 16 }}>
        <Radio.Group
          value={state.inspectionTypeId ?? undefined}
          onChange={e => setState(s => ({ ...s, inspectionTypeId: e.target.value }))}
          optionType="button"
          buttonStyle="solid"
          options={data.inspectionTypes.map(t => ({ label: t.name, value: t.id }))}
        />
      </div>

      {/* General output */}
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

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {/* Tenant column */}
        <Card title="给房客（卫生）" size="small" style={{ flex: 1, minWidth: 320 }}>
          <Checkbox.Group
            value={state.selectedAreaIds}
            onChange={vals => setState(s => ({ ...s, selectedAreaIds: vals as number[] }))}
            style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
            options={data.cleanlinessAreas.map(a => ({ label: a.name, value: a.id }))}
          />
          <div style={{ ...previewStyle, marginTop: 12 }}>
            {output.tenantText || <span style={{ color: '#ACABA9' }}>（无文字）</span>}
          </div>
          <Button
            type="primary"
            icon={<CopyOutlined />}
            onClick={() => copy('给房客', output.tenantText)}
            style={{ marginTop: 8 }}
          >
            复制
          </Button>
        </Card>

        {/* Landlord column */}
        <Card title="给房东（损坏）" size="small" style={{ flex: 1, minWidth: 320 }}>
          <Checkbox.Group
            value={state.selectedDamageItemIds}
            onChange={vals => setState(s => ({ ...s, selectedDamageItemIds: vals as number[] }))}
            style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
            options={data.damageItems.map(d => ({ label: d.name, value: d.id }))}
          />
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: '#787774', marginBottom: 4 }}>+ 自定义损坏项：</div>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                onPressEnter={addCustomDamage}
                placeholder="例如：阳台栏杆松动"
              />
              <Button icon={<PlusOutlined />} onClick={addCustomDamage}>添加</Button>
            </Space.Compact>
            {state.customDamageEntries.length > 0 && (
              <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0 0' }}>
                {state.customDamageEntries.map((entry, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#37352F' }}>
                    <span style={{ flex: 1 }}>• {entry}</span>
                    <Button size="small" type="text" icon={<CloseOutlined />} onClick={() => removeCustomDamage(i)} />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div style={{ ...previewStyle, marginTop: 12 }}>
            {output.landlordText || <span style={{ color: '#ACABA9' }}>（无文字）</span>}
          </div>
          <Button
            type="primary"
            icon={<CopyOutlined />}
            onClick={() => copy('给房东', output.landlordText)}
            style={{ marginTop: 8 }}
          >
            复制
          </Button>
        </Card>
      </div>

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
