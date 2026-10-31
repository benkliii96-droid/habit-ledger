import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { api } from "../shared/api";
import { BrandMark, Button, Panel } from "../shared/ui";

export function SettingsPage() {
  const { user, loading, setUser, logout } = useAuth();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [providers, setProviders] = useState({ google: false, yandex: false });

  useEffect(() => {
    api.providers().then(setProviders).catch(() => undefined);
  }, []);

  if (loading) return <div className="container" style={{ paddingTop: "3rem" }}>Загрузка…</div>;
  if (!user) return <Navigate to="/login" replace />;

  async function setPass(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const res = await api.setPassword(password);
      setUser(res.user);
      setPassword("");
      setMessage("Пароль сохранён");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  }

  async function unlink(provider: "google" | "yandex") {
    setError("");
    try {
      const res = await api.unlinkProvider(provider);
      setUser(res.user);
      setMessage(`Отвязан ${provider}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  }

  return (
    <div className="app-shell">
      <header className="container settings-nav">
        <BrandMark />
        <nav className="row">
          <Link to="/app">Сегодня</Link>
          <Link to="/settings">Настройки</Link>
          <Button variant="ghost" onClick={() => void logout()}>
            Выйти
          </Button>
        </nav>
      </header>

      <main className="container settings-main rise">
        <h1>Настройки</h1>
        <p className="muted">{user.email}</p>

        {error && <div className="error-banner">{error}</div>}
        {message && <Panel>{message}</Panel>}

        <Panel className="stack">
          <h2>Способы входа</h2>
          <div className="provider-line">
            <span>Email / пароль</span>
            <span className="muted">{user.hasPassword ? "задан" : "не задан"}</span>
          </div>
          {(["google", "yandex"] as const).map((provider) => {
            const linked = user.providers.includes(provider);
            return (
              <div className="provider-line" key={provider}>
                <span>{provider === "google" ? "Google" : "Яндекс ID"}</span>
                <div className="row">
                  {linked ? (
                    <Button variant="ghost" onClick={() => void unlink(provider)}>
                      Отвязать
                    </Button>
                  ) : (
                    <Button
                      variant="oauth"
                      onClick={() => {
                        if (!providers[provider]) {
                          alert(`Добавьте ключи ${provider.toUpperCase()} в .env`);
                          return;
                        }
                        window.location.href = api.oauthUrl(provider, "link");
                      }}
                    >
                      Привязать
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </Panel>

        <Panel>
          <h2>{user.hasPassword ? "Сменить пароль" : "Установить пароль"}</h2>
          <form className="stack" onSubmit={setPass} style={{ marginTop: "1rem" }}>
            <div className="field">
              <label htmlFor="password">Новый пароль</label>
              <input
                id="password"
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit">Сохранить</Button>
          </form>
        </Panel>
      </main>

      <style>{`
        .settings-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-block: 1.25rem;
          border-bottom: 1px solid var(--line);
        }
        .settings-nav a { color: var(--ink-muted); }
        .settings-main {
          display: grid;
          gap: 1rem;
          padding-block: 1.75rem 3rem;
          max-width: 720px;
        }
        .settings-main h1 { font-size: 2.4rem; }
        .settings-main h2 { font-size: 1.25rem; font-family: var(--font-ui); }
        .provider-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding-block: 0.55rem;
          border-top: 1px solid var(--line);
        }
      `}</style>
    </div>
  );
}
