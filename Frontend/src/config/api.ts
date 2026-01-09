// API 配置文件
// 开发环境使用环境变量，生产环境可以配置为相对路径或实际API地址

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5097/api';

// API 端点
export const API_ENDPOINTS = {
  properties: `${API_BASE_URL}/properties`,
  inspectionTasks: `${API_BASE_URL}/inspectiontasks`,
  sundryTasks: `${API_BASE_URL}/sundrytasks`,
  reports: `${API_BASE_URL}/reports`,
} as const;

