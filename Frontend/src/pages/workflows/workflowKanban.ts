import type { Workflow } from '../../types/api';

export const WorkflowStage = {
  DeclarationEmail: 0,
  WaitingDeclarationReply: 1,
  DraftPack: 2,
  SignedAndTenancySetup: 3,
  MoveInAndWrapUp: 4,
  Completed: 5,
} as const;
export type WorkflowStage = typeof WorkflowStage[keyof typeof WorkflowStage];

export interface WorkflowColumn {
  stage: WorkflowStage;
  title: string;
  description: string;
  workflows: Workflow[];
}

export const MOVE_IN_COLUMNS: Omit<WorkflowColumn, 'workflows'>[] = [
  {
    stage: WorkflowStage.DeclarationEmail,
    title: '声明邮件',
    description: '老板同意后，先发送基础规则声明',
  },
  {
    stage: WorkflowStage.WaitingDeclarationReply,
    title: '等声明回复',
    description: '对方确认条款后进入合同草稿',
  },
  {
    stage: WorkflowStage.DraftPack,
    title: '合同草稿包',
    description: '合同草稿、押金条草稿、House health report',
  },
  {
    stage: WorkflowStage.SignedAndTenancySetup,
    title: '签回后建档',
    description: '签回合同后建立 tenancy 系统档案',
  },
  {
    stage: WorkflowStage.MoveInAndWrapUp,
    title: '入住与收尾',
    description: '办理入住并发送入住当天邮件',
  },
];

export const groupMoveInWorkflowsByStage = (workflows: Workflow[]): WorkflowColumn[] =>
  MOVE_IN_COLUMNS.map(column => ({
    ...column,
    workflows: workflows.filter(workflow => workflow.stage === column.stage),
  }));

export const sortMoveInWorkflowsForList = (workflows: Workflow[]): Workflow[] =>
  [...workflows].sort((a, b) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

export const getWorkflowProgress = (workflow: Workflow): number => {
  if (workflow.items.length === 0) return 0;
  const completed = workflow.items.filter(item => item.isCompleted).length;
  return Math.round((completed / workflow.items.length) * 100);
};

const getItemCompleted = (workflow: Workflow, key: string): boolean =>
  workflow.items.find(item => item.key === key)?.isCompleted ?? false;

const calculateWorkflowStage = (workflow: Workflow): WorkflowStage => {
  if (!getItemCompleted(workflow, 'send-declaration-email')) {
    return WorkflowStage.DeclarationEmail;
  }
  if (!getItemCompleted(workflow, 'receive-declaration-reply')) {
    return WorkflowStage.WaitingDeclarationReply;
  }
  if (!getItemCompleted(workflow, 'send-draft-pack')) {
    return WorkflowStage.DraftPack;
  }
  if (
    !getItemCompleted(workflow, 'receive-signed-agreement') ||
    !getItemCompleted(workflow, 'create-tenancy-profile')
  ) {
    return WorkflowStage.SignedAndTenancySetup;
  }
  return workflow.items.every(item => item.isCompleted)
    ? WorkflowStage.Completed
    : WorkflowStage.MoveInAndWrapUp;
};

export const applyChecklistItemOptimistic = (
  workflows: Workflow[],
  workflowId: number,
  itemKey: string,
  isCompleted: boolean
): Workflow[] =>
  workflows.map(workflow => {
    if (workflow.id !== workflowId) return workflow;

    const updatedWorkflow = {
      ...workflow,
      items: workflow.items.map(item =>
        item.key === itemKey
          ? {
              ...item,
              isCompleted,
              completedAt: isCompleted ? new Date().toISOString() : null,
            }
          : item
      ),
    };

    return {
      ...updatedWorkflow,
      stage: calculateWorkflowStage(updatedWorkflow),
    };
  });
