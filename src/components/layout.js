import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStudy } from '../context/StudyContext';
import { useNow } from '../hooks';
import { formatClock, timeLeft } from '../utils';
import { Icon } from './ui';

// ---------- pageColors ----------

/**
 * Each page has its own colour so you can tell where you are at a glance.
 * wash: the soft tint behind the current page's tab in the navigation.
 * accent: icons and section rules (dark enough to read on white).
 * hl: the highlighter colour on the current page's name.
 */
export const PAGE_COLORS = {
  dashboard: { wash: '#FFF3B8', accent: '#8A6A00', hl: '#FFE94D' },
  courses: { wash: '#DCEEFF', accent: '#2B6FB0', hl: '#8FD3FF' },
  focus: { wash: '#FFE4CC', accent: '#B9560A', hl: '#FFB870' },
  together: { wash: '#FFE0EF', accent: '#A8418F', hl: '#FF9ECF' },
  progress: { wash: '#DDF5E6', accent: '#1B7F60', hl: '#9BEA8B' },
};

const BY_PATH = {
  courses: 'courses',
  focus: 'focus',
  together: 'together',
  progress: 'progress',
};

/** The colour set for a route, from its first path segment ("/courses/c-1" is a Courses page). */
export function pageColorsFor(pathname) {
  const first = pathname.split('/')[1] || '';
  return PAGE_COLORS[BY_PATH[first] || 'dashboard'];
}

/** CSS variable that the page's title icon, section icons and section rules read from. */
export function pageColorVars(colors) {
  return { '--page-accent': colors.accent };
}

// ---------- AccountBox ----------

const linkClass = 'text-sm underline decoration-rule underline-offset-4 hover:decoration-ink';

/** Who is signed in, with a way out. Guests are offered an account so they can keep their work. */
export function AccountBox({ compact = false }) {
  const { current, logout } = useAuth();
  if (!current) return null;

  const signOut = () => logout('/welcome');
  const createAccount = () => logout('/welcome?mode=register');

  return (
    <div className={compact ? 'flex min-w-0 items-center gap-3' : 'border-t border-rule pt-4'}>
      <p className={`min-w-0 truncate ${compact ? 'text-sm' : ''}`}>
        <span className="font-bold">{current.name}</span>
        {current.isGuest ? <span className="text-pencil">{' (guest)'}</span> : null}
      </p>
      {compact || !current.email ? null : <p className="truncate text-sm text-pencil">{current.email}</p>}
      <div className={compact ? 'flex shrink-0 gap-3' : 'mt-2 flex flex-wrap gap-x-4 gap-y-1'}>
        {current.isGuest ? (
          <button type="button" onClick={createAccount} className={linkClass}>
            Create account
          </button>
        ) : null}
        <button type="button" onClick={signOut} className={linkClass}>
          {current.isGuest ? 'Leave' : 'Log out'}
        </button>
      </div>
    </div>
  );
}

// ---------- Header ----------

/** Page title, with the same icon the page has in the navigation. */
/** The "Social Study" wordmark, written in marker. Used in the sidebar, the phone top bar and the welcome page. */
export function Logo({ className = '' }) {
  return <p className={`font-logo leading-none tracking-wide text-ink ${className}`.trim()}>Social Study</p>;
}

export function Header({ title, icon, children }) {
  return (
    <header className="mb-8">
      <h1 className="flex items-center gap-3 text-2xl md:text-3xl">
        {icon ? (
          <Icon name={icon} className="hidden h-8 w-8 text-[color:var(--page-accent,#1B2A4A)] sm:block" />
        ) : null}
        {title}
      </h1>
      {children ? <div className="mt-2 text-pencil">{children}</div> : null}
    </header>
  );
}

// ---------- MainLayout ----------

export function MainLayout() {
  const { pathname } = useLocation();
  const colors = pageColorsFor(pathname);

  return (
    <div className="min-h-screen md:flex" style={pageColorVars(colors)}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-30 focus:bg-paper focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      {/* Phones: the bottom bar has no room for the account, so it sits in a slim top bar. */}
      <header className="flex items-center justify-between gap-4 border-b border-rule px-4 py-2.5 sm:px-6 md:hidden">
        <Logo className="shrink-0 text-xl" />
        <AccountBox compact={true} />
      </header>
      <Sidebar />
      <main id="main" className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-6 md:px-10 md:pb-16 md:pt-12">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

// ---------- Sidebar ----------

const LINKS = [
  { to: '/', label: 'Dashboard', short: 'Home', icon: 'home', end: true, colors: PAGE_COLORS.dashboard },
  { to: '/courses', label: 'Courses', short: 'Courses', icon: 'book', colors: PAGE_COLORS.courses },
  { to: '/focus', label: 'Focus Studio', short: 'Focus', icon: 'timer', colors: PAGE_COLORS.focus },
  { to: '/together', label: 'Study Together', short: 'Together', icon: 'users', colors: PAGE_COLORS.together },
  { to: '/progress', label: 'My Progress', short: 'Progress', icon: 'chart', colors: PAGE_COLORS.progress },
];

const DEFAULT_TITLE = 'Social Study Platform';

/** While a session runs, the time left follows you to every page and into the tab title. */
function RunningClock({ focus }) {
  const now = useNow(1000);
  const left = timeLeft(focus, now);
  const clock = formatClock(left || 0);
  const label = focus.phase === 'break' ? 'break' : 'focus';

  useEffect(() => {
    document.title = `${clock} ${label} left | ${DEFAULT_TITLE}`;
  }, [clock, label]);
  useEffect(
    () => () => {
      document.title = DEFAULT_TITLE;
    },
    []
  );

  return (
    <span className="ml-2 text-sm tabular text-pencil">
      <span className="sr-only">{`${label} time left: `}</span>
      {focus.status === 'paused' ? `${clock} paused` : clock}
    </span>
  );
}

// A left rail on wide screens, a bottom bar on phones. The current page is highlighted.
export function Sidebar() {
  const { focus } = useStudy();
  const timerActive = focus.status !== 'idle';

  return (
    <nav
      aria-label="Main"
      className={
        'fixed inset-x-0 bottom-0 z-20 border-t border-rule bg-paper pb-[env(safe-area-inset-bottom)] ' +
        'md:sticky md:top-0 md:flex md:h-screen md:w-56 md:shrink-0 md:flex-col md:border-r md:border-t-0 md:px-6 md:py-8'
      }
    >
      <Logo className="mb-10 hidden text-[2rem] md:block" />
      <ul className="flex justify-around md:flex-col md:justify-start md:gap-1.5">
        {LINKS.map((link) => (
          <li key={link.to}>
            <NavLink
              to={link.to}
              end={link.end}
              /* Every link wears its page's colour: a coloured icon always, and on the current page a
                 tinted tab (wide screens) or a coloured pill behind the icon (phones). */
              style={{ '--link-wash': link.colors.wash, '--hl-color': link.colors.hl }}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-1 py-2 text-xs md:-mx-3 md:flex-row md:gap-3 md:rounded-lg md:px-3 md:py-2 md:text-base ${isActive ? 'font-bold md:bg-[color:var(--link-wash)]' : 'text-ink/80 hover:text-ink md:hover:bg-white'}`
              }
            >
              {({ isActive }) => [
                <span
                  key="icon"
                  className={`rounded-full px-3 py-0.5 md:p-0 ${isActive ? 'bg-[color:var(--hl-color)] md:bg-transparent' : ''}`}
                  style={isActive ? undefined : { color: link.colors.accent }}
                >
                  <Icon name={link.icon} className="h-6 w-6 md:h-5 md:w-5" />
                </span>,
                <span key="label" className="min-w-0">
                  <span className="md:hidden">{link.short}</span>
                  <span className={`hidden md:inline ${isActive ? 'hl' : ''}`}>{link.label}</span>
                  {link.to === '/focus' && timerActive ? (
                    <span className="hidden md:inline">
                      <RunningClock focus={focus} />
                    </span>
                  ) : null}
                </span>,
              ]}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="mt-auto hidden md:block">
        <AccountBox />
      </div>
    </nav>
  );
}

