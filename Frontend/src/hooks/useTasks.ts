import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { API_ENDPOINTS } from '../config/api';
import { handleApiError } from '../utils/errorHandler';
import { useApi } from './useApi';
import type {
  InspectionTaskDto,
  SundryTaskDto,
  CombinedTask,
  InspectionType,
  InspectionStatus,
  BillingPolicy,
  InspectionTaskCreateRequest,
  InspectionTaskUpdateRequest,
  SundryTaskCreateRequest,
  SundryTaskUpdateRequest,
  TaskCompletionRequest,
} from '../types/api';

const getPlannedDate = (task: CombinedTask): string | undefined =>
  task.taskType === 'inspection' ? task.scheduledAt : task.executionDate;

export function useTasks() {
  const [inspectionTasks, setInspectionTasks] = useState<InspectionTaskDto[]>([]);
  const [sundryTasks, setSundryTasks] = useState<SundryTaskDto[]>([]);
  const [combinedTasks, setCombinedTasks] = useState<CombinedTask[]>([]);
  const [loading, setLoading] = useState(false);

  const { execute: executeApi } = useApi();

  const mergeTasks = useCallback((inspections: InspectionTaskDto[], sundry: SundryTaskDto[]): CombinedTask[] => {
    const combined: CombinedTask[] = [
      ...inspections.map((task) => ({
        id: task.id,
        taskType: 'inspection' as const,
        propertyId: task.propertyId,
        propertyAddress: task.propertyAddress,
        propertyBillingPolicy: task.billingPolicy as BillingPolicy,
        scheduledAt: task.scheduledAt,
        type: task.type as InspectionType,
        status: task.status as InspectionStatus,
        isBillable: task.isBillable,
        notes: task.notes,
        createdAt: task.createdAt,
      })),
      ...sundry.map((s) => ({
        id: s.id,
        taskType: 'sundry' as const,
        description: s.description,
        executionDate: s.executionDate,
        notes: s.notes,
        createdAt: s.createdAt,
      })),
    ];
    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return combined;
  }, []);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const [inspectionRes, sundryRes] = await Promise.all([
        axios.get<InspectionTaskDto[]>(API_ENDPOINTS.inspectionTasks),
        axios.get<SundryTaskDto[]>(API_ENDPOINTS.sundryTasks),
      ]);
      setInspectionTasks(inspectionRes.data);
      setSundryTasks(sundryRes.data);
      setCombinedTasks(mergeTasks(inspectionRes.data, sundryRes.data));
    } catch (error) {
      handleApiError(error, '获取任务列表失败');
    } finally {
      setLoading(false);
    }
  }, [mergeTasks]);

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
      setInspectionTasks(prev => prev.filter(t => t.id !== id));
      setCombinedTasks(prev => prev.filter(t => !(t.taskType === 'inspection' && t.id === id)));
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

  const createSundryTask = useCallback(async (data: SundryTaskCreateRequest) => {
    const result = await executeApi(
      () => axios.post<SundryTaskDto>(API_ENDPOINTS.sundryTasks, data),
      '杂活创建成功'
    );
    if (result) await fetchTasks();
    return result;
  }, [executeApi, fetchTasks]);

  const updateSundryTask = useCallback(async (id: number, data: SundryTaskUpdateRequest) => {
    const success = await executeApi(
      () => axios.put(`${API_ENDPOINTS.sundryTasks}/${id}`, data),
      '杂活更新成功'
    );
    if (success !== null) await fetchTasks();
    return success !== null;
  }, [executeApi, fetchTasks]);

  const deleteSundryTask = useCallback(async (id: number) => {
    const success = await executeApi(
      () => axios.delete(`${API_ENDPOINTS.sundryTasks}/${id}`),
      '杂活删除成功'
    );
    if (success !== null) {
      setSundryTasks(prev => prev.filter(t => t.id !== id));
      setCombinedTasks(prev => prev.filter(t => !(t.taskType === 'sundry' && t.id === id)));
    }
    return success !== null;
  }, [executeApi]);

  // 计算一次，避免每次渲染产生新对象引用导致 useMemo 失效
  const startOfToday = useMemo(() => dayjs().startOf('day'), []);
  const endOfToday = useMemo(() => dayjs().endOf('day'), []);

  const visibleTasks = useMemo(() => {
    const list = combinedTasks.filter((item) => {
      if (item.taskType === 'inspection' && item.status === 'Completed') return false;
      const dateStr = getPlannedDate(item);
      if (dateStr && dayjs(dateStr).isBefore(startOfToday)) return false;
      return true;
    });
    list.sort((a, b) => {
      const da = getPlannedDate(a);
      const db = getPlannedDate(b);
      if (da && db) return dayjs(da).valueOf() - dayjs(db).valueOf();
      if (da) return -1;
      if (db) return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    return list;
  }, [combinedTasks, startOfToday]);

  const todayTasks = useMemo(
    () => visibleTasks.filter((item) => {
      const d = getPlannedDate(item);
      return d ? dayjs(d).isBetween(startOfToday, endOfToday, 'minute', '[]') : false;
    }),
    [visibleTasks, startOfToday, endOfToday]
  );

  const upcomingTasks = useMemo(
    () => visibleTasks.filter((item) => {
      const d = getPlannedDate(item);
      return d ? dayjs(d).isAfter(endOfToday) : false;
    }),
    [visibleTasks, endOfToday]
  );

  const unscheduledTasks = useMemo(
    () => visibleTasks.filter((item) => !getPlannedDate(item)),
    [visibleTasks]
  );

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    loading,
    todayTasks,
    upcomingTasks,
    unscheduledTasks,
    fetchTasks,
    createInspectionTask,
    updateInspectionTask,
    deleteInspectionTask,
    completeInspectionTask,
    createSundryTask,
    updateSundryTask,
    deleteSundryTask,
  };
}
