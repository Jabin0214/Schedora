// API 类型定义
export type InspectionType = 'MoveIn' | 'MoveOut' | 'Routine';
export type InspectionStatus = 'Pending' | 'Ready' | 'Completed';
export type BillingPolicy = 'SixMonthFree' | 'ThreeMonthToggle';

// 基础接口
export interface Property {
  id: number;
  address: string;
  billingPolicy?: BillingPolicy;
  lastInspectionDate?: string;
  lastInspectionType?: InspectionType;
  lastInspectionWasCharged?: boolean;
}

export interface InspectionTask {
  id: number;
  propertyId: number;
  propertyAddress?: string;
  propertyBillingPolicy?: Property['billingPolicy'];
  scheduledAt?: string;
  type: InspectionType;
  status: InspectionStatus;
  isBillable: boolean;
  notes?: string;
  createdAt?: string;
  completedAt?: string;
  lastInspectionDate?: string;
  lastInspectionType?: InspectionType;
  lastInspectionWasCharged?: boolean;
}

export interface SundryTask {
  id: number;
  description: string;
  notes?: string;
  createdAt: string;
  executionDate?: string;
}

export interface CombinedTask {
  id: number;
  taskType: 'inspection' | 'sundry';
  propertyId?: number;
  propertyAddress?: string;
  propertyBillingPolicy?: Property['billingPolicy'];
  scheduledAt?: string;
  type?: InspectionType;
  status?: InspectionStatus;
  isBillable?: boolean;
  description?: string;
  executionDate?: string;
  notes?: string;
  createdAt: string;
}

// DTO 接口
export interface InspectionTaskDto {
  id: number;
  propertyId: number;
  propertyAddress?: string;
  scheduledAt?: string;
  type: string;
  status: string;
  isBillable: boolean;
  notes?: string;
  createdAt: string;
  completedAt?: string;
  lastInspectionDate?: string;
  lastInspectionType?: string;
  lastInspectionWasCharged: boolean;
  billingPolicy: string;
}

export interface SundryTaskDto {
  id: number;
  description: string;
  notes?: string;
  createdAt: string;
  executionDate?: string;
}

// 请求/响应类型
export interface InspectionTaskCreateRequest {
  propertyId: number;
  scheduledAt?: string;
  type: string;
  status: string;
  notes?: string;
}

export interface InspectionTaskUpdateRequest {
  propertyId: number;
  scheduledAt?: string;
  status: string;
  notes?: string;
  type: string;
}

export interface SundryTaskCreateRequest {
  description: string;
  notes?: string;
  executionDate?: string;
}

export interface SundryTaskUpdateRequest {
  description: string;
  notes?: string;
  executionDate?: string;
}

export interface TaskCompletionRequest {
  executionDate: string;
  notes: string;
}

// 报告相关
export interface PayrollReportDto {
  period: ReportPeriodDto;
  summary: ReportSummaryDto;
  inspections: InspectionRecordDto[];
  sundryTasks: SundryTaskDto[];
}

export interface ReportPeriodDto {
  startDate: string;
  endDate: string;
  days: number;
}

export interface ReportSummaryDto {
  totalInspections: number;
  totalSundryTasks: number;
}

export interface InspectionRecordDto {
  id: number;
  executionDate: string;
  propertyAddress?: string;
  type: string;
  isCharged: boolean;
  notes: string;
}