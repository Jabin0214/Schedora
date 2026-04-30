// API 配置文件
// 开发环境使用环境变量，生产环境可以配置为相对路径或实际API地址

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5097/api';

// API 端点
export const API_ENDPOINTS = {
  properties: `${API_BASE_URL}/properties`,
  inspectionTasks: `${API_BASE_URL}/inspectiontasks`,
  inspectionRecords: `${API_BASE_URL}/inspectionrecords`,
  reports: `${API_BASE_URL}/reports`,
  googleSync: `${API_BASE_URL}/googlesync`,
  taskTypes: `${API_BASE_URL}/tasktypes`,
  templates: `${API_BASE_URL}/templates`,
} as const;

// 外部资源链接（集中管理，方便变更）
export const EXTERNAL_LINKS = {
  parkingReceipts: import.meta.env.VITE_PARKING_RECEIPTS_URL ||
    'https://drive.google.com/drive/folders/16DCZ-7VOv5Xbaa4pNwQf3WCyVcHxG7wp?usp=drive_link',
} as const;

