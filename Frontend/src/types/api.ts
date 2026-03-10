export const InspectionType = {
  MoveIn: 0,
  MoveOut: 1,
  Routine: 2,
  Other: 3,
} as const;
export type InspectionType = typeof InspectionType[keyof typeof InspectionType];
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
}

export interface InspectionRecordDto {
  id: number;
  propertyId: number;
  propertyAddress?: string;
  executionDate: string;
  type: InspectionType;
  isCharged: boolean;
}
