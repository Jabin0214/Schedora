export interface ReviewCommentInput {
  rent: string;
  startDate: string;
  tenancyType: 'fixed' | 'periodic';
  term: string;
  endDate: string;
}

export function formatReviewDate(value: string): string {
  if (!value) return '';

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export function calculateFixedTermEndDate(startDate: string, weeks: number): string {
  if (!startDate || weeks <= 0) return '';

  const start = new Date(`${startDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return '';

  start.setUTCDate(start.getUTCDate() + weeks * 7 - 1);
  return start.toISOString().slice(0, 10);
}

export function endDateForTermSelection(startDate: string, weeks: number): string {
  return calculateFixedTermEndDate(startDate, weeks);
}

export function buildReviewComment(input: ReviewCommentInput): string {
  const rent = input.rent.trim();
  const startDate = formatReviewDate(input.startDate);
  const base = rent ? `Rent increased to $${rent}` : 'Rent remains the same';
  const from = startDate ? ` from ${startDate}` : '';

  if (input.tenancyType === 'periodic') {
    return `${base}${from}. Tenancy continuing as periodic.`;
  }

  const term = input.term.trim();
  const endDate = formatReviewDate(input.endDate);
  if (term && endDate) return `${base}${from}, with a ${term} fixed term until ${endDate}.`;
  if (term) return `${base}${from}, with a ${term} fixed term.`;
  if (endDate) return `${base}${from}, with a fixed term until ${endDate}.`;
  return `${base}${from}.`;
}
