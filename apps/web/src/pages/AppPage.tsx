import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { api, type Habit } from "../shared/api";
import { BrandMark, Button, Panel } from "../shared/ui";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function AppPage() {
  const { user, loading, logout } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const res = await api.habits();
    setHabits(res.habits);
  }

  useEffect(() => {
    if (user) {
      load().catch((e) => setError(e.message));
    }
  }, [user]);

  if (loading) {
    return <div className="container" style={{ paddingTop: "3rem" }}>Загрузка…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy("create");
    try {
      const res = await api.createHabit({ title: title.trim() });
      setHabits((prev) => [...prev, res.habit]);
      setTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(null);
    }
  }

  async function mark(habit: Habit, status: "done" | "skipped") {
    setBusy(habit.id);
    try {
      const res = await api.checkIn(habit.id, { date: todayKey(), status });
      setHabits((prev) => prev.map((h) => (h.id === habit.id ? res.habit : h)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(null);
    }
  }

  const doneCount = habits.filter((h) => h.todayStatus === "done").length;

  return (
    <div className="app-shell">
      <header className="container app-nav">
        <BrandMark />
        <nav className="row">
          <Link to="/app" className="nav-active">
            Сегодня
          </Link>
          <Link to="/settings">Настройки</Link>
          <Button variant="ghost" onClick={() => void logout()}>
            Выйти
          </Button>
        </nav>
      </header>

      <main className="container app-main rise">
        <section className="day-hero">
          <div>
            <p className="muted">Сегодня</p>
            <h1>
              {doneCount}/{habits.length || "—"}
            </h1>
            <p className="muted">привычек отмечено</p>
          </div>
          <Panel className="day-side">
            <p className="faint">Лучший текущий стрик</p>
            <div className="side-stat">
              {habits.reduce((m, h) => Math.max(m, h.currentStreak), 0)}
            </div>
            <p className="faint">Суммарный долг</p>
            <div className="side-stat debt">
              {habits.reduce((m, h) => m + h.debt, 0)}
            </div>
          </Panel>
        </section>

        {error && <div className="error-banner">{error}</div>}

        <section className="stack">
          {habits.map((habit) => (
            <Panel key={habit.id} className="habit-row">
              <div className="habit-main">
                <span className="habit-dot" style={{ background: habit.color }} />
                <div>
                  <h3>{habit.title}</h3>
                  <p className="muted">
                    стрик {habit.currentStreak}
                    {habit.debt > 0 ? ` · долг ${habit.debt}` : ""}
                    {habit.todayStatus ? ` · сегодня: ${habit.todayStatus === "done" ? "сделано" : "пропуск"}` : ""}
                  </p>
                </div>
              </div>
              <div className="row">
                <Button
                  variant="ghost"
                  disabled={busy === habit.id || habit.todayStatus === "skipped"}
                  onClick={() => void mark(habit, "skipped")}
                >
                  Пропуск
                </Button>
                <Button
                  disabled={busy === habit.id || habit.todayStatus === "done"}
                  onClick={() => void mark(habit, "done")}
                >
                  Сделано
                </Button>
              </div>
            </Panel>
          ))}
        </section>

        <Panel>
          <form className="create-form" onSubmit={onCreate}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="habit">Новая привычка</label>
              <input
                id="habit"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: прогулка 20 минут"
              />
            </div>
            <Button disabled={busy === "create"}>Добавить</Button>
          </form>
        </Panel>
      </main>

      <style>{`
        .app-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-block: 1.25rem;
          border-bottom: 1px solid var(--line);
        }
        .app-nav a { color: var(--ink-muted); }
        .nav-active { color: var(--ink) !important; }
        .app-main {
          display: grid;
          gap: 1.25rem;
          padding-block: 1.75rem 3rem;
        }
        .day-hero {
          display: grid;
          grid-template-columns: 1.4fr 0.8fr;
          gap: 1rem;
          align-items: stretch;
        }
        .day-hero h1 {
          font-size: clamp(3.5rem, 8vw, 5.5rem);
          line-height: 0.95;
          color: var(--accent);
        }
        .day-side .side-stat {
          font-family: var(--font-display);
          font-size: 2.4rem;
          margin-bottom: 0.8rem;
        }
        .day-side .debt { color: #ffb4ac; }
        .habit-row {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: center;
        }
        .habit-main { display: flex; gap: 0.85rem; align-items: center; }
        .habit-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .habit-row h3 { font-size: 1.15rem; font-family: var(--font-ui); letter-spacing: -0.02em; }
        .create-form {
          display: flex;
          gap: 0.85rem;
          align-items: end;
        }
        @media (max-width: 800px) {
          .day-hero, .habit-row, .create-form { grid-template-columns: 1fr; display: grid; }
          .app-nav { flex-direction: column; gap: 0.8rem; align-items: start; }
        }
      `}</style>
    </div>
  );
}
