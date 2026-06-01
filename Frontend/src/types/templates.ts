export interface TemplateInspectionType {
  id: number;
  name: string;
  displayOrder: number;
}

export interface GeneralTemplate {
  id: number;
  inspectionTypeId: number;
  text: string;
}

export interface TemplatesAll {
  inspectionTypes: TemplateInspectionType[];
  generalTemplates: GeneralTemplate[];
}

export interface AssemblyState {
  inspectionTypeId: number | null;
}

export interface AssembledOutput {
  generalText: string;
}
