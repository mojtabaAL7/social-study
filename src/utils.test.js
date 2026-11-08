import { createSampleData, migrateData } from './data';
import { activeReminders, addDays, dueSentence, toKey } from './utils';

const inDays = (n) => toKey(addDays(new Date(), n));
const deadline = (overrides) => ({
  id: 'a-x',
  title: 'Midterm',
  type: 'exam',
  courseId: null,
  due: inDays(3),
  time: null,
  remindDaysBefore: 3,
  reminderDismissed: false,
  snoozedUntil: null,
  done: false,
  ...overrides,
});

test('a reminder starts on its day and stays until the deadline is done or dismissed', () => {
  expect(activeReminders([deadline({ due: inDays(4) })])).toHaveLength(0);
  expect(activeReminders([deadline({ due: inDays(3) })])).toHaveLength(1);
  expect(activeReminders([deadline({ due: inDays(0) })])).toHaveLength(1);
  expect(activeReminders([deadline({ due: inDays(-2) })])[0].daysLeft).toBe(-2);
  expect(activeReminders([deadline({ due: inDays(-8) })])).toHaveLength(0);
  expect(activeReminders([deadline({ done: true })])).toHaveLength(0);
  expect(activeReminders([deadline({ reminderDismissed: true })])).toHaveLength(0);
  expect(activeReminders([deadline({ remindDaysBefore: null })])).toHaveLength(0);
});

test('a snoozed reminder comes back the next day', () => {
  expect(activeReminders([deadline({ snoozedUntil: inDays(1) })])).toHaveLength(0);
  expect(activeReminders([deadline({ snoozedUntil: inDays(0) })])).toHaveLength(1);
});

test('reminders are sorted by date, then time', () => {
  const list = activeReminders([
    deadline({ id: 'b', due: inDays(2), time: '14:00' }),
    deadline({ id: 'a', due: inDays(2), time: '09:00' }),
    deadline({ id: 'c', due: inDays(1) }),
  ]);
  expect(list.map((d) => d.id)).toEqual(['c', 'a', 'b']);
});

test('the sentence reads naturally for exams and homework', () => {
  expect(dueSentence({ type: 'exam' }, 3)).toBe('is in 3 days');
  expect(dueSentence({ type: 'homework' }, 1)).toBe('is due tomorrow');
  expect(dueSentence({ type: 'homework' }, 0)).toBe('is due today');
  expect(dueSentence({ type: 'exam' }, -1)).toBe('was on yesterday');
});

test('older saved deadlines get a type, a reminder and room for a time', () => {
  const old = { ...createSampleData(), version: 3 };
  old.assignments = [
    { id: 'a-1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed', courseId: null, title: 'Essay', type: 'assignment', due: inDays(5), done: false },
    { id: 'a-2c8e7f6a-1b2c-4d3e-8f9a-0b1c2d3e4f5a', courseId: null, title: 'Final', type: 'exam', due: inDays(9), done: false },
  ];
  const upgraded = migrateData(old);
  expect(upgraded.version).toBe(6);
  expect(upgraded.assignments[0]).toMatchObject({ type: 'homework', remindDaysBefore: 1, time: null, reminderDismissed: false });
  expect(upgraded.assignments[1]).toMatchObject({ type: 'exam', remindDaysBefore: 3 });
});
