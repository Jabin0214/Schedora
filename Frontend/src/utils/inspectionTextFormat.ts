const SECTION_HEADINGS = new Set([
  'Overall Presentation:',
  'Tenant Care:',
  'Maintenance:',
  'Maintenance & Appliance Verification:',
  'Move-in Checks & Observations:',
  'Risk Areas:',
  'Risk Areas & Healthy Homes Compliance:',
  'Assessment:',
]);

export function formatInspectionTemplateForCopy(text: string): string {
  const sourceLines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.trimEnd());

  const lines: string[] = [];

  for (const line of sourceLines) {
    const trimmed = line.trim();
    if (!trimmed) {
      pushBlank(lines);
      continue;
    }

    if (SECTION_HEADINGS.has(trimmed)) {
      if (lines.length > 0) pushBlank(lines);
      lines.push(trimmed);
      pushBlank(lines);
      continue;
    }

    lines.push(line.trimStart());
  }

  return collapseBlankLines(lines).join('\n').trim();
}

function pushBlank(lines: string[]) {
  if (lines.length === 0 || lines[lines.length - 1] === '') return;
  lines.push('');
}

function collapseBlankLines(lines: string[]) {
  const collapsed: string[] = [];
  for (const line of lines) {
    if (line === '' && collapsed[collapsed.length - 1] === '') continue;
    collapsed.push(line);
  }
  return collapsed;
}
