export type InspectionType = 'MoveIn' | 'MoveOut' | 'Routine';
export type InspectionStatus = 'Pending' | 'Ready' | 'Completed';
export type BillingPolicy = 'SixMonthFree' | 'ThreeMonthToggle';

export interface Property {
  id: number;
  address: string;
  billingPolicy?: BillingPolicy;
  lastInspectionDate?: string;
  lastInspectionType?: InspectionType;
  lastInspectionWasCharged?: boolean;
}

export interface CombinedTask {
  id: number;
  taskType: 'inspection' | 'sundry';
  propertyId?: number;
  propertyAddress?: string;
  propertyBillingPolicy?: BillingPolicy;
  scheduledAt?: string;
  type?: InspectionType;
  status?: InspectionStatus;
  isBillable?: boolean;
  description?: string;
  executionDate?: string;
  notes?: string;
  createdAt: string;
}

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

