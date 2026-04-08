import type { BillingPolicy, BillingPolicyValue, InspectionRecordDto } from '../types/api';

export function normalizeBillingPolicy(value: BillingPolicyValue | null | undefined): BillingPolicy {
  if (value === 0 || value === 'SixMonthFree') return 'SixMonthFree';
  return 'ThreeMonthToggle';
}

export function isSixMonthFreePolicy(value: BillingPolicyValue | null | undefined): boolean {
  return normalizeBillingPolicy(value) === 'SixMonthFree';
}

export function getSuggestedBillable(
  billingPolicy: BillingPolicyValue | null | undefined,
  recentRecords: InspectionRecordDto[]
): boolean {
  if (isSixMonthFreePolicy(billingPolicy)) return false;
  const latestRecord = recentRecords[0];
  return latestRecord ? !latestRecord.isCharged : true;
}
