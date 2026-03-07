import { useState, useEffect } from 'react';
import DateSelector from './components/DateSelector';
import TodoInput from './components/TodoInput';
import TimeAssigner from './components/TimeAssigner';
import ScheduleTable from './components/ScheduleTable';
import DeletedItems from './components/DeletedItems';
import ScheduleClock from './components/ScheduleClock';
import WeeklyStats from './components/WeeklyStats';
import ThemeToggle from './components/ThemeToggle';
import LoginPage from './components/LoginPage';
import NotionSync from './components/NotionSync';
import { usePlanner } from './hooks/usePlanner';
import { useNotification } from './hooks/useNotification';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const { user, loading: authLoading, login, register, logout } = useAuth();

  if (authLoading) {
    return <div className="app"><p className="loading">로딩중...</p></div>;
  }

  if (!user) {
    return (
      <LoginPage onLogin={login} onRegister={register} />
    );
  }

  return <PlannerApp user={user} onLogout={logout} />;
}

function PlannerApp({ user, onLogout }) {
  const {
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
    refreshData,
    goToday,
    goPrev,
    goNext,
  } = usePlanner();

  const { isActive: notifyActive, toggleNotification } = useNotification();
  const [todoCompleted, setTodoCompleted] = useState(false);

  useEffect(() => {
    if (!loading) {
      setTodoCompleted(schedule.length > 0);
    }
  }, [dateStr, loading]);

  return (
    <div className="app">
      <div className="container">
        <div className="user-bar">
          <span className="user-name">{user.name}</span>
          <div className="user-bar-right">
            <ThemeToggle />
            <button className="btn-logout" onClick={onLogout}>로그아웃</button>
          </div>
        </div>
        <DateSelector
          currentDate={currentDate}
          goPrev={goPrev}
          goNext={goNext}
          goToday={goToday}
          notifyActive={notifyActive}
          onToggleNotification={toggleNotification}
        />
        {loading ? (
          <p className="loading">로딩중...</p>
        ) : (
          <>
            <TodoInput
              todos={todos}
              onAdd={addTodo}
              onDelete={deleteTodo}
              onComplete={() => setTodoCompleted(true)}
              isCompleted={todoCompleted}
              schedule={schedule}
              deleted={deleted}
            />
            <DeletedItems deleted={deleted} onClear={clearDeletedItem} onRestore={restoreDeletedItem} />
            {todoCompleted && (
              <>
                {todos.length > 0 && (
                  <TimeAssigner
                    todos={todos}
                    onAssign={assignSchedule}
                    onAutoAssign={autoAssign}
                  />
                )}
                <ScheduleTable
                  schedule={schedule}
                  onToggleDone={toggleDone}
                  onRate={rateSchedule}
                  onDelete={deleteSchedule}
                  onSwap={swapSchedule}
                  onUpdateTime={updateScheduleTime}
                />
                <ScheduleClock schedule={schedule} />
                <WeeklyStats currentDate={currentDate} />
              </>
            )}
            <NotionSync
              dateStr={dateStr}
              todos={todos}
              schedule={schedule}
              onImport={() => refreshData()}
              canExport={todos.length === 0 && deleted.length === 0 && schedule.length > 0}
            />
          </>
        )}
      </div>
    </div>
  );
}
