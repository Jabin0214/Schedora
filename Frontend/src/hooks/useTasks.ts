import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { API_ENDPOINTS } from '../config/api';
import { handleApiError } from '../utils/errorHandler';
import { useApi } from './useApi';
import type {
  InspectionTaskDto,
  CombinedTask,
  BillingPolicy,
  InspectionTaskCreateRequest,
  InspectionTaskUpdateRequest,
  TaskCompletionRequest,
} from '../types/api';

const getPlannedDate = (task: CombinedTask): string | undefined => task.scheduledAt;

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
      const res = await axios.get<InspectionTaskDto[]>(API_ENDPOINTS.inspectionTasks);
      setCombinedTasks(res.data.map(toTask));
    } catch (error) {
      handleApiError(error, '获取任务列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const createInspectionTask = useCallback(async (data: InspectionTaskCreateRequest) => {
    const result = await executeApi(
      () => axios.post<InspectionTaskDto>(API_ENDPOINTS.inspectionTasks, data),
      '检查任务创建成功'
    );
    if (result) await fetchTasks();
    return result;
  }, [executeApi, fetchTasks]);

  const updateInspectionTask = useCallback(async (id: number, data: InspectionTaskUpdateRequest) => {
    const success = await executeApi(
      () => axios.put(`${API_ENDPOINTS.inspectionTasks}/${id}`, data),
      '检查任务更新成功'
    );
    if (success !== null) await fetchTasks();
    return success !== null;
  }, [executeApi, fetchTasks]);

  const deleteInspectionTask = useCallback(async (id: number) => {
    const success = await executeApi(
      () => axios.delete(`${API_ENDPOINTS.inspectionTasks}/${id}`),
      '检查任务删除成功'
    );
    if (success !== null) {
      setCombinedTasks(prev => prev.filter(t => t.id !== id));
    }
    return success !== null;
  }, [executeApi]);

  const completeInspectionTask = useCallback(async (id: number, data: TaskCompletionRequest) => {
    const result = await executeApi(
      () => axios.post(`${API_ENDPOINTS.inspectionTasks}/${id}/complete`, data),
      '任务完成成功'
    );
    if (result) await fetchTasks();
    return result;
  }, [executeApi, fetchTasks]);

  const startOfToday = useMemo(() => dayjs().startOf('day'), []);
  const endOfToday = useMemo(() => dayjs().endOf('day'), []);

  const sortedTasks = useMemo(() => {
    const list = [...combinedTasks];
    list.sort((a, b) => {
      const da = getPlannedDate(a);
      const db = getPlannedDate(b);
      if (da && db) return dayjs(da).valueOf() - dayjs(db).valueOf();
      if (da) return -1;
      if (db) return 1;
      return 0;
    });
    return list;
  }, [combinedTasks]);

  const overdueTasks = useMemo(
    () => sortedTasks.filter((item) => {
      const d = getPlannedDate(item);
      return d ? dayjs(d).isBefore(startOfToday) : false;
    }),
    [sortedTasks, startOfToday]
  );

  const todayTasks = useMemo(
    () => sortedTasks.filter((item) => {
      const d = getPlannedDate(item);
      return d ? dayjs(d).isBetween(startOfToday, endOfToday, 'minute', '[]') : false;
    }),
    [sortedTasks, startOfToday, endOfToday]
  );

  const upcomingTasks = useMemo(
    () => sortedTasks.filter((item) => {
      const d = getPlannedDate(item);
      return d ? dayjs(d).isAfter(endOfToday) : false;
    }),
    [sortedTasks, endOfToday]
  );

  const unscheduledTasks = useMemo(
    () => sortedTasks.filter((item) => !getPlannedDate(item)),
    [sortedTasks]
  );

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    loading,
    overdueTasks,
    todayTasks,
    upcomingTasks,
    unscheduledTasks,
    fetchTasks,
    createInspectionTask,
    updateInspectionTask,
    deleteInspectionTask,
    completeInspectionTask,
  };
}
