import { createInitialData, createSampleData, migrateData, PEOPLE, USER_ID } from '../data';
import { courseCompletion, minutesThisWeek, minutesToday } from '../utils';
import { studyReducer } from './studyReducer';

const fresh = () => createSampleData(new Date());

test('the starting data has no courses, tasks, deadlines or sessions', () => {
  const data = createInitialData();
  expect(data.courses).toEqual([]);
  expect(data.tasks).toEqual([]);
  expect(data.assignments).toEqual([]);
  expect(data.sessions).toEqual([]);
  expect(data.groups.some((g) => g.memberIds.includes(USER_ID))).toBe(false);
});

test('you start with exactly three friends: Friend 1, 2 and 3', () => {
  const data = createInitialData();
  expect(data.friendIds).toEqual(['f-1', 'f-2', 'f-3']);
  expect(PEOPLE.map((p) => p.name)).toEqual(['Friend 1', 'Friend 2', 'Friend 3']);
  const everyone = new Set([...data.friendIds, USER_ID]);
  data.groups.forEach((g) => g.memberIds.forEach((id) => expect(everyone.has(id)).toBe(true)));
  data.rooms.forEach((r) => r.participantIds.forEach((id) => expect(everyone.has(id)).toBe(true)));
});

test('upgrading replaces the old example people but keeps your own rooms and memberships', () => {
  const old = { ...createInitialData(), version: 4 };
  old.friendIds = ['f-amira', 'f-jonas'];
  old.groups = [
    { id: 'g-orgo', name: 'Orgo study circle', memberIds: ['f-amira', 'p-elif', USER_ID] },
    { id: 'g-mine-1234-5678', name: 'My group', memberIds: [USER_ID, 'f-amira'], createdBy: USER_ID },
  ];
  old.rooms = [
    { id: 'r-cs', name: 'CS 220 lab prep', hostId: 'f-tomas', participantIds: ['f-tomas', 'p-ravi'], goal: { text: 'x', targetRounds: 3, rounds: 0 }, timer: {} },
    { id: 'r-old-friends-only', name: 'Gone', hostId: 'f-mei', participantIds: ['f-mei'], goal: { text: 'x', targetRounds: 3, rounds: 0 }, timer: {} },
  ];

  const upgraded = migrateData(old);
  expect(upgraded.version).toBe(6);
  expect(upgraded.friendIds).toEqual(['f-1', 'f-2', 'f-3']);
  expect(upgraded.groups[0].memberIds).toEqual(['f-1', 'f-2', USER_ID]);
  expect(upgraded.groups[1].memberIds).toEqual([USER_ID]);
  expect(upgraded.rooms.map((r) => r.id)).toEqual(['r-cs']);
  expect(upgraded.rooms[0]).toMatchObject({ hostId: 'f-3', participantIds: ['f-3'] });
});

test('deleting a task or a session removes only that item', () => {
  const state = fresh();
  const afterTask = run(state, { type: 'task/delete', id: 'k-5' });
  expect(afterTask.tasks.map((t) => t.id)).not.toContain('k-5');
  expect(afterTask.tasks.length).toBe(state.tasks.length - 1);

  const afterSession = run(state, { type: 'session/delete', id: 's-today-1' });
  expect(afterSession.sessions.length).toBe(state.sessions.length - 1);
  expect(minutesToday(afterSession.sessions)).toBe(minutesToday(state.sessions) - 50);
});

test('only groups you created can be deleted', () => {
  let state = fresh();
  state = run(state, { type: 'group/create', group: { id: 'g-mine', name: 'Mine', memberIds: [USER_ID], createdBy: USER_ID } });
  state = run(state, { type: 'group/delete', id: 'g-mine' }, { type: 'group/delete', id: 'g-algo' });
  expect(state.groups.some((g) => g.id === 'g-mine')).toBe(false);
  expect(state.groups.some((g) => g.id === 'g-algo')).toBe(true);
});

test('upgrading an older save removes the examples but keeps what you entered', () => {
  const old = createSampleData();
  old.version = 2;
  const ownCourse = { id: 'c-1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed', name: 'Statistics', code: '', color: 'blue', chapters: [] };
  const ownTask = { id: 'k-3f2a1c9e-7b6d-4e5f-8a9b-0c1d2e3f4a5b', title: 'My task', courseId: ownCourse.id, done: false, estimate: 25, date: '2026-11-06' };
  old.courses = [...old.courses, ownCourse];
  old.tasks = [...old.tasks, ownTask];
  old.groups = old.groups.map((g) => (g.id === 'g-orgo' ? { ...g, memberIds: [...g.memberIds, USER_ID] } : g));

  const upgraded = migrateData(old);
  expect(upgraded.version).toBe(6);
  expect(upgraded.courses).toEqual([ownCourse]);
  expect(upgraded.tasks).toEqual([ownTask]);
  expect(upgraded.assignments).toEqual([]);
  expect(upgraded.sessions).toEqual([]);
  expect(upgraded.groups.find((g) => g.id === 'g-orgo').memberIds).not.toContain(USER_ID);
});
const run = (state, ...actions) => actions.reduce(studyReducer, state);

test('a finished focus session is saved with its course and starts the break', () => {
  const start = Date.now();
  let state = run(fresh(), { type: 'focus/configure', changes: { courseId: 'c-dsa', goal: 'Hash maps' } }, { type: 'focus/start', now: start });
  const before = minutesToday(state.sessions);

  state = run(state, { type: 'focus/complete', now: start + 25 * 60000 });
  const saved = state.sessions[state.sessions.length - 1];
  expect(saved).toMatchObject({ courseId: 'c-dsa', goal: 'Hash maps', minutes: 25 });
  expect(minutesToday(state.sessions)).toBe(before + 25);
  expect(state.focus).toMatchObject({ phase: 'break', status: 'running' });
  expect(state.focus.lastFinished.minutes).toBe(25);
});

test('the timer does not finish early, and pausing keeps the time left', () => {
  const start = Date.now();
  let state = run(fresh(), { type: 'focus/start', now: start }, { type: 'focus/complete', now: start + 1000 });
  expect(state.focus.status).toBe('running');
  state = run(state, { type: 'focus/pause', now: start + 5 * 60000 });
  expect(state.focus.remainingMs).toBe(20 * 60000);
  state = run(state, { type: 'focus/resume', now: start + 60 * 60000 });
  expect(state.focus.endsAt).toBe(start + 80 * 60000);
});

test('finishing early saves only the minutes studied; reset saves nothing', () => {
  const start = Date.now();
  const base = fresh();
  const early = run(base, { type: 'focus/start', now: start }, { type: 'focus/finishEarly', now: start + 12.5 * 60000 });
  expect(early.sessions.length).toBe(base.sessions.length + 1);
  expect(early.sessions[early.sessions.length - 1].minutes).toBe(12);

  const reset = run(base, { type: 'focus/start', now: start }, { type: 'focus/reset' });
  expect(reset.sessions.length).toBe(base.sessions.length);
});

test('completing chapters and topics updates the course percentage', () => {
  const state = fresh();
  const course = () => s.courses.find((c) => c.id === 'c-linalg');
  let s = state;
  expect(courseCompletion(course())).toBe(60);
  s = run(s, { type: 'chapter/toggle', courseId: 'c-linalg', id: 'ch-linalg-4' });
  expect(courseCompletion(course())).toBe(90);
  s = run(s, { type: 'topic/toggle', courseId: 'c-linalg', chapterId: 'ch-linalg-3', id: 't-linalg-7' });
  expect(courseCompletion(course())).toBe(100);
});

test('deleting a course removes its tasks and deadlines but keeps study history', () => {
  const state = fresh();
  const next = run(state, { type: 'course/delete', id: 'c-orgchem' });
  expect(next.courses.some((c) => c.id === 'c-orgchem')).toBe(false);
  expect(next.tasks.some((t) => t.courseId === 'c-orgchem')).toBe(false);
  expect(next.assignments.some((a) => a.courseId === 'c-orgchem')).toBe(false);
  expect(next.sessions.length).toBe(state.sessions.length);
});

test('finished rounds in a shared room count toward your week', () => {
  const now = Date.now();
  let state = fresh();
  const before = minutesThisWeek(state.sessions);
  state = run(state, { type: 'room/join', id: 'r-cs', courseId: 'c-dsa', now }, { type: 'room/timer', id: 'r-cs', command: 'start', now });
  expect(state.rooms.find((r) => r.id === 'r-cs').participantIds).toContain(USER_ID);

  state = run(state, { type: 'rooms/tick', now: now + 25 * 60000 + 1000 });
  const room = state.rooms.find((r) => r.id === 'r-cs');
  expect(room.goal.rounds).toBe(1);
  expect(room.timer.phase).toBe('break');
  expect(minutesThisWeek(state.sessions)).toBe(before + 25);
  expect(state.sessions[state.sessions.length - 1]).toMatchObject({ courseId: 'c-dsa', roomId: 'r-cs' });
});

test('you can be in one room at a time', () => {
  const now = Date.now();
  const state = run(fresh(), { type: 'room/join', id: 'r-cs', now }, { type: 'room/join', id: 'r-library', now });
  expect(state.rooms.find((r) => r.id === 'r-cs').participantIds).not.toContain(USER_ID);
  expect(state.rooms.find((r) => r.id === 'r-library').participantIds).toContain(USER_ID);
});

test('a tick with nothing to advance returns the same state', () => {
  const state = run(fresh(), { type: 'rooms/tick', now: Date.now() });
  expect(run(state, { type: 'rooms/tick', now: Date.now() })).toBe(state);
});

test('room chat keeps messages, and shared notes can be added and deleted', () => {
  let state = createInitialData();
  const message = { id: 'm-new-1234-5678', authorId: USER_ID, text: 'Which pages are on the quiz?', at: new Date().toISOString() };
  state = run(state, { type: 'room/message', id: 'r-cs', message });
  const room = () => state.rooms.find((r) => r.id === 'r-cs');
  expect(room().messages[room().messages.length - 1]).toEqual(message);

  const note = { id: 'n-new-1234-5678', authorId: USER_ID, savedBy: USER_ID, text: 'Quiz: pages 40 to 52', at: message.at, fromMessageId: null };
  state = run(state, { type: 'room/note/add', id: 'r-cs', note });
  expect(room().notes[0]).toEqual(note);
  state = run(state, { type: 'room/note/delete', id: 'r-cs', noteId: note.id });
  expect(room().notes.some((n) => n.id === note.id)).toBe(false);
});

test('upgrading gives saved rooms a chat and shared notes', () => {
  const old = { ...createInitialData(), version: 5 };
  old.rooms = old.rooms.map(({ messages, notes, ...room }) => room);
  old.rooms.push({ id: 'r-mine-1234-5678', name: 'Mine', participantIds: [USER_ID], goal: { text: 'x', targetRounds: 1, rounds: 0 }, timer: {} });
  const upgraded = migrateData(old);
  expect(upgraded.version).toBe(6);
  expect(upgraded.rooms.find((r) => r.id === 'r-library').messages.length).toBeGreaterThan(0);
  expect(upgraded.rooms.find((r) => r.id === 'r-mine-1234-5678')).toMatchObject({ messages: [], notes: [] });
});
