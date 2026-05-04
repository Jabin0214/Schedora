import React, { useState, useMemo } from 'react';
import { Modal, Tabs, List, Button, Input, Popconfirm, message, Collapse, Space } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import api from '../api';
import { API_ENDPOINTS } from '../config/api';
import { modalStyles } from './shared';
import type {
  TemplatesAll,
  GeneralTemplate,
  AudienceTemplate,
} from '../types/templates';
import { TemplateAudience } from '../types/templates';

const { TextArea } = Input;

interface Props {
  data: TemplatesAll;
  onClose: () => void;
  onChanged: () => void;
}

type EditCategory =
  | 'inspectionTypes'
  | 'cleanlinessAreas'
  | 'damageItems'
  | 'generalTemplates'
  | 'audienceTemplates';

type EditPatch = Record<string, unknown>;
type EditMap = Record<number, EditPatch>;
type Edits = Record<EditCategory, EditMap>;

const emptyEdits: Edits = {
  inspectionTypes: {},
  cleanlinessAreas: {},
  damageItems: {},
  generalTemplates: {},
  audienceTemplates: {},
};

type UpdateField = (
  cat: EditCategory,
  id: number,
  field: string,
  newValue: unknown,
  originalValue: unknown,
) => void;

const TemplatesManager: React.FC<Props> = ({ data, onClose, onChanged }) => {
  const [edits, setEdits] = useState<Edits>(emptyEdits);
  const [saving, setSaving] = useState(false);

  const updateField: UpdateField = (cat, id, field, newValue, originalValue) => {
    setEdits(prev => {
      const catMap: EditMap = { ...prev[cat] };
      const patch: EditPatch = { ...(catMap[id] ?? {}) };
      if (newValue === originalValue) {
        delete patch[field];
      } else {
        patch[field] = newValue;
      }
      if (Object.keys(patch).length === 0) {
        delete catMap[id];
      } else {
        catMap[id] = patch;
      }
      return { ...prev, [cat]: catMap };
    });
  };

  const totalDirty = useMemo(
    () =>
      Object.keys(edits.inspectionTypes).length +
      Object.keys(edits.cleanlinessAreas).length +
      Object.keys(edits.damageItems).length +
      Object.keys(edits.generalTemplates).length +
      Object.keys(edits.audienceTemplates).length,
    [edits],
  );

  const handleClose = () => {
    if (totalDirty > 0) {
      Modal.confirm({
        title: `有 ${totalDirty} 项未保存修改`,
        content: '确定关闭吗？修改会丢失。',
        okText: '丢弃修改',
        cancelText: '继续编辑',
        okButtonProps: { danger: true },
        onOk: () => {
          setEdits(emptyEdits);
          onClose();
        },
      });
    } else {
      onClose();
    }
  };

  const saveAll = async () => {
    if (totalDirty === 0) return;
    setSaving(true);
    const requests: Promise<unknown>[] = [];

    for (const [idStr, patch] of Object.entries(edits.inspectionTypes)) {
      const id = Number(idStr);
      const t = data.inspectionTypes.find(x => x.id === id);
      if (!t) continue;
      const merged = { ...t, ...patch };
      requests.push(
        api.put(`${API_ENDPOINTS.templates}/inspection-types/${id}`, {
          name: merged.name,
          displayOrder: merged.displayOrder,
        }),
      );
    }
    for (const [idStr, patch] of Object.entries(edits.cleanlinessAreas)) {
      const id = Number(idStr);
      const a = data.cleanlinessAreas.find(x => x.id === id);
      if (!a) continue;
      const merged = { ...a, ...patch };
      requests.push(
        api.put(`${API_ENDPOINTS.templates}/cleanliness-areas/${id}`, {
          name: merged.name,
          dirtyText: merged.dirtyText,
          displayOrder: merged.displayOrder,
        }),
      );
    }
    for (const [idStr, patch] of Object.entries(edits.damageItems)) {
      const id = Number(idStr);
      const d = data.damageItems.find(x => x.id === id);
      if (!d) continue;
      const merged = { ...d, ...patch };
      requests.push(
        api.put(`${API_ENDPOINTS.templates}/damage-items/${id}`, {
          name: merged.name,
          text: merged.text,
          displayOrder: merged.displayOrder,
        }),
      );
    }
    for (const [idStr, patch] of Object.entries(edits.generalTemplates)) {
      const id = Number(idStr);
      const g = data.generalTemplates.find(x => x.id === id);
      if (!g) continue;
      const merged = { ...g, ...patch };
      requests.push(
        api.put(`${API_ENDPOINTS.templates}/general/${id}`, { text: merged.text }),
      );
    }
    for (const [idStr, patch] of Object.entries(edits.audienceTemplates)) {
      const id = Number(idStr);
      const a = data.audienceTemplates.find(x => x.id === id);
      if (!a) continue;
      const merged = { ...a, ...patch };
      requests.push(
        api.put(`${API_ENDPOINTS.templates}/audience/${id}`, {
          noIssueText: merged.noIssueText,
          issuePrefix: merged.issuePrefix,
          issueSuffix: merged.issueSuffix,
        }),
      );
    }

    try {
      await Promise.all(requests);
      message.success(`已保存 ${totalDirty} 项修改`);
      setEdits(emptyEdits);
      onChanged();
    } catch {
      message.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title="管理模板"
      onCancel={handleClose}
      width={900}
      styles={modalStyles}
      footer={
        <Space>
          <Button onClick={handleClose}>关闭</Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            disabled={totalDirty === 0 || saving}
            loading={saving}
            onClick={saveAll}
          >
            {totalDirty > 0 ? `保存 ${totalDirty} 项修改` : '无修改'}
          </Button>
        </Space>
      }
    >
      <Tabs
        items={[
          {
            key: 'types',
            label: '检查类型',
            children: (
              <InspectionTypesTab
                data={data}
                edits={edits}
                updateField={updateField}
                onChanged={onChanged}
              />
            ),
          },
          {
            key: 'areas',
            label: '卫生区域',
            children: (
              <AreasTab
                data={data}
                edits={edits}
                updateField={updateField}
                onChanged={onChanged}
              />
            ),
          },
          {
            key: 'damage',
            label: '损坏项目',
            children: (
              <DamageTab
                data={data}
                edits={edits}
                updateField={updateField}
                onChanged={onChanged}
              />
            ),
          },
          {
            key: 'wrappers',
            label: '整体描述 & 包装语',
            children: (
              <WrappersTab data={data} edits={edits} updateField={updateField} />
            ),
          },
        ]}
      />
    </Modal>
  );
};

// ─── Tab props ────────────────────────────────────────────────

interface TabProps {
  data: TemplatesAll;
  edits: Edits;
  updateField: UpdateField;
  onChanged: () => void;
}

// ─── Inspection Types ─────────────────────────────────────────

const InspectionTypesTab: React.FC<TabProps> = ({ data, edits, updateField, onChanged }) => {
  const [newName, setNewName] = useState('');

  const create = async () => {
    const v = newName.trim();
    if (!v) return;
    try {
      await api.post(`${API_ENDPOINTS.templates}/inspection-types`, { name: v });
      setNewName('');
      message.success('已添加');
      onChanged();
    } catch {
      message.error('添加失败');
    }
  };

  const remove = async (id: number) => {
    try {
      await api.delete(`${API_ENDPOINTS.templates}/inspection-types/${id}`);
      message.success('已删除');
      onChanged();
    } catch {
      message.error('删除失败');
    }
  };

  return (
    <div>
      <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
        <Input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onPressEnter={create}
          placeholder="例如：年中检查"
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={create}>
          添加
        </Button>
      </Space.Compact>

      <List
        bordered
        dataSource={data.inspectionTypes}
        renderItem={t => {
          const patch = edits.inspectionTypes[t.id] ?? {};
          const name = (patch.name as string | undefined) ?? t.name;
          return (
            <List.Item
              actions={[
                <Popconfirm
                  key="del"
                  title="删除该类型？相关的整体描述和包装语会一起删除"
                  onConfirm={() => remove(t.id)}
                >
                  <Button danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>,
              ]}
            >
              <Input
                value={name}
                onChange={e => updateField('inspectionTypes', t.id, 'name', e.target.value, t.name)}
                variant="borderless"
              />
            </List.Item>
          );
        }}
      />
    </div>
  );
};

// ─── Cleanliness Areas ────────────────────────────────────────

const AreasTab: React.FC<TabProps> = ({ data, edits, updateField, onChanged }) => {
  const [newName, setNewName] = useState('');

  const create = async () => {
    const v = newName.trim();
    if (!v) return;
    try {
      await api.post(`${API_ENDPOINTS.templates}/cleanliness-areas`, {
        name: v,
        dirtyText: '',
      });
      setNewName('');
      onChanged();
    } catch {
      message.error('添加失败');
    }
  };

  const remove = async (id: number) => {
    try {
      await api.delete(`${API_ENDPOINTS.templates}/cleanliness-areas/${id}`);
      onChanged();
    } catch {
      message.error('删除失败');
    }
  };

  return (
    <div>
      <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
        <Input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onPressEnter={create}
          placeholder="例如：花园"
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={create}>
          添加
        </Button>
      </Space.Compact>

      <List
        bordered
        dataSource={data.cleanlinessAreas}
        renderItem={a => {
          const patch = edits.cleanlinessAreas[a.id] ?? {};
          const name = (patch.name as string | undefined) ?? a.name;
          const dirtyText = (patch.dirtyText as string | undefined) ?? a.dirtyText;
          return (
            <List.Item style={{ display: 'block' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Input
                  value={name}
                  onChange={e => updateField('cleanlinessAreas', a.id, 'name', e.target.value, a.name)}
                  style={{ flex: 1 }}
                />
                <Popconfirm title="删除该区域？" onConfirm={() => remove(a.id)}>
                  <Button danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
              </div>
              <TextArea
                value={dirtyText}
                placeholder="脏话术片段（被勾选时插入到给房客文字里）"
                autoSize={{ minRows: 2, maxRows: 6 }}
                onChange={e =>
                  updateField('cleanlinessAreas', a.id, 'dirtyText', e.target.value, a.dirtyText)
                }
              />
            </List.Item>
          );
        }}
      />
    </div>
  );
};

// ─── Damage Items ─────────────────────────────────────────────

const DamageTab: React.FC<TabProps> = ({ data, edits, updateField, onChanged }) => {
  const [newName, setNewName] = useState('');

  const create = async () => {
    const v = newName.trim();
    if (!v) return;
    try {
      await api.post(`${API_ENDPOINTS.templates}/damage-items`, { name: v, text: '' });
      setNewName('');
      onChanged();
    } catch {
      message.error('添加失败');
    }
  };

  const remove = async (id: number) => {
    try {
      await api.delete(`${API_ENDPOINTS.templates}/damage-items/${id}`);
      onChanged();
    } catch {
      message.error('删除失败');
    }
  };

  return (
    <div>
      <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
        <Input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onPressEnter={create}
          placeholder="例如：灯坏了"
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={create}>
          添加
        </Button>
      </Space.Compact>

      <List
        bordered
        dataSource={data.damageItems}
        locale={{ emptyText: '还没有损坏项目' }}
        renderItem={d => {
          const patch = edits.damageItems[d.id] ?? {};
          const name = (patch.name as string | undefined) ?? d.name;
          const text = (patch.text as string | undefined) ?? d.text;
          return (
            <List.Item style={{ display: 'block' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Input
                  value={name}
                  onChange={e => updateField('damageItems', d.id, 'name', e.target.value, d.name)}
                  style={{ flex: 1 }}
                />
                <Popconfirm title="删除该项？" onConfirm={() => remove(d.id)}>
                  <Button danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
              </div>
              <TextArea
                value={text}
                placeholder="话术片段（被勾选时插入到给房东文字里）"
                autoSize={{ minRows: 2, maxRows: 6 }}
                onChange={e => updateField('damageItems', d.id, 'text', e.target.value, d.text)}
              />
            </List.Item>
          );
        }}
      />
    </div>
  );
};

// ─── Wrappers (General + Audience) ────────────────────────────

const WrappersTab: React.FC<{
  data: TemplatesAll;
  edits: Edits;
  updateField: UpdateField;
}> = ({ data, edits, updateField }) => {
  return (
    <Collapse
      items={data.inspectionTypes.map(t => ({
        key: String(t.id),
        label: t.name,
        children: (
          <div>
            <h4 style={{ marginTop: 0 }}>整体描述（4 种状态）</h4>
            {orderedGeneral(data.generalTemplates, t.id).map(g => (
              <GeneralRow key={g.id} g={g} edits={edits} updateField={updateField} />
            ))}
            <h4>给房客 / 给房东</h4>
            {orderedAudience(data.audienceTemplates, t.id).map(a => (
              <AudienceCard key={a.id} a={a} edits={edits} updateField={updateField} />
            ))}
          </div>
        ),
      }))}
    />
  );
};

function orderedGeneral(all: GeneralTemplate[], typeId: number): GeneralTemplate[] {
  return all
    .filter(g => g.inspectionTypeId === typeId)
    .sort(
      (x, y) =>
        (Number(x.hasCleanlinessIssue) - Number(y.hasCleanlinessIssue)) * 2 +
        (Number(x.hasDamageIssue) - Number(y.hasDamageIssue)),
    );
}

function orderedAudience(all: AudienceTemplate[], typeId: number): AudienceTemplate[] {
  return all
    .filter(a => a.inspectionTypeId === typeId)
    .sort((x, y) => x.audience - y.audience);
}

const GeneralRow: React.FC<{
  g: GeneralTemplate;
  edits: Edits;
  updateField: UpdateField;
}> = ({ g, edits, updateField }) => {
  const label = `${g.hasCleanlinessIssue ? '有' : '无'}卫生问题 / ${g.hasDamageIssue ? '有' : '无'}损坏问题`;
  const patch = edits.generalTemplates[g.id] ?? {};
  const text = (patch.text as string | undefined) ?? g.text;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: '#787774', marginBottom: 4 }}>{label}</div>
      <TextArea
        value={text}
        autoSize={{ minRows: 2, maxRows: 8 }}
        onChange={e => updateField('generalTemplates', g.id, 'text', e.target.value, g.text)}
      />
    </div>
  );
};

const AudienceCard: React.FC<{
  a: AudienceTemplate;
  edits: Edits;
  updateField: UpdateField;
}> = ({ a, edits, updateField }) => {
  const title = a.audience === TemplateAudience.Tenant ? '给房客' : '给房东';
  const patch = edits.audienceTemplates[a.id] ?? {};
  const noIssueText = (patch.noIssueText as string | undefined) ?? a.noIssueText;
  const issuePrefix = (patch.issuePrefix as string | undefined) ?? a.issuePrefix;
  const issueSuffix = (patch.issueSuffix as string | undefined) ?? a.issueSuffix;
  return (
    <div style={{ border: '1px solid #E9E9E7', borderRadius: 4, padding: 12, marginBottom: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 12, color: '#787774', marginBottom: 4 }}>无问题时整段话</div>
      <TextArea
        value={noIssueText}
        autoSize={{ minRows: 2, maxRows: 6 }}
        onChange={e =>
          updateField('audienceTemplates', a.id, 'noIssueText', e.target.value, a.noIssueText)
        }
        style={{ marginBottom: 8 }}
      />
      <div style={{ fontSize: 12, color: '#787774', marginBottom: 4 }}>有问题时 — 开头</div>
      <TextArea
        value={issuePrefix}
        autoSize={{ minRows: 1, maxRows: 4 }}
        onChange={e =>
          updateField('audienceTemplates', a.id, 'issuePrefix', e.target.value, a.issuePrefix)
        }
        style={{ marginBottom: 8 }}
      />
      <div style={{ fontSize: 12, color: '#787774', marginBottom: 4 }}>有问题时 — 结尾</div>
      <TextArea
        value={issueSuffix}
        autoSize={{ minRows: 1, maxRows: 4 }}
        onChange={e =>
          updateField('audienceTemplates', a.id, 'issueSuffix', e.target.value, a.issueSuffix)
        }
      />
    </div>
  );
};

export default TemplatesManager;
