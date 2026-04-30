export interface TemplateInspectionType {
  id: number;
  name: string;
  displayOrder: number;
}

export interface CleanlinessArea {
  id: number;
  name: string;
  dirtyText: string;
  displayOrder: number;
}

export interface DamageItem {
  id: number;
  name: string;
  text: string;
  displayOrder: number;
}

export interface GeneralTemplate {
  id: number;
  inspectionTypeId: number;
  hasCleanlinessIssue: boolean;
  hasDamageIssue: boolean;
  text: string;
}

export const TemplateAudience = {
  Tenant: 0,
  Landlord: 1,
} as const;
export type TemplateAudience = typeof TemplateAudience[keyof typeof TemplateAudience];

export interface AudienceTemplate {
  id: number;
  inspectionTypeId: number;
  audience: TemplateAudience;
  noIssueText: string;
  issuePrefix: string;
  issueSuffix: string;
}

export interface TemplatesAll {
  inspectionTypes: TemplateInspectionType[];
  cleanlinessAreas: CleanlinessArea[];
  damageItems: DamageItem[];
  generalTemplates: GeneralTemplate[];
  audienceTemplates: AudienceTemplate[];
}

export interface AssemblyState {
  inspectionTypeId: number | null;
  selectedAreaIds: number[];
  selectedDamageItemIds: number[];
  customDamageEntries: string[];
}

export interface AssembledOutput {
  generalText: string;
  tenantText: string;
  landlordText: string;
}
