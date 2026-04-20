import React from 'react';
import { Typography } from 'antd';

const { Title } = Typography;

const InspectPage: React.FC = () => {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <Title level={4} style={{ marginTop: 0 }}>Inspect</Title>
      <p>Placeholder — wiring check.</p>
    </div>
  );
};

export default InspectPage;
