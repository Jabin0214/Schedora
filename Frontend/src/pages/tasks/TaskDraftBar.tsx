import React from 'react';
import { Button, Input } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';

const { Search } = Input;

interface TaskDraftBarProps {
  value: string;
  loading: boolean;
  onChange: (value: string) => void;
  onDraft: (value?: string) => void;
}

export const TaskDraftBar: React.FC<TaskDraftBarProps> = ({
  value,
  loading,
  onChange,
  onDraft,
}) => (
  <div style={{
    marginBottom: 10,
    padding: '8px 10px',
    border: '1px solid #E9E9E7',
    borderRadius: 6,
    background: '#FFFFFF',
  }}>
    <Search
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onSearch={onDraft}
      loading={loading}
      enterButton={<Button type="primary" icon={<ThunderboltOutlined />} loading={loading}>Draft</Button>}
      placeholder="Try: tomorrow 3pm routine for queen street, free, bring keys"
      allowClear
    />
  </div>
);
