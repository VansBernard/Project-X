interface AuthLayoutProps {
  children: React.ReactNode;
  eyebrow?: string;
  title?: string;
  description?: string;
  mode?: 'login' | 'signup';
}

export function AuthLayout({ children, eyebrow = 'Dealer workspace', title = 'Welcome back', description = 'Sign in to your workspace.', mode = 'login' }: AuthLayoutProps) {
  return (
    <main className={`auth-shell auth-shell--${mode}`}>
      <section className="auth-stage" aria-label="Project X welcome screen">
        <div className="auth-brand">
          <img className="auth-brand__logo" src="/Project%20X.png" alt="Project X logo" />
          <span>Project X</span>
        </div>

        <div className="auth-stage__copy">
          <p className="auth-stage__eyebrow">Dealer workspace</p>
          <h1>Finance operations<br />made simple.</h1>
          <p className="auth-stage__description">Register devices, manage payment plans, and keep every customer activation in one secure workspace.</p>
        </div>

        <div className="auth-stage__details">Secure dealer tools for registration, payments, licenses, and device access.</div>

        <div className="auth-stage__device-wrap" aria-hidden="true">
          <img className="auth-stage__device-image" src="/510uTHyDqGL._AC_UF1000,1000_QL80_.png" alt="Device preview" />
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-panel__inner">
          <div className="auth-mobile-brand">
            <img className="auth-brand__logo" src="/Project%20X.png" alt="Project X logo" />
            <span>Project X</span>
          </div>

          <header className="auth-panel__heading">
            <p>{eyebrow}</p>
            <h1>{title}</h1>
            <span>{description}</span>
          </header>

          {children}
        </div>
      </section>
    </main>
  );
}
