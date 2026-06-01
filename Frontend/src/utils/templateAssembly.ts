import type {
  TemplatesAll,
  AssemblyState,
  AssembledOutput,
} from '../types/templates';

const EMPTY_OUTPUT: AssembledOutput = { generalText: '' };

export function assemble(state: AssemblyState, data: TemplatesAll): AssembledOutput {
  if (state.inspectionTypeId == null) return EMPTY_OUTPUT;

  const general = data.generalTemplates.find(g => g.inspectionTypeId === state.inspectionTypeId);
  const generalText = general?.text ?? '';

  return { generalText };
}
