export interface TaskTypeConfig {
  id: number;
  name: string;
  color: string;
  displayOrder: number;
}

export const InspectionType = {
  MoveIn: 0,
  MoveOut: 1,
  Routine: 2,
  Other: 3,
} as const;
export type InspectionType = typeof InspectionType[keyof typeof InspectionType];
export type BillingPolicy = 'SixMonthFree' | 'ThreeMonthToggle';
export type BillingPolicyValue = BillingPolicy | 0 | 1;

export interface Property {
  id: number;
  address: string;
  billingPolicy?: BillingPolicyValue;
}

export interface CombinedTask {
  id: number;
  taskType: 'inspection';
  propertyId?: number;
  propertyAddress?: string;
  propertyBillingPolicy?: BillingPolicyValue;
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
  type: InspectionType;
  isBillable: boolean;
  notes?: string;
  billingPolicy: string;
}

export interface InspectionTaskCreateRequest {
  propertyId: number;
  scheduledAt?: string;
  type: InspectionType;
  isBillable?: boolean;
  notes?: string;
}

export interface InspectionTaskUpdateRequest {
  propertyId: number;
  scheduledAt?: string;
  notes?: string;
  type: InspectionType;
  isBillable: boolean;
}

export interface TaskCompletionRequest {
  executionDate: string;
  parkingFee?: number;
}

export interface InspectionRecordDto {
  id: number;
  propertyId: number;
  propertyAddress?: string;
  executionDate: string;
  type: InspectionType;
  isCharged: boolean;
  parkingFee?: number;
}

export interface AiInspectionPolishRequest {
  address?: string;
  inspectionType?: string;
  notes: string;
  isBillable: boolean;
}

export interface AiInspectionPolishResponse {
  generalText: string;
  tenantText: string;
  landlordText: string;
  summary: string;
}
