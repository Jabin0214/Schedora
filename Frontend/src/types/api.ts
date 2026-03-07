export type InspectionType = 'MoveIn' | 'MoveOut' | 'Routine';
export type BillingPolicy = 'SixMonthFree' | 'ThreeMonthToggle';

export interface Property {
  id: number;
  address: string;
  billingPolicy?: BillingPolicy;
}

export interface CombinedTask {
  id: number;
  taskType: 'inspection';
  propertyId?: number;
  propertyAddress?: string;
  propertyBillingPolicy?: BillingPolicy;
  scheduledAt?: string;
  type?: InspectionType;
  isBillable?: boolean;
  notes?: string;
}

export interface InspectionTaskDto {
  id: number;
  propertyId: number;
  propertyAddress?: string;
  scheduledAt?: string;
  type: string;
  isBillable: boolean;
  notes?: string;
  billingPolicy: string;
}

export interface InspectionTaskCreateRequest {
  propertyId: number;
  scheduledAt?: string;
  type: string;
  notes?: string;
}

export interface InspectionTaskUpdateRequest {
  propertyId: number;
  scheduledAt?: string;
  notes?: string;
  type: string;
  isBillable: boolean;
}

export interface TaskCompletionRequest {
  executionDate: string;
}

export interface InspectionRecordDto {
  id: number;
  propertyId: number;
  propertyAddress?: string;
  executionDate: string;
  type: string;
  isCharged: boolean;
}
