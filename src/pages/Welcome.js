import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { guestHasData, useAuth } from '../context/AuthContext';
import { Logo } from '../components/layout';
import { Button, Field, Segmented } from '../components/ui';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;

const FEATURES = [
  { color: 'bg-hl-blue', text: 'Your courses, homework and exams on one calendar, with reminders.' },
  { color: 'bg-hl-green', text: 'A focus timer that saves your study time to each course.' },
  { color: 'bg-hl-pink', text: 'Study rooms with friends, and a weekly leaderboard.' },
];

function ErrorText({ id, children }) {
  return children ? (
    <p id={id} role="alert" className="mt-1 text-sm font-bold">
      {children}
    </p>
  ) : null;
}

function LoginForm({ onDone }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const next = {};
    if (!EMAIL_PATTERN.test(email.trim())) next.email = 'Enter the email you signed up with.';
    if (!password) next.password = 'Enter your password.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    const result = await login({ email, password });
    setBusy(false);
    if (result.ok) onDone();
    else setErrors({ [result.field]: result.error });
  }

  return (
    <form onSubmit={handleSubmit} noValidate={true} className="space-y-4">
      <div>
        <Field
          id="login-email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'login-email-error' : undefined}
        />
        <ErrorText id="login-email-error">{errors.email}</ErrorText>
      </div>
      <div>
        <Field
          id="login-password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? 'login-password-error' : undefined}
        />
        <ErrorText id="login-password-error">{errors.password}</ErrorText>
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? 'Logging in…' : 'Log in'}
      </Button>
    </form>
  );
}

function RegisterForm({ onDone }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hasGuestData] = useState(() => guestHasData());
  const [bringGuestData, setBringGuestData] = useState(true);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const next = {};
    if (!name.trim()) next.name = 'Enter your name. Friends see it on the leaderboard.';
    if (!EMAIL_PATTERN.test(email.trim())) next.email = 'Enter a valid email, like name@university.edu.';
    if (password.length < MIN_PASSWORD) next.password = `Use at least ${MIN_PASSWORD} characters.`;
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    const result = await register({ name, email, password, bringGuestData: hasGuestData && bringGuestData });
    setBusy(false);
    if (result.ok) onDone();
    else setErrors({ [result.field]: result.error });
  }

  return (
    <form onSubmit={handleSubmit} noValidate={true} className="space-y-4">
      <div>
        <Field
          id="register-name"
          label="Your name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'register-name-error' : undefined}
        />
        <ErrorText id="register-name-error">{errors.name}</ErrorText>
      </div>
      <div>
        <Field
          id="register-email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'register-email-error' : undefined}
        />
        <ErrorText id="register-email-error">{errors.email}</ErrorText>
      </div>
      <div>
        <Field
          id="register-password"
          label="Password"
          type="password"
          autoComplete="new-password"
          hint={errors.password ? null : `At least ${MIN_PASSWORD} characters.`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? 'register-password-error' : undefined}
        />
        <ErrorText id="register-password-error">{errors.password}</ErrorText>
      </div>
      {hasGuestData ? (
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={bringGuestData}
            onChange={(e) => setBringGuestData(e.target.checked)}
            className="task-check mt-0.5"
          />
          <span>Bring over the courses, deadlines and study time from guest mode</span>
        </label>
      ) : null}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}

function GuestForm({ onDone }) {
  const { continueAsGuest } = useAuth();
  const [name, setName] = useState('');
  return (
    <form
      noValidate={true}
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        continueAsGuest(name);
        onDone();
      }}
    >
      <Field
        id="guest-name"
        label="Your name (optional)"
        autoComplete="given-name"
        placeholder="Guest"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Button type="submit" variant="quiet" className="w-full">
        Continue as guest
      </Button>
    </form>
  );
}

export default function Welcome() {
  const { current } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const mode = params.get('mode') === 'register' ? 'register' : 'login';
  const next = params.get('next') || '/';
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';

  if (current) return <Navigate to={safeNext} replace={true} />;

  const enter = () => navigate(safeNext, { replace: true });
  const setMode = (value) => {
    const nextParams = new URLSearchParams(params);
    if (value === 'register') nextParams.set('mode', 'register');
    else nextParams.delete('mode');
    setParams(nextParams, { replace: true });
  };

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 md:py-16">
      <div className="mx-auto grid max-w-5xl items-start gap-x-16 gap-y-12 md:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <div className="md:pt-10">
          <Logo className="text-[2.5rem]" />
          <h1 className="mt-10 max-w-xl text-balance text-2xl leading-tight md:text-3xl md:leading-tight">
            <span className="hl hl-draw">Plan your term, and study it with friends.</span>
          </h1>
          <ul className="mt-10 max-w-md space-y-4">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex items-start gap-3">
                <span aria-hidden={true} className={`mt-1.5 inline-block h-3 w-4 shrink-0 -skew-x-12 rounded-sm ${f.color}`} />
                {f.text}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-rule bg-white p-6 sm:p-8">
          <h2 className="sr-only">{mode === 'register' ? 'Create an account' : 'Log in'}</h2>
          <Segmented
            label="Log in or create an account"
            value={mode}
            onChange={setMode}
            options={[
              {
                value: 'login',
                label: 'Log in',
              },
              {
                value: 'register',
                label: 'Create account',
              },
            ]}
          />
          <div className="mt-6">{mode === 'register' ? <RegisterForm onDone={enter} /> : <LoginForm onDone={enter} />}</div>
          <div className="mt-8 border-t border-rule pt-6">
            <h2 className="mb-1 font-sans text-base font-bold">Just looking around?</h2>
            <p className="mb-4 text-sm text-pencil">
              Use the app without an account. You can create one later and keep what you did.
            </p>
            <GuestForm onDone={enter} />
          </div>
        </div>
      </div>
      <p className="mx-auto mt-12 max-w-5xl text-sm text-pencil">
        Accounts and your data are saved in this browser only, until the app is connected to a server.
      </p>
    </main>
  );
}
