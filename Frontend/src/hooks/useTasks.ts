import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api';
import { API_ENDPOINTS } from '../config/api';
import { handleApiError } from '../utils/errorHandler';
import { useApi } from './useApi';
import { bucketTasks } from './taskBuckets';
import type {
  InspectionTaskDto,
  CombinedTask,
  BillingPolicy,
  InspectionTaskCreateRequest,
  InspectionTaskUpdateRequest,
  TaskCompletionRequest,
} from '../types/api';

export function useTasks() {
  const [combinedTasks, setCombinedTasks] = useState<CombinedTask[]>([]);
  const [loading, setLoading] = useState(false);

  const { execute: executeApi } = useApi();

  const toTask = (task: InspectionTaskDto): CombinedTask => ({
    id: task.id,
    taskType: 'inspection',
    propertyId: task.propertyId,
    propertyAddress: task.propertyAddress,
    propertyBillingPolicy: task.billingPolicy as BillingPolicy,
    scheduledAt: task.scheduledAt,
    type: task.type,
    isBillable: task.isBillable,
    notes: task.notes,
  });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<InspectionTaskDto[]>(API_ENDPOINTS.inspectionTasks);
      setCombinedTasks(res.data.map(toTask));
    } catch (error) {
      handleApiError(error, 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  const createInspectionTask = useCallback(async (data: InspectionTaskCreateRequest) => {
    const result = await executeApi(
      () => api.post<InspectionTaskDto>(API_ENDPOINTS.inspectionTasks, data),
      'Task created'
    );
    if (result) await fetchTasks();
    return result;
  }, [executeApi, fetchTasks]);

  const updateInspectionTask = useCallback(async (id: number, data: InspectionTaskUpdateRequest) => {
    const success = await executeApi(
      () => api.put(`${API_ENDPOINTS.inspectionTasks}/${id}`, data),
      'Task updated'
    );
    if (success !== null) await fetchTasks();
    return success !== null;
  }, [executeApi, fetchTasks]);

  const deleteInspectionTask = useCallback(async (id: number) => {
    const success = await executeApi(
      () => api.delete(`${API_ENDPOINTS.inspectionTasks}/${id}`),
      'Task deleted'
    );
    if (success !== null) {
      setCombinedTasks(prev => prev.filter(t => t.id !== id));
    }
    return success !== null;
  }, [executeApi]);

  const completeInspectionTask = useCallback(async (id: number, data: TaskCompletionRequest) => {
    const result = await executeApi(
      () => api.post(`${API_ENDPOINTS.inspectionTasks}/${id}/complete`, data),
      'Task completed'
    );
    if (result !== null) await fetchTasks();  // 204 No Content → data="" (falsy), must check !== null
    return result;
  }, [executeApi, fetchTasks]);

  const { overdueTasks, todayTasks, tomorrowTasks, upcomingTasks, unscheduledTasks } = useMemo(
    () => bucketTasks(combinedTasks),
    [combinedTasks]
  );

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    loading,
    overdueTasks,
    todayTasks,
    tomorrowTasks,
    upcomingTasks,
    unscheduledTasks,
    fetchTasks,
    createInspectionTask,
    updateInspectionTask,
    deleteInspectionTask,
    completeInspectionTask,
  };
}
