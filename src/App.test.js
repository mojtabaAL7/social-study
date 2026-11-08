import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, dataKeyFor, GUEST_ID, SESSION_KEY } from './context/AuthContext';
import { createSampleData } from './data';
import { addDays, fromKey, toKey } from './utils';
import { AppRoutes } from './App';

/** Renders the app at `path`. Unless told otherwise, a guest named Sara is signed in. */
function renderAt(path, { signedIn = true } = {}) {
  if (signedIn && !window.localStorage.getItem(SESSION_KEY)) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ kind: 'guest', name: 'Sara' }));
  }
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>
  );
}

/** Pre-fill the guest's storage with the example data, as if they had been using the app. */
function withSampleData() {
  window.localStorage.setItem(dataKeyFor(GUEST_ID), JSON.stringify(createSampleData()));
}

const greeting = () => screen.getByRole('heading', { level: 1 });

beforeEach(() => window.localStorage.clear());

describe('getting in', () => {
  test('anyone not signed in sees the welcome page first', () => {
    renderAt('/courses', { signedIn: false });
    expect(screen.getByText('Plan your term, and study it with friends.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Log in' }).length).toBe(2); // the tab and the submit button
  });

  test('a guest is greeted with the name they typed, and it is used on the leaderboard', async () => {
    renderAt('/', { signedIn: false });
    fireEvent.change(screen.getByLabelText('Your name (optional)'), { target: { value: 'Maya' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue as guest' }));
    expect(greeting()).toHaveTextContent('Maya');
    expect(screen.getAllByText('(guest)').length).toBeGreaterThan(0);
  });

  test('a guest without a name is called Guest', () => {
    renderAt('/', { signedIn: false });
    fireEvent.click(screen.getByRole('button', { name: 'Continue as guest' }));
    expect(greeting()).toHaveTextContent('Guest');
  });

  test('creating an account signs you in with your name', async () => {
    renderAt('/', { signedIn: false });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Omar Haddad' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'omar@uni.edu' } });
    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'secret12' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Create account' }).pop());
    expect(await screen.findByRole('heading', { level: 1, name: /Omar Haddad/ })).toBeInTheDocument();
  });

  test('registration checks the fields before creating anything', () => {
    renderAt('/welcome?mode=register', { signedIn: false });
    fireEvent.click(screen.getAllByRole('button', { name: 'Create account' }).pop());
    expect(screen.getByText('Enter your name. Friends see it on the leaderboard.')).toBeInTheDocument();
    expect(screen.getByText('Use at least 6 characters.')).toBeInTheDocument();
  });

  test('you can log out and back in, and a wrong password is refused', async () => {
    renderAt('/welcome?mode=register', { signedIn: false });
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Lina' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'lina@uni.edu' } });
    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'secret12' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Create account' }).pop());
    await screen.findByRole('heading', { level: 1, name: /Lina/ });

    fireEvent.click(screen.getAllByRole('button', { name: 'Log out' })[0]);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'LINA@uni.edu' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-one' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Log in' }).pop());
    expect(await screen.findByText('That password does not match this account.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret12' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Log in' }).pop());
    expect(await screen.findByRole('heading', { level: 1, name: /Lina/ })).toBeInTheDocument();
  });

  test('each person has their own data', async () => {
    withSampleData();
    renderAt('/');
    expect(screen.getAllByText('Finish the diagonalization problem set').length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: 'Create account' })[0]);
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Noor' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'noor@uni.edu' } });
    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'secret12' } });
    fireEvent.click(screen.getByLabelText(/Bring over/)); // untick: start fresh
    fireEvent.click(screen.getAllByRole('button', { name: 'Create account' }).pop());
    await screen.findByRole('heading', { level: 1, name: /Noor/ });
    expect(screen.queryByText('Finish the diagonalization problem set')).not.toBeInTheDocument();
    expect(screen.getByText('Start by adding your courses.')).toBeInTheDocument();
  });

  test('a guest can bring their work into a new account', async () => {
    withSampleData();
    renderAt('/');
    fireEvent.click(screen.getAllByRole('button', { name: 'Create account' })[0]);
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Sara K' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'sara@uni.edu' } });
    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'secret12' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Create account' }).pop());
    await screen.findByRole('heading', { level: 1, name: /Sara K/ });
    expect(screen.getAllByText('Finish the diagonalization problem set').length).toBeGreaterThan(0);
  });
});

describe('a new account', () => {
  test('starts with no courses, tasks or study time', () => {
    renderAt('/');
    expect(screen.getByText('Start by adding your courses.')).toBeInTheDocument();
    expect(screen.getByText('Nothing planned for today. Write your first task on the line below.')).toBeInTheDocument();
    expect(screen.getByText('0 of 0')).toBeInTheDocument();
    expect(screen.queryByText('Linear Algebra')).not.toBeInTheDocument();
  });

  test.each([
    ['/courses', 'Courses'],
    ['/focus', 'Focus Studio'],
    ['/together', 'Study Together'],
    ['/progress', 'My Progress'],
  ])('%s renders while empty', (path, heading) => {
    renderAt(path);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(heading);
  });

  test('a task added by mistake can be deleted', () => {
    renderAt('/');
    fireEvent.change(screen.getByLabelText('New task'), { target: { value: 'Wrong task' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }));
    expect(screen.getAllByText('Wrong task').length).toBeGreaterThan(0);

    const remove = screen.getByRole('button', { name: 'Delete task: Wrong task' });
    fireEvent.click(remove);
    expect(screen.getAllByText('Wrong task').length).toBeGreaterThan(0); // first click only asks
    fireEvent.click(screen.getByRole('button', { name: /Delete task\? Delete task: Wrong task/ }));
    expect(screen.queryByText('Wrong task')).not.toBeInTheDocument();
    expect(screen.getByText('0 of 0')).toBeInTheDocument();
  });

  test('an exam added on the dashboard shows a reminder that can be dismissed', () => {
    renderAt('/');
    expect(screen.queryByText(/^Reminder/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Add homework or exam'));
    fireEvent.click(screen.getByText('Exam'));
    fireEvent.change(screen.getByLabelText('Exam', { selector: 'input' }), { target: { value: 'Statistics final' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: toKey(addDays(new Date(), 2)) } });
    fireEvent.click(screen.getByText('Add exam'));

    expect(screen.getByText('Reminder')).toBeInTheDocument();
    expect(screen.getByText('is in 2 days')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Dismiss'));
    expect(screen.queryByText('Reminder')).not.toBeInTheDocument();
    expect(screen.getAllByText('Statistics final').length).toBeGreaterThan(0); // still in upcoming deadlines
  });

  test('homework can be added from a day on the calendar', () => {
    renderAt('/progress');
    const day = toKey(addDays(new Date(), 5));
    const label = new RegExp(`^${fromKey(day).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`);
    // The day may fall in next month; move forward if it is not on screen.
    if (!screen.queryByRole('button', { name: label })) fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByRole('button', { name: label }));

    fireEvent.change(screen.getByLabelText('What is due'), { target: { value: 'Lab report' } });
    fireEvent.click(screen.getByText('Add homework'));
    expect(screen.getByRole('button', { name: new RegExp('Homework: Lab report') })).toBeInTheDocument();
  });
});

describe('with existing data', () => {
  beforeEach(withSampleData);

  test.each([
    ['/courses', 'Courses'],
    ['/courses/c-linalg', 'Linear Algebra'],
    ['/focus', 'Focus Studio'],
    ['/together', 'Study Together'],
    ['/together/rooms/r-library', 'Quiet library'],
    ['/progress', 'My Progress'],
  ])('%s renders', (path, heading) => {
    renderAt(path);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(heading);
  });

  test('dashboard shows the next task and today’s numbers', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sara');
    expect(screen.getAllByText('Finish the diagonalization problem set').length).toBeGreaterThan(0);
    expect(screen.getByText('1 h 40 min')).toBeInTheDocument();
    expect(screen.getByText('4 of 7')).toBeInTheDocument();
  });

  test('ticking a task updates the counts and moves "Up next" along', () => {
    renderAt('/');
    fireEvent.click(screen.getByRole('checkbox', { name: /^Finish the diagonalization problem set/ }));
    expect(screen.getByText('5 of 7')).toBeInTheDocument();
    expect(screen.getAllByText('Implement a hash map with chaining').length).toBe(2);
  });

  test('adding a task puts it on today’s list', () => {
    renderAt('/');
    fireEvent.change(screen.getByLabelText('New task'), { target: { value: 'Revise for the chemistry midterm' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }));
    expect(screen.getByText('Revise for the chemistry midterm')).toBeInTheDocument();
    expect(screen.getByText('4 of 8')).toBeInTheDocument();
  });
});

describe('study room chat and shared notes', () => {
  afterEach(() => jest.useRealTimers());

  test('members chat, friends reply, and messages can be saved to the shared notes', () => {
    jest.useFakeTimers();
    renderAt('/together/rooms/r-cs');
    const log = screen.getByRole('log');
    expect(within(log).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Join the room to chat.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Join room' }));
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Shall we start with the hash function?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(within(log).getByText('Shall we start with the hash function?')).toBeInTheDocument();

    act(() => jest.advanceTimersByTime(5000));
    expect(within(log).getAllByRole('listitem')).toHaveLength(3); // the example message, yours, and Friend 3's reply

    fireEvent.click(screen.getByRole('button', { name: 'Save to notes: Shall we start with the hash function?' }));
    expect(screen.getAllByText('Shall we start with the hash function?')).toHaveLength(2);
    expect(screen.getByText('From chat')).toBeInTheDocument();
  });

  test('members write notes that stay, and can delete their own', () => {
    renderAt('/together/rooms/r-cs');
    fireEvent.click(screen.getByRole('button', { name: 'Join room' }));
    fireEvent.change(screen.getByLabelText('New shared note'), { target: { value: 'Quiz on Friday: pages 40 to 52' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }));
    expect(screen.getByText('Quiz on Friday: pages 40 to 52')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete note: Quiz on Friday: pages 40 to 52' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete note? Delete note: Quiz on Friday: pages 40 to 52' }));
    expect(screen.queryByText('Quiz on Friday: pages 40 to 52')).not.toBeInTheDocument();
  });
});

describe('ticking off deadlines', () => {
  beforeEach(withSampleData);

  test('an exam in upcoming deadlines can be ticked done, and unticked again', () => {
    renderAt('/');
    const exam = screen.getAllByRole('checkbox', { name: 'Mark done: Midterm exam' })[0];
    expect(exam).not.toBeChecked();
    fireEvent.click(exam);

    const done = screen.getByRole('checkbox', { name: 'Done: Midterm exam' });
    expect(done).toBeChecked(); // still listed, crossed out
    fireEvent.click(done);
    expect(screen.getAllByRole('checkbox', { name: 'Mark done: Midterm exam' })[0]).not.toBeChecked();
  });

  test('clicking the title of homework also ticks it', () => {
    renderAt('/');
    fireEvent.click(screen.getByText('Problem set 4: Diagonalization', { selector: 'span' }));
    expect(screen.getByRole('checkbox', { name: 'Done: Problem set 4: Diagonalization' })).toBeChecked();
  });
});
