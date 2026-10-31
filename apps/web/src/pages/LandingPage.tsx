import { Link } from "react-router-dom";
import { BrandMark, Button } from "../shared/ui";
import { useAuth } from "../features/auth/AuthContext";

export function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="app-shell">
      <header className="container landing-nav rise">
        <BrandMark />
        <div className="row">
          {user ? (
            <Link to="/app">
              <Button>Открыть дневник</Button>
            </Link>
          ) : (
            <>
              <Link to="/login" className="muted">
                Войти
              </Link>
              <Link to="/register">
                <Button>Начать</Button>
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="container landing-hero">
        <div className="hero-copy rise">
          <BrandMark large />
          <p className="hero-lead muted rise-delay">
            Дневник привычек с честным учётом: стрики, долг за пропуски и ясный
            день «сегодня» — без шума и геймификации ради галочек.
          </p>
          <div className="row rise-delay" style={{ marginTop: "1.75rem" }}>
            <Link to={user ? "/app" : "/register"}>
              <Button>Вести привычки</Button>
            </Link>
            <a href="#how" className="btn btn-ghost">
              Как это работает
            </a>
          </div>
        </div>

        <div className="hero-stage rise-delay" aria-hidden>
          <div className="journal">
            <div className="journal-day">Сегодня</div>
            <div className="journal-streak">12</div>
            <div className="journal-label">дней подряд</div>
            <div className="journal-list">
              <div className="journal-item done">Утренняя зарядка</div>
              <div className="journal-item">Чтение</div>
              <div className="journal-item debt">Без сахара · долг 2</div>
            </div>
          </div>
        </div>
      </main>

      <section id="how" className="container landing-how">
        <h2>Один день. Честный след.</h2>
        <div className="how-grid">
          <article>
            <h3>Отметил — засчитано</h3>
            <p className="muted">Чекин за дату без дублей. Пропуск тоже фиксируется.</p>
          </article>
          <article>
            <h3>Долг за срыв</h3>
            <p className="muted">Пропуск копит долг. Три успешных дня гасят одно очко.</p>
          </article>
          <article>
            <h3>Вход как удобно</h3>
            <p className="muted">Email, Google или Яндекс ID — с привязкой аккаунтов.</p>
          </article>
        </div>
      </section>

      <style>{`
        .landing-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-block: 1.4rem;
        }
        .landing-hero {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 2.5rem;
          align-items: center;
          min-height: calc(100vh - 6rem);
          padding-bottom: 3rem;
        }
        .hero-lead {
          max-width: 34rem;
          font-size: 1.15rem;
          line-height: 1.55;
          margin-top: 1.25rem;
        }
        .hero-stage {
          display: flex;
          justify-content: center;
        }
        .journal {
          width: min(100%, 360px);
          aspect-ratio: 0.82;
          border-radius: 28px;
          padding: 1.6rem;
          background:
            linear-gradient(160deg, rgba(200,245,75,0.12), transparent 40%),
            linear-gradient(180deg, #241f1a, #151210);
          border: 1px solid var(--line);
          box-shadow: var(--shadow);
          animation: pulseSoft 4.5s ease-in-out infinite;
        }
        .journal-day { color: var(--ink-muted); font-size: 0.9rem; }
        .journal-streak {
          font-family: var(--font-display);
          font-size: 5.5rem;
          line-height: 0.95;
          margin-top: 0.4rem;
          color: var(--accent);
        }
        .journal-label { color: var(--ink-muted); margin-bottom: 1.4rem; }
        .journal-list { display: grid; gap: 0.65rem; }
        .journal-item {
          padding: 0.8rem 1rem;
          border-radius: 14px;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--line);
        }
        .journal-item.done { border-color: rgba(200,245,75,0.35); }
        .journal-item.debt { color: #ffc4be; }
        .landing-how {
          padding: 4rem 0 5rem;
          border-top: 1px solid var(--line);
        }
        .landing-how h2 {
          font-size: clamp(1.8rem, 3vw, 2.6rem);
          margin-bottom: 1.5rem;
        }
        .how-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }
        .how-grid article {
          padding: 1.25rem;
          border-radius: var(--radius);
          border: 1px solid var(--line);
          background: rgba(255,255,255,0.02);
        }
        .how-grid h3 { font-size: 1.2rem; margin-bottom: 0.55rem; }
        @media (max-width: 900px) {
          .landing-hero { grid-template-columns: 1fr; min-height: auto; padding-top: 1rem; }
          .how-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
