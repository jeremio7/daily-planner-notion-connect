import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { format, addDays, subDays } from 'date-fns';

export function usePlanner() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [todos, setTodos] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [deleted, setDeleted] = useState([]);
  const [loading, setLoading] = useState(false);

  const dateStr = format(currentDate, 'yyyy-MM-dd');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/planner/${dateStr}`);
      setTodos(res.data.todos || []);
      setSchedule(res.data.schedule || []);
      setDeleted(res.data.deleted || []);
    } catch (err) {
      console.error('데이터 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [dateStr]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addTodo = async (text) => {
    try {
      const res = await axios.post(`/api/planner/${dateStr}/todos`, { text });
      setTodos(prev => [...prev, res.data]);
    } catch (err) {
      console.error('할일 추가 실패:', err);
    }
  };

  const deleteTodo = async (id) => {
    try {
      await axios.delete(`/api/planner/${dateStr}/todos/${id}`);
      setTodos(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('할일 삭제 실패:', err);
    }
  };

  const assignSchedule = async (todoId, startTime, endTime) => {
    try {
      const res = await axios.post(`/api/planner/${dateStr}/schedule`, {
        todoId,
        startTime,
        endTime,
      });
      setTodos(res.data.todos);
      setSchedule(res.data.schedule);
    } catch (err) {
      console.error('계획 배정 실패:', err);
    }
  };

  const toggleDone = async (id, done) => {
    try {
      await axios.patch(`/api/planner/${dateStr}/schedule/${id}`, { done });
      setSchedule(prev =>
        prev.map(s => (s.id === id ? { ...s, done } : s))
      );
    } catch (err) {
      console.error('완료 토글 실패:', err);
    }
  };

  const rateSchedule = async (id, rating) => {
    try {
      await axios.patch(`/api/planner/${dateStr}/schedule/${id}`, { rating });
      setSchedule(prev =>
        prev.map(s => (s.id === id ? { ...s, rating } : s))
      );
    } catch (err) {
      console.error('평가 실패:', err);
    }
  };

  const updateScheduleTime = async (id, startTime, endTime) => {
    try {
      const res = await axios.patch(`/api/planner/${dateStr}/schedule/${id}`, { startTime, endTime });
      setSchedule(res.data.schedule);
    } catch (err) {
      console.error('시간 수정 실패:', err);
    }
  };

  const deleteSchedule = async (id) => {
    try {
      const res = await axios.delete(`/api/planner/${dateStr}/schedule/${id}`);
      setTodos(res.data.todos);
      setSchedule(res.data.schedule);
      setDeleted(res.data.deleted || []);
    } catch (err) {
      console.error('계획 삭제 실패:', err);
    }
  };

  const clearDeletedItem = async (id) => {
    try {
      const res = await axios.delete(`/api/planner/${dateStr}/deleted/${id}`);
      setDeleted(res.data.deleted || []);
    } catch (err) {
      console.error('삭제항목 제거 실패:', err);
    }
  };

  const restoreDeletedItem = async (id) => {
    try {
      const res = await axios.post(`/api/planner/${dateStr}/deleted/${id}/restore`);
      setTodos(res.data.todos);
      setDeleted(res.data.deleted || []);
    } catch (err) {
      console.error('삭제항목 복원 실패:', err);
    }
  };

  const swapSchedule = async (dragId, dropId) => {
    try {
      const res = await axios.post(`/api/planner/${dateStr}/schedule/swap`, { dragId, dropId });
      setSchedule(res.data.schedule);
    } catch (err) {
      console.error('시간 교환 실패:', err);
    }
  };

  const autoAssign = async (slotMinutes = 60) => {
    try {
      const res = await axios.post(`/api/planner/${dateStr}/schedule/auto`, { slotMinutes });
      setTodos(res.data.todos);
      setSchedule(res.data.schedule);
      setDeleted(res.data.deleted || []);
    } catch (err) {
      console.error('자동 배치 실패:', err);
    }
  };

  const goToday = () => setCurrentDate(new Date());
  const goPrev = () => setCurrentDate(prev => subDays(prev, 1));
  const goNext = () => setCurrentDate(prev => addDays(prev, 1));

  return {
    currentDate,
    dateStr,
    todos,
    schedule,
    deleted,
    loading,
    addTodo,
    deleteTodo,
    assignSchedule,
    toggleDone,
    rateSchedule,
    deleteSchedule,
    updateScheduleTime,
    clearDeletedItem,
    restoreDeletedItem,
    swapSchedule,
    autoAssign,
    refreshData: fetchData,
    goToday,
    goPrev,
    goNext,
  };
}
