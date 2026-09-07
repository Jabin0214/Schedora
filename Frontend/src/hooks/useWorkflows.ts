import { useCallback, useEffect, useState } from 'react';
import { message } from 'antd';
import api from '../api';
import { API_ENDPOINTS } from '../config/api';
import type { Workflow, WorkflowCreateRequest, WorkflowUpdateRequest } from '../types/api';
import { applyChecklistItemOptimistic } from '../pages/workflows/workflowKanban';

export const useMoveInWorkflows = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<Workflow[]>(`${API_ENDPOINTS.workflows}/move-ins`);
      setWorkflows(res.data);
    } catch {
      message.error('Failed to load workflows');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const createWorkflow = useCallback(async (payload: WorkflowCreateRequest) => {
    try {
      const res = await api.post<Workflow>(`${API_ENDPOINTS.workflows}/move-ins`, payload);
      setWorkflows(prev => [...prev, res.data]);
      message.success('Move in workflow created');
      return res.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Failed to create workflow');
      return null;
    }
  }, []);

  const updateWorkflow = useCallback(async (id: number, payload: WorkflowUpdateRequest) => {
    try {
      const res = await api.put<Workflow>(`${API_ENDPOINTS.workflows}/move-ins/${id}`, payload);
      setWorkflows(prev => prev.map(workflow => workflow.id === id ? res.data : workflow));
      message.success('Workflow updated');
      return res.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Failed to update workflow');
      return null;
    }
  }, []);

  const updateChecklistItem = useCallback(async (id: number, itemKey: string, isCompleted: boolean) => {
    let previousWorkflows: Workflow[] = [];
    setWorkflows(prev => {
      previousWorkflows = prev;
      return applyChecklistItemOptimistic(prev, id, itemKey, isCompleted);
    });

    try {
      const res = await api.put<Workflow>(
        `${API_ENDPOINTS.workflows}/move-ins/${id}/items/${encodeURIComponent(itemKey)}`,
        { isCompleted }
      );
      return res.data;
    } catch (error: unknown) {
      setWorkflows(previousWorkflows);
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Failed to update checklist');
      return null;
    }
  }, []);

  const archiveWorkflow = useCallback(async (id: number) => {
    try {
      await api.post(`${API_ENDPOINTS.workflows}/move-ins/${id}/archive`);
      setWorkflows(prev => prev.filter(workflow => workflow.id !== id));
      message.success('Workflow archived');
      return true;
    } catch {
      message.error('Failed to archive workflow');
      return false;
    }
  }, []);

  return {
    workflows,
    loading,
    fetchWorkflows,
    createWorkflow,
    updateWorkflow,
    updateChecklistItem,
    archiveWorkflow,
  };
};
