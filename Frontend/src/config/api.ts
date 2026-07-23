// API 配置文件
// 默认使用同源 /api，避免生产环境请求用户本机 localhost。
// 本地开发由 Vite proxy 转发到 ASP.NET 后端。

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// API 端点
export const API_ENDPOINTS = {
  properties: `${API_BASE_URL}/properties`,
  inspectionTasks: `${API_BASE_URL}/inspectiontasks`,
  inspectionRecords: `${API_BASE_URL}/inspectionrecords`,
  reports: `${API_BASE_URL}/reports`,
  googleSync: `${API_BASE_URL}/googlesync`,
  taskTypes: `${API_BASE_URL}/tasktypes`,
  templates: `${API_BASE_URL}/templates`,
  tenantContacts: `${API_BASE_URL}/tenantcontacts`,
  aiInspectionPolish: `${API_BASE_URL}/ai/inspection-polish`,
  aiTaskDraft: `${API_BASE_URL}/ai/task-draft`,
} as const;

// 外部资源链接（集中管理，方便变更）
export const EXTERNAL_LINKS = {
  parkingReceipts: import.meta.env.VITE_PARKING_RECEIPTS_URL ||
    'https://drive.google.com/drive/folders/16DCZ-7VOv5Xbaa4pNwQf3WCyVcHxG7wp?usp=drive_link',
} as const;
