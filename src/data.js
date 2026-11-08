import { addDays, toKey } from './utils';

// ---------- mockData ----------

// Bump when the saved data shape changes, and teach migrateData how to upgrade older saves.
export const DATA_VERSION = 6;

export const COURSE_COLORS = ['blue', 'green', 'orange', 'pink'];

export const USER_ID = 'u-me';

export const IDLE_FOCUS = {
  status: 'idle', // idle | running | paused
  phase: 'focus', // focus | break
  courseId: null,
  goal: '',
  taskId: null,
  startedAt: null,
  endsAt: null,
  durationMs: null,
  remainingMs: null,
  lastFinished: null,
};

export const IDLE_ROOM_TIMER = { status: 'idle', phase: 'focus', endsAt: null, remainingMs: null, focusMinutes: 25, breakMinutes: 5 };

function createGroups() {
  return [
    {
      id: 'g-orgo',
      name: 'Orgo study circle',
      description: 'Problem sets and mechanism drills before the CHEM 241 midterm.',
      meets: 'Tuesdays at 18:00',
      isPublic: true,
      memberIds: ['f-1', 'f-2'],
    },
    {
      id: 'g-algo',
      name: 'Algorithms night',
      description: 'We pick one LeetCode-style problem and solve it on the whiteboard together.',
      meets: 'Thursdays at 19:30',
      isPublic: true,
      memberIds: ['f-3'],
    },
    {
      id: 'g-hist',
      name: 'HIST 115 essay group',
      description: 'Swap drafts and give feedback before each essay deadline.',
      meets: 'Sundays at 15:00',
      isPublic: true,
      memberIds: ['f-2', 'f-3'],
    },
  ];
}

/** Example chat messages and shared notes for the example rooms. */
function roomTalk(roomId, now) {
  const ago = (minutes) => new Date(now.getTime() - minutes * 60000).toISOString();
  const message = (id, authorId, text, minutes) => ({ id, authorId, text, at: ago(minutes) });
  const note = (id, authorId, text, minutes) => ({ id, authorId, savedBy: authorId, text, at: ago(minutes), fromMessageId: null });
  const talk = {
    'r-library': {
      messages: [
        message('m-lib-1', 'f-1', 'Starting the stereochemistry chapter now. Anyone else on it?', 22),
        message('m-lib-2', 'f-2', 'Same! The R and S rules finally make sense after the lecture.', 19),
      ],
      notes: [note('n-lib-1', 'f-1', 'The exam covers chapters 3 to 5. Bring a calculator.', 60 * 24)],
    },
    'r-cs': {
      messages: [message('m-cs-1', 'f-3', 'Lab 5 is due Friday. Shall we split the hash table part?', 40)],
      notes: [note('n-cs-1', 'f-3', 'Use separate chaining, not open addressing (lab sheet, page 2).', 45)],
    },
    'r-midterm': {
      messages: [],
      notes: [note('n-mid-1', 'f-1', 'Review sheet: mechanisms 1 to 12. Skip 7, it is not on the exam.', 60 * 5)],
    },
  };
  return talk[roomId] || { messages: [], notes: [] };
}

/** Canned replies the example friends send in room chats, so the chat feels live without a server. */
export const ROOM_REPLIES = {
  question: [
    'Good question. I think it was in last week’s slides.',
    'Not sure, let’s look at it together in the break.',
    'I had the same question, I’ll check my notes.',
  ],
  other: ['Nice, keep going!', 'Thanks, that helps.', 'Same here. Back to focus mode.', 'Good point, I’ll add that to my notes.'],
};

function createRooms(now) {
  return [
    {
      id: 'r-library',
      ...roomTalk('r-library', now),
      name: 'Quiet library',
      privacy: 'public',
      code: null,
      hostId: 'f-1',
      participantIds: ['f-1', 'f-2'],
      joinedAt: null,
      goal: { text: 'Four focus rounds before dinner', targetRounds: 4, rounds: 1 },
      timer: { ...IDLE_ROOM_TIMER, status: 'running', endsAt: now.getTime() + 14 * 60000 },
    },
    {
      id: 'r-cs',
      ...roomTalk('r-cs', now),
      name: 'CS 220 lab prep',
      privacy: 'public',
      code: null,
      hostId: 'f-3',
      participantIds: ['f-3'],
      joinedAt: null,
      goal: { text: 'Finish Lab 5 together', targetRounds: 3, rounds: 0 },
      timer: { ...IDLE_ROOM_TIMER },
    },
    {
      id: 'r-midterm',
      ...roomTalk('r-midterm', now),
      name: 'Midterm cram',
      privacy: 'private',
      code: 'ORGO24',
      hostId: 'f-1',
      participantIds: ['f-1', 'f-3'],
      joinedAt: null,
      goal: { text: 'Cover every mechanism on the review sheet', targetRounds: 6, rounds: 2 },
      timer: { ...IDLE_ROOM_TIMER, phase: 'break', status: 'running', breakMinutes: 5, endsAt: now.getTime() + 3 * 60000 },
    },
  ];
}

/** Everything the student owns. Saved to localStorage. */
export function createInitialData(now = new Date()) {
  return {
    version: DATA_VERSION,
    user: { id: USER_ID, name: 'Sara' },
    settings: { focusMinutes: 25, breakMinutes: 5 },
    focus: IDLE_FOCUS,
    // Your own data starts empty: you add your courses, tasks and deadlines.
    courses: [],
    tasks: [],
    assignments: [],
    sessions: [],
    friendIds: FRIEND_IDS,
    groups: createGroups(),
    rooms: createRooms(now),
  };
}

export const FRIEND_ACTIVITIES = [
  'Organic Chemistry',
  'Thermodynamics',
  'Data Structures',
  'Microeconomics',
  'Linear Algebra',
  'Cell Biology',
];

/**
 * Other students on the platform. This stands in for a server: it is not saved
 * locally, and `weekMinutes` is the total before any live studying is added.
 */
export const PEOPLE = [
  { id: 'f-1', name: 'Friend 1', program: 'Chemistry', weekMinutes: 420, streak: 5, courses: [{ name: 'Organic Chemistry', percent: 64 }] },
  { id: 'f-2', name: 'Friend 2', program: 'Engineering', weekMinutes: 310, streak: 2, courses: [{ name: 'Thermodynamics', percent: 48 }] },
  { id: 'f-3', name: 'Friend 3', program: 'Computer Science', weekMinutes: 255, streak: 3, courses: [{ name: 'Data Structures', percent: 52 }] },
];

/** Your friends to start with: everyone above. */
export const FRIEND_IDS = PEOPLE.map((p) => p.id);

/** Who is online or studying right now. Simulated, so also not saved. */
export function createMockPresence(now = Date.now()) {
  const minutesAgo = (m) => new Date(now - m * 60000).toISOString();
  const studying = (activity, m) => ({ status: 'studying', activity, startedAt: minutesAgo(m) });
  const online = { status: 'online', activity: null, startedAt: null };
  return {
    'f-1': studying('Organic Chemistry', 34),
    'f-2': online,
    'f-3': studying('Data Structures', 12),
  };
}

// Earlier versions shipped with example courses, tasks, deadlines and history.
// Their ids are short and fixed ("c-linalg", "k-3"); anything you created has a long random id.
const SAMPLE_COURSE_IDS = ['c-linalg', 'c-orgchem', 'c-history', 'c-dsa'];
const isSampleId = (id, prefix) => new RegExp(`^${prefix}-[a-z0-9]{1,8}(-[a-z0-9]{1,3})?$`).test(id);

/** Upgrades older saves to the current version, one step at a time, keeping everything you entered. */
export function migrateData(data) {
  if (!data || typeof data !== 'object') return data;
  let next = data;
  if (next.version === 2) next = removeSampleData(next);
  if (next.version === 3) next = addReminders(next);
  if (next.version === 4) next = switchToThreeFriends(next);
  if (next.version === 5) next = addRoomTalk(next);
  return next;
}

// v5 -> v6: study rooms get a chat and shared notes. Example rooms get their example messages.
function addRoomTalk(data) {
  const now = new Date();
  return {
    ...data,
    version: 6,
    rooms: (data.rooms || []).map((r) => {
      const example = roomTalk(r.id, now);
      return { ...r, messages: r.messages || example.messages, notes: r.notes || example.notes };
    }),
  };
}

// v4 -> v5: the example people are replaced by Friend 1, 2 and 3.
// Example rooms and groups get the new members; your own keep only people who still exist.
function switchToThreeFriends(data) {
  const known = new Set([...FRIEND_IDS, USER_ID]);
  const fresh = { groups: createGroups(), rooms: createRooms(new Date()) };
  const withMe = (ids, wasMember) => (wasMember ? [...ids, USER_ID] : ids);

  const groups = (data.groups || []).map((g) => {
    const example = fresh.groups.find((x) => x.id === g.id);
    const wasMember = (g.memberIds || []).includes(USER_ID);
    if (example) return { ...g, memberIds: withMe(example.memberIds, wasMember) };
    return { ...g, memberIds: (g.memberIds || []).filter((id) => known.has(id)) };
  });

  const rooms = (data.rooms || [])
    .map((r) => {
      const example = fresh.rooms.find((x) => x.id === r.id);
      const wasIn = (r.participantIds || []).includes(USER_ID);
      const participantIds = example ? withMe(example.participantIds, wasIn) : (r.participantIds || []).filter((id) => known.has(id));
      const hostId = known.has(r.hostId) && participantIds.includes(r.hostId) ? r.hostId : participantIds[0] || null;
      return { ...r, participantIds, hostId };
    })
    .filter((r) => r.participantIds.length > 0);

  return { ...data, version: 5, friendIds: FRIEND_IDS, groups, rooms };
}

// v3 -> v4: deadlines are "homework" or "exam" and carry a reminder and an optional time.
function addReminders(data) {
  return {
    ...data,
    version: 4,
    assignments: (data.assignments || []).map((a) => {
      const type = a.type === 'exam' ? 'exam' : 'homework';
      return {
        time: null,
        remindDaysBefore: type === 'exam' ? 3 : 1,
        reminderDismissed: false,
        snoozedUntil: null,
        ...a,
        type,
      };
    }),
  };
}

// v2 -> v3: drop the example courses, tasks, deadlines and history.
function removeSampleData(data) {
  const own = (list, prefix) => (list || []).filter((item) => !isSampleId(item.id, prefix));
  return {
    ...data,
    version: 3,
    courses: (data.courses || []).filter((c) => !SAMPLE_COURSE_IDS.includes(c.id)),
    tasks: own(data.tasks, 'k'),
    assignments: own(data.assignments, 'a'),
    sessions: own(data.sessions, 's'),
    groups: (data.groups || []).map((g) => {
      if (g.id === 'g-orgo') return { ...g, memberIds: g.memberIds.filter((m) => m !== USER_ID) };
      // Groups you created before this version did not record their creator.
      if (!['g-algo', 'g-hist'].includes(g.id) && g.memberIds.includes(USER_ID)) return { ...g, createdBy: g.createdBy || USER_ID };
      return g;
    }),
  };
}

// ---------- sampleData ----------

// Example courses, tasks, deadlines and study history. Used by the tests only;
// the app itself starts empty.
const topic = (id, title, done = false) => ({ id, title, done });

const COURSES = [
  {
    id: 'c-linalg',
    name: 'Linear Algebra',
    code: 'MATH 210',
    color: 'blue',
    chapters: [
      {
        id: 'ch-linalg-1',
        title: 'Vectors and matrices',
        topics: [
          topic('t-linalg-1', 'Vector spaces', true),
          topic('t-linalg-2', 'Matrix operations', true),
          topic('t-linalg-3', 'Linear independence', true),
        ],
      },
      {
        id: 'ch-linalg-2',
        title: 'Systems of equations',
        topics: [topic('t-linalg-4', 'Gaussian elimination', true), topic('t-linalg-5', 'LU decomposition', true)],
      },
      {
        id: 'ch-linalg-3',
        title: 'Determinants',
        topics: [topic('t-linalg-6', 'Cofactor expansion', true), topic('t-linalg-7', 'Properties of determinants')],
      },
      {
        id: 'ch-linalg-4',
        title: 'Eigenvalues and eigenvectors',
        topics: [
          topic('t-linalg-8', 'Characteristic polynomial'),
          topic('t-linalg-9', 'Diagonalization'),
          topic('t-linalg-10', 'Spectral theorem'),
        ],
      },
    ],
  },
  {
    id: 'c-orgchem',
    name: 'Organic Chemistry',
    code: 'CHEM 241',
    color: 'green',
    chapters: [
      {
        id: 'ch-orgchem-1',
        title: 'Structure and bonding',
        topics: [topic('t-orgchem-1', 'Hybridization', true), topic('t-orgchem-2', 'Resonance', true)],
      },
      {
        id: 'ch-orgchem-2',
        title: 'Stereochemistry',
        topics: [topic('t-orgchem-3', 'Chirality', true), topic('t-orgchem-4', 'R and S configuration')],
      },
      {
        id: 'ch-orgchem-3',
        title: 'Substitution and elimination',
        topics: [
          topic('t-orgchem-5', 'SN1 and SN2'),
          topic('t-orgchem-6', 'E1 and E2'),
          topic('t-orgchem-7', 'Choosing a mechanism'),
        ],
      },
    ],
  },
  {
    id: 'c-history',
    name: 'Modern European History',
    code: 'HIST 115',
    color: 'orange',
    chapters: [
      {
        id: 'ch-history-1',
        title: 'Revolution and restoration',
        topics: [
          topic('t-history-1', 'The French Revolution', true),
          topic('t-history-2', 'Napoleon', true),
          topic('t-history-3', 'The Congress of Vienna', true),
        ],
      },
      {
        id: 'ch-history-2',
        title: 'The age of nationalism',
        topics: [topic('t-history-4', 'The revolutions of 1848', true), topic('t-history-5', 'Italian unification')],
      },
      {
        id: 'ch-history-3',
        title: 'Industry and empire',
        topics: [topic('t-history-6', 'The second industrial revolution'), topic('t-history-7', 'The scramble for Africa')],
      },
    ],
  },
  {
    id: 'c-dsa',
    name: 'Data Structures',
    code: 'CS 220',
    color: 'pink',
    chapters: [
      {
        id: 'ch-dsa-1',
        title: 'Linear structures',
        topics: [topic('t-dsa-1', 'Arrays and linked lists', true), topic('t-dsa-2', 'Stacks and queues', true)],
      },
      {
        id: 'ch-dsa-2',
        title: 'Hashing',
        topics: [topic('t-dsa-3', 'Hash functions', true), topic('t-dsa-4', 'Collision handling')],
      },
      {
        id: 'ch-dsa-3',
        title: 'Trees',
        topics: [
          topic('t-dsa-5', 'Binary search trees'),
          topic('t-dsa-6', 'Balanced trees'),
          topic('t-dsa-7', 'Heaps'),
        ],
      },
    ],
  },
];

// Small seeded random generator so the mock history looks the same on every first load.
function seededRandom(seed) {
  let value = seed;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createSessions(now) {
  const random = seededRandom(7);
  const courseIds = COURSES.map((c) => c.id);
  const sessions = [];

  for (let back = 60; back >= 1; back -= 1) {
    // Days 1–5 are always studied (a 6-day streak with today); day 6 is the break before it.
    if (back === 6) continue;
    if (back > 6 && random() < 0.3) continue;

    const count = 1 + Math.floor(random() * 3);
    for (let i = 0; i < count; i += 1) {
      const start = addDays(now, -back);
      start.setHours(9 + i * 3 + Math.floor(random() * 2), random() < 0.5 ? 0 : 30, 0, 0);
      sessions.push({
        id: `s-${back}-${i}`,
        courseId: courseIds[Math.floor(random() * courseIds.length)],
        date: toKey(start),
        startedAt: start.toISOString(),
        minutes: random() < 0.6 ? 25 : 50,
        goal: '',
      });
    }
  }

  const today = toKey(now);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const earlierToday = (hoursAgo) => new Date(Math.max(startOfToday, now.getTime() - hoursAgo * 3600000)).toISOString();
  sessions.push(
    { id: 's-today-1', courseId: 'c-linalg', date: today, startedAt: earlierToday(4), minutes: 50, goal: 'Characteristic polynomial exercises' },
    { id: 's-today-2', courseId: 'c-orgchem', date: today, startedAt: earlierToday(2), minutes: 50, goal: 'Stereochemistry flashcards' }
  );
  return sessions;
}

function createTasks(now) {
  const date = toKey(now);
  const task = (id, title, courseId, estimate, done = false) => ({ id, title, courseId, estimate, done, date });
  return [
    task('k-1', 'Review stereochemistry flashcards', 'c-orgchem', 25, true),
    task('k-2', 'Read chapter 7: The Congress of Vienna', 'c-history', 40, true),
    task('k-3', 'Rewrite lecture notes on characteristic polynomials', 'c-linalg', 30, true),
    task('k-4', 'Trace insertion into a hash table by hand', 'c-dsa', 20, true),
    task('k-5', 'Finish the diagonalization problem set', 'c-linalg', 50),
    task('k-6', 'Implement a hash map with chaining', 'c-dsa', 75),
    task('k-7', 'Summarise SN1 vs SN2 from the lecture', 'c-orgchem', 30),
  ];
}

function createAssignments(now) {
  const due = (days) => toKey(addDays(now, days));
  return [
    { id: 'a-1', courseId: 'c-linalg', title: 'Problem set 4: Diagonalization', type: 'homework', due: due(2) },
    { id: 'a-2', courseId: 'c-orgchem', title: 'Midterm exam', type: 'exam', due: due(4) },
    { id: 'a-3', courseId: 'c-history', title: 'Essay on the revolutions of 1848', type: 'homework', due: due(6) },
    { id: 'a-4', courseId: 'c-dsa', title: 'Lab 5: Hash tables', type: 'homework', due: due(9) },
    { id: 'a-5', courseId: 'c-linalg', title: 'Midterm exam', type: 'exam', due: due(15) },
  ];
}

export const SAMPLE_COURSES = COURSES;

/** A filled-in account: the starting data plus the examples above. */
export function createSampleData(now = new Date()) {
  return {
    ...createInitialData(now),
    courses: COURSES,
    tasks: createTasks(now),
    assignments: createAssignments(now),
    sessions: createSessions(now),
  };
}
