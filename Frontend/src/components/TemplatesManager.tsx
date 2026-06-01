import React, { useState, useMemo } from 'react';
import { Modal, Tabs, List, Button, Input, Popconfirm, message, Collapse, Space } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import api from '../api';
import { API_ENDPOINTS } from '../config/api';
import { modalStyles } from './shared';
import type { TemplatesAll, GeneralTemplate } from '../types/templates';

const { TextArea } = Input;

interface Props {
  data: TemplatesAll;
  onClose: () => void;
  onChanged: () => void;
}

type EditCategory =
  | 'inspectionTypes'
  | 'generalTemplates';

type EditPatch = Record<string, unknown>;
type EditMap = Record<number, EditPatch>;
type Edits = Record<EditCategory, EditMap>;

const emptyEdits: Edits = {
  inspectionTypes: {},
  generalTemplates: {},
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
      Object.keys(edits.generalTemplates).length,
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
    for (const [idStr, patch] of Object.entries(edits.generalTemplates)) {
      const id = Number(idStr);
      const g = data.generalTemplates.find(x => x.id === id);
      if (!g) continue;
      const merged = { ...g, ...patch };
      requests.push(
        api.put(`${API_ENDPOINTS.templates}/general/${id}`, { text: merged.text }),
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
            key: 'wrappers',
            label: '整体描述',
            children: (
              <GeneralTemplatesTab data={data} edits={edits} updateField={updateField} />
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
                  title="删除该类型？相关的整体描述会一起删除"
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

// ─── General Templates ───────────────────────────────────────

const GeneralTemplatesTab: React.FC<{
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
            <h4 style={{ marginTop: 0 }}>整体描述</h4>
            {generalForType(data.generalTemplates, t.id) ? (
              <GeneralRow
                g={generalForType(data.generalTemplates, t.id)!}
                edits={edits}
                updateField={updateField}
              />
            ) : null}
          </div>
        ),
      }))}
    />
  );
};

function generalForType(all: GeneralTemplate[], typeId: number): GeneralTemplate | undefined {
  return all.find(g => g.inspectionTypeId === typeId);
}

const GeneralRow: React.FC<{
  g: GeneralTemplate;
  edits: Edits;
  updateField: UpdateField;
}> = ({ g, edits, updateField }) => {
  const patch = edits.generalTemplates[g.id] ?? {};
  const text = (patch.text as string | undefined) ?? g.text;
  return (
    <div style={{ marginBottom: 12 }}>
      <TextArea
        value={text}
        autoSize={{ minRows: 2, maxRows: 8 }}
        onChange={e => updateField('generalTemplates', g.id, 'text', e.target.value, g.text)}
      />
    </div>
  );
};

export default TemplatesManager;
