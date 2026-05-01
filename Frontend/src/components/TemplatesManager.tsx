import React, { useState } from 'react';
import { Modal, Tabs, List, Button, Input, Popconfirm, message, Collapse } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
import { modalStyles } from './shared';
import type {
  TemplatesAll,
  TemplateInspectionType,
  CleanlinessArea,
  DamageItem,
  GeneralTemplate,
  AudienceTemplate,
} from '../types/templates';
import { TemplateAudience } from '../types/templates';

interface Props {
  data: TemplatesAll;
  onClose: () => void;
  onChanged: () => void;
}

const { TextArea } = Input;

const TemplatesManager: React.FC<Props> = ({ data, onClose, onChanged }) => {
  return (
    <Modal
      open
      title="管理模板"
      onCancel={onClose}
      footer={null}
      width={900}
      styles={modalStyles}
    >
      <Tabs
        items={[
          { key: 'types',     label: '检查类型',          children: <InspectionTypesTab data={data} onChanged={onChanged} /> },
          { key: 'areas',     label: '卫生区域',          children: <AreasTab data={data} onChanged={onChanged} /> },
          { key: 'damage',    label: '损坏项目',          children: <DamageTab data={data} onChanged={onChanged} /> },
          { key: 'wrappers',  label: '整体描述 & 包装语', children: <WrappersTab data={data} onChanged={onChanged} /> },
        ]}
      />
    </Modal>
  );
};

// ─── Inspection Types ─────────────────────────────────────────

const InspectionTypesTab: React.FC<{ data: TemplatesAll; onChanged: () => void }> = ({ data, onChanged }) => {
  const [newName, setNewName] = useState('');

  const create = async () => {
    const v = newName.trim();
    if (!v) return;
    try {
      await axios.post(`${API_ENDPOINTS.templates}/inspection-types`, { name: v });
      setNewName('');
      message.success('已添加');
      onChanged();
    } catch { message.error('添加失败'); }
  };

  const update = async (t: TemplateInspectionType, name: string) => {
    try {
      await axios.put(`${API_ENDPOINTS.templates}/inspection-types/${t.id}`, {
        name, displayOrder: t.displayOrder,
      });
      onChanged();
    } catch { message.error('保存失败'); }
  };

  const remove = async (id: number) => {
    try {
      await axios.delete(`${API_ENDPOINTS.templates}/inspection-types/${id}`);
      message.success('已删除');
      onChanged();
    } catch { message.error('删除失败'); }
  };

  return (
    <div>
      <Input.Group compact style={{ marginBottom: 12 }}>
        <Input
          style={{ width: 'calc(100% - 90px)' }}
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onPressEnter={create}
          placeholder="例如：年中检查"
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={create}>添加</Button>
      </Input.Group>

      <List
        bordered
        dataSource={data.inspectionTypes}
        renderItem={(t) => (
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
              defaultValue={t.name}
              onBlur={e => { if (e.target.value.trim() && e.target.value !== t.name) update(t, e.target.value.trim()); }}
              variant="borderless"
            />
          </List.Item>
        )}
      />
    </div>
  );
};

// ─── Cleanliness Areas ────────────────────────────────────────

const AreasTab: React.FC<{ data: TemplatesAll; onChanged: () => void }> = ({ data, onChanged }) => {
  const [newName, setNewName] = useState('');

  const create = async () => {
    const v = newName.trim();
    if (!v) return;
    try {
      await axios.post(`${API_ENDPOINTS.templates}/cleanliness-areas`, { name: v, dirtyText: '' });
      setNewName('');
      onChanged();
    } catch { message.error('添加失败'); }
  };

  const update = async (a: CleanlinessArea, patch: Partial<CleanlinessArea>) => {
    try {
      await axios.put(`${API_ENDPOINTS.templates}/cleanliness-areas/${a.id}`, {
        name: patch.name ?? a.name,
        dirtyText: patch.dirtyText ?? a.dirtyText,
        displayOrder: a.displayOrder,
      });
      onChanged();
    } catch { message.error('保存失败'); }
  };

  const remove = async (id: number) => {
    try {
      await axios.delete(`${API_ENDPOINTS.templates}/cleanliness-areas/${id}`);
      onChanged();
    } catch { message.error('删除失败'); }
  };

  return (
    <div>
      <Input.Group compact style={{ marginBottom: 12 }}>
        <Input
          style={{ width: 'calc(100% - 90px)' }}
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onPressEnter={create}
          placeholder="例如：花园"
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={create}>添加</Button>
      </Input.Group>

      <List
        bordered
        dataSource={data.cleanlinessAreas}
        renderItem={(a) => (
          <List.Item style={{ display: 'block' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Input
                defaultValue={a.name}
                onBlur={e => { if (e.target.value.trim() && e.target.value !== a.name) update(a, { name: e.target.value.trim() }); }}
                style={{ flex: 1 }}
              />
              <Popconfirm title="删除该区域？" onConfirm={() => remove(a.id)}>
                <Button danger size="small" icon={<DeleteOutlined />} />
              </Popconfirm>
            </div>
            <TextArea
              defaultValue={a.dirtyText}
              placeholder="脏话术片段（被勾选时插入到给房客文字里）"
              autoSize={{ minRows: 2, maxRows: 6 }}
              onBlur={e => { if (e.target.value !== a.dirtyText) update(a, { dirtyText: e.target.value }); }}
            />
          </List.Item>
        )}
      />
    </div>
  );
};

// ─── Damage Items ─────────────────────────────────────────────

const DamageTab: React.FC<{ data: TemplatesAll; onChanged: () => void }> = ({ data, onChanged }) => {
  const [newName, setNewName] = useState('');

  const create = async () => {
    const v = newName.trim();
    if (!v) return;
    try {
      await axios.post(`${API_ENDPOINTS.templates}/damage-items`, { name: v, text: '' });
      setNewName('');
      onChanged();
    } catch { message.error('添加失败'); }
  };

  const update = async (d: DamageItem, patch: Partial<DamageItem>) => {
    try {
      await axios.put(`${API_ENDPOINTS.templates}/damage-items/${d.id}`, {
        name: patch.name ?? d.name,
        text: patch.text ?? d.text,
        displayOrder: d.displayOrder,
      });
      onChanged();
    } catch { message.error('保存失败'); }
  };

  const remove = async (id: number) => {
    try {
      await axios.delete(`${API_ENDPOINTS.templates}/damage-items/${id}`);
      onChanged();
    } catch { message.error('删除失败'); }
  };

  return (
    <div>
      <Input.Group compact style={{ marginBottom: 12 }}>
        <Input
          style={{ width: 'calc(100% - 90px)' }}
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onPressEnter={create}
          placeholder="例如：灯坏了"
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={create}>添加</Button>
      </Input.Group>

      <List
        bordered
        dataSource={data.damageItems}
        locale={{ emptyText: '还没有损坏项目' }}
        renderItem={(d) => (
          <List.Item style={{ display: 'block' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Input
                defaultValue={d.name}
                onBlur={e => { if (e.target.value.trim() && e.target.value !== d.name) update(d, { name: e.target.value.trim() }); }}
                style={{ flex: 1 }}
              />
              <Popconfirm title="删除该项？" onConfirm={() => remove(d.id)}>
                <Button danger size="small" icon={<DeleteOutlined />} />
              </Popconfirm>
            </div>
            <TextArea
              defaultValue={d.text}
              placeholder="话术片段（被勾选时插入到给房东文字里）"
              autoSize={{ minRows: 2, maxRows: 6 }}
              onBlur={e => { if (e.target.value !== d.text) update(d, { text: e.target.value }); }}
            />
          </List.Item>
        )}
      />
    </div>
  );
};

// ─── Wrappers (General + Audience) ────────────────────────────

const WrappersTab: React.FC<{ data: TemplatesAll; onChanged: () => void }> = ({ data, onChanged }) => {
  return (
    <Collapse
      items={data.inspectionTypes.map(t => ({
        key: String(t.id),
        label: t.name,
        children: (
          <div>
            <h4 style={{ marginTop: 0 }}>整体描述（4 种状态）</h4>
            {orderedGeneral(data.generalTemplates, t.id).map(g => (
              <GeneralRow key={g.id} g={g} onChanged={onChanged} />
            ))}
            <h4>给房客 / 给房东</h4>
            {orderedAudience(data.audienceTemplates, t.id).map(a => (
              <AudienceCard key={a.id} a={a} onChanged={onChanged} />
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
    .sort((x, y) =>
      (Number(x.hasCleanlinessIssue) - Number(y.hasCleanlinessIssue)) * 2 +
      (Number(x.hasDamageIssue) - Number(y.hasDamageIssue))
    );
}

function orderedAudience(all: AudienceTemplate[], typeId: number): AudienceTemplate[] {
  return all
    .filter(a => a.inspectionTypeId === typeId)
    .sort((x, y) => x.audience - y.audience);
}

const GeneralRow: React.FC<{ g: GeneralTemplate; onChanged: () => void }> = ({ g, onChanged }) => {
  const label = `${g.hasCleanlinessIssue ? '有' : '无'}卫生问题 / ${g.hasDamageIssue ? '有' : '无'}损坏问题`;
  const save = async (text: string) => {
    if (text === g.text) return;
    try {
      await axios.put(`${API_ENDPOINTS.templates}/general/${g.id}`, { text });
      onChanged();
    } catch { message.error('保存失败'); }
  };
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: '#787774', marginBottom: 4 }}>{label}</div>
      <TextArea
        defaultValue={g.text}
        autoSize={{ minRows: 2, maxRows: 8 }}
        onBlur={e => save(e.target.value)}
      />
    </div>
  );
};

const AudienceCard: React.FC<{ a: AudienceTemplate; onChanged: () => void }> = ({ a, onChanged }) => {
  const title = a.audience === TemplateAudience.Tenant ? '给房客' : '给房东';
  const save = async (patch: Partial<AudienceTemplate>) => {
    try {
      await axios.put(`${API_ENDPOINTS.templates}/audience/${a.id}`, {
        noIssueText: patch.noIssueText ?? a.noIssueText,
        issuePrefix: patch.issuePrefix ?? a.issuePrefix,
        issueSuffix: patch.issueSuffix ?? a.issueSuffix,
      });
      onChanged();
    } catch { message.error('保存失败'); }
  };
  return (
    <div style={{ border: '1px solid #E9E9E7', borderRadius: 4, padding: 12, marginBottom: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 12, color: '#787774', marginBottom: 4 }}>无问题时整段话</div>
      <TextArea
        defaultValue={a.noIssueText}
        autoSize={{ minRows: 2, maxRows: 6 }}
        onBlur={e => { if (e.target.value !== a.noIssueText) save({ noIssueText: e.target.value }); }}
        style={{ marginBottom: 8 }}
      />
      <div style={{ fontSize: 12, color: '#787774', marginBottom: 4 }}>有问题时 — 开头</div>
      <TextArea
        defaultValue={a.issuePrefix}
        autoSize={{ minRows: 1, maxRows: 4 }}
        onBlur={e => { if (e.target.value !== a.issuePrefix) save({ issuePrefix: e.target.value }); }}
        style={{ marginBottom: 8 }}
      />
      <div style={{ fontSize: 12, color: '#787774', marginBottom: 4 }}>有问题时 — 结尾</div>
      <TextArea
        defaultValue={a.issueSuffix}
        autoSize={{ minRows: 1, maxRows: 4 }}
        onBlur={e => { if (e.target.value !== a.issueSuffix) save({ issueSuffix: e.target.value }); }}
      />
    </div>
  );
};

export default TemplatesManager;
