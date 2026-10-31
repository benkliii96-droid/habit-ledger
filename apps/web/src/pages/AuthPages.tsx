import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { api } from "../shared/api";
import { BrandMark, Button, Panel } from "../shared/ui";

const errorMap: Record<string, string> = {
  oauth_denied: "Вход через провайдера отменён",
  oauth_state: "Сессия OAuth устарела — попробуйте ещё раз",
  oauth_failed: "Не удалось войти через провайдера",
  oauth_config: "OAuth не настроен на сервере",
};

function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="app-shell">
      <div className="container auth-wrap rise">
        <Link to="/">
          <BrandMark />
        </Link>
        <Panel className="auth-panel">
          <h1>{title}</h1>
          {children}
        </Panel>
      </div>
      <style>{`
        .auth-wrap {
          min-height: 100vh;
          display: grid;
          align-content: center;
          gap: 1.25rem;
          padding-block: 2rem;
          max-width: 460px;
        }
        .auth-panel h1 {
          font-size: 2rem;
          margin-bottom: 1.25rem;
        }
        .auth-divider {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 0.75rem;
          align-items: center;
          color: var(--ink-faint);
          font-size: 0.85rem;
          margin: 0.25rem 0;
        }
        .auth-divider::before,
        .auth-divider::after {
          content: "";
          height: 1px;
          background: var(--line);
        }
        .auth-form { display: grid; gap: 0.9rem; }
        .auth-switch { margin-top: 1rem; font-size: 0.95rem; }
      `}</style>
    </div>
  );
}

function OAuthButtons({ mode = "login" }: { mode?: "login" | "link" }) {
  const [providers, setProviders] = useState({ google: false, yandex: false });

  useEffect(() => {
    api.providers().then(setProviders).catch(() => undefined);
  }, []);

  return (
    <div className="stack">
      <Button
        variant="oauth"
        type="button"
        onClick={() => {
          if (!providers.google) {
            alert("Google OAuth не настроен. Добавьте GOOGLE_CLIENT_ID/SECRET в .env");
            return;
          }
          window.location.href = api.oauthUrl("google", mode);
        }}
      >
        Войти через Google
      </Button>
      <Button
        variant="oauth"
        type="button"
        onClick={() => {
          if (!providers.yandex) {
            alert("Yandex OAuth не настроен. Добавьте YANDEX_CLIENT_ID/SECRET в .env");
            return;
          }
          window.location.href = api.oauthUrl("yandex", mode);
        }}
      >
        Войти через Яндекс
      </Button>
    </div>
  );
}

export function LoginPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(errorMap[params.get("error") || ""] || "");
  const [pending, setPending] = useState(false);

  if (user) return <Navigate to="/app" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    try {
      const res = await api.login({ email, password });
      setUser(res.user);
      navigate("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell title="Вход">
      {error && <div className="error-banner">{error}</div>}
      <OAuthButtons />
      <div className="auth-divider">или email</div>
      <form className="auth-form" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Пароль</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button disabled={pending}>{pending ? "Входим…" : "Войти"}</Button>
      </form>
      <p className="auth-switch muted">
        Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
      </p>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  if (user) return <Navigate to="/app" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    try {
      const res = await api.register({ email, password, name: name || undefined });
      setUser(res.user);
      navigate("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка регистрации");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell title="Регистрация">
      {error && <div className="error-banner">{error}</div>}
      <OAuthButtons />
      <div className="auth-divider">или email</div>
      <form className="auth-form" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="name">Имя</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Пароль (мин. 8)</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        <Button disabled={pending}>
          {pending ? "Создаём…" : "Создать аккаунт"}
        </Button>
      </form>
      <p className="auth-switch muted">
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </p>
    </AuthShell>
  );
}
