import type {
  TemplatesAll,
  AssemblyState,
  AssembledOutput,
  CleanlinessArea,
  DamageItem,
} from '../types/templates';
import { TemplateAudience } from '../types/templates';

const EMPTY_OUTPUT: AssembledOutput = { generalText: '', tenantText: '', landlordText: '' };

export function assemble(state: AssemblyState, data: TemplatesAll): AssembledOutput {
  if (state.inspectionTypeId == null) return EMPTY_OUTPUT;

  const hasCleanlinessIssue = state.selectedAreaIds.length > 0;
  const hasDamageIssue =
    state.selectedDamageItemIds.length > 0 ||
    state.customDamageEntries.some(s => s.trim().length > 0);

  // ── General ────────────────────────────────────────────────
  const general = data.generalTemplates.find(g =>
    g.inspectionTypeId === state.inspectionTypeId &&
    g.hasCleanlinessIssue === hasCleanlinessIssue &&
    g.hasDamageIssue === hasDamageIssue
  );
  const generalText = general?.text ?? '';

  // ── Tenant ─────────────────────────────────────────────────
  const tenantTpl = data.audienceTemplates.find(a =>
    a.inspectionTypeId === state.inspectionTypeId &&
    a.audience === TemplateAudience.Tenant
  );
  const tenantText = tenantTpl
    ? hasCleanlinessIssue
      ? joinNonEmpty([
          tenantTpl.issuePrefix,
          ...orderedAreas(data.cleanlinessAreas, state.selectedAreaIds).map(a => a.dirtyText),
          tenantTpl.issueSuffix,
        ])
      : tenantTpl.noIssueText
    : '';

  // ── Landlord ───────────────────────────────────────────────
  const landlordTpl = data.audienceTemplates.find(a =>
    a.inspectionTypeId === state.inspectionTypeId &&
    a.audience === TemplateAudience.Landlord
  );
  const landlordText = landlordTpl
    ? hasDamageIssue
      ? joinNonEmpty([
          landlordTpl.issuePrefix,
          ...orderedDamage(data.damageItems, state.selectedDamageItemIds).map(d => d.text),
          ...state.customDamageEntries.map(s => s.trim()).filter(s => s.length > 0),
          landlordTpl.issueSuffix,
        ])
      : landlordTpl.noIssueText
    : '';

  return { generalText, tenantText, landlordText };
}

function orderedAreas(all: CleanlinessArea[], ids: number[]): CleanlinessArea[] {
  const set = new Set(ids);
  return all.filter(a => set.has(a.id));    // preserves displayOrder of `all`
}

function orderedDamage(all: DamageItem[], ids: number[]): DamageItem[] {
  const set = new Set(ids);
  return all.filter(d => set.has(d.id));
}

function joinNonEmpty(parts: string[]): string {
  return parts.filter(p => p && p.length > 0).join('\n');
}
