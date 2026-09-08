import { describe, expect, it } from 'vitest';
import type { Workflow } from '../../types/api';
import {
  WorkflowStage,
  applyChecklistItemOptimistic,
  sortMoveInWorkflowsForList,
} from './workflowKanban';

const makeWorkflow = (id: number, stage: WorkflowStage): Workflow => ({
  id,
  type: 0,
  address: `Address ${id}`,
  stage,
  isArchived: false,
  createdAt: '2026-08-19T00:00:00Z',
  updatedAt: '2026-08-19T00:00:00Z',
  items: [],
});

describe('sortMoveInWorkflowsForList', () => {
  it('keeps workflows in a stable creation order while checklist state changes', () => {
    const workflows = [
      makeWorkflow(2, WorkflowStage.DeclarationEmail),
      makeWorkflow(1, WorkflowStage.DeclarationEmail),
      makeWorkflow(3, WorkflowStage.DeclarationEmail),
    ];
    workflows[0].createdAt = '2026-08-19T08:00:00Z';
    workflows[1].createdAt = '2026-08-19T09:00:00Z';
    workflows[2].createdAt = '2026-08-19T07:00:00Z';
    workflows[2].updatedAt = '2026-08-20T07:00:00Z';

    expect(sortMoveInWorkflowsForList(workflows).map(workflow => workflow.id)).toEqual([3, 2, 1]);
  });
});

describe('applyChecklistItemOptimistic', () => {
  it('checks an item immediately and advances the visible workflow stage', () => {
    const workflow = makeWorkflow(1, WorkflowStage.DeclarationEmail);
    workflow.items = [
      {
        id: 10,
        key: 'send-declaration-email',
        label: '发送声明邮件',
        stage: WorkflowStage.DeclarationEmail,
        displayOrder: 0,
        isCompleted: false,
      },
      {
        id: 11,
        key: 'receive-declaration-reply',
        label: '收到声明回复',
        stage: WorkflowStage.WaitingDeclarationReply,
        displayOrder: 1,
        isCompleted: false,
      },
    ];

    const updated = applyChecklistItemOptimistic([workflow], 1, 'send-declaration-email', true);

    expect(updated[0].items[0].isCompleted).toBe(true);
    expect(updated[0].stage).toBe(WorkflowStage.WaitingDeclarationReply);
    expect(updated[0].updatedAt).toBe('2026-08-19T00:00:00Z');
  });
});
