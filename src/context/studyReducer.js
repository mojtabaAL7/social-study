import { createInitialData, IDLE_FOCUS, USER_ID } from '../data';
import { advanceRoom, isChapterDone, toKey } from '../utils';

export function makeId(prefix) {
  const random =
    typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID
      ? window.crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}-${random}`;
}

function makeSession({ courseId, goal, startedAt, minutes, roomId = null }) {
  const start = new Date(startedAt);
  return {
    id: makeId('s'),
    courseId: courseId || null,
    goal: goal || '',
    date: toKey(start),
    startedAt: start.toISOString(),
    minutes,
    roomId,
  };
}

const without = (list, id) => list.filter((x) => x !== id);
const withItem = (list, id) => (list.includes(id) ? list : [...list, id]);

function mapCourse(state, courseId, fn) {
  return { ...state, courses: state.courses.map((c) => (c.id === courseId ? fn(c) : c)) };
}

function mapChapter(course, chapterId, fn) {
  return { ...course, chapters: course.chapters.map((ch) => (ch.id === chapterId ? fn(ch) : ch)) };
}

function mapRoom(state, roomId, fn) {
  return { ...state, rooms: state.rooms.map((r) => (r.id === roomId ? fn(r) : r)) };
}

/** Focus session that just ended: saves it to history and remembers it for the summary. */
function recordFocus(state, minutes) {
  const f = state.focus;
  if (minutes < 1) return { sessions: state.sessions, lastFinished: null };
  const session = makeSession({ courseId: f.courseId, goal: f.goal, startedAt: f.startedAt, minutes });
  return {
    sessions: [...state.sessions, session],
    lastFinished: { sessionId: session.id, taskId: f.taskId, courseId: f.courseId, goal: f.goal, minutes },
  };
}

function idleFocus(focus, lastFinished = focus.lastFinished) {
  return { ...IDLE_FOCUS, courseId: focus.courseId, goal: focus.goal, taskId: focus.taskId, lastFinished };
}

function focusReducer(state, action) {
  const f = state.focus;
  switch (action.type) {
    case 'focus/configure':
      return { ...state, focus: { ...f, ...action.changes } };

    case 'focus/start': {
      if (f.status !== 'idle') return state;
      const minutes = f.phase === 'break' ? state.settings.breakMinutes : state.settings.focusMinutes;
      const durationMs = minutes * 60000;
      return {
        ...state,
        focus: {
          ...f,
          status: 'running',
          startedAt: f.phase === 'focus' ? new Date(action.now).toISOString() : f.startedAt,
          durationMs,
          endsAt: action.now + durationMs,
          remainingMs: null,
          lastFinished: f.phase === 'focus' ? null : f.lastFinished,
        },
      };
    }

    case 'focus/pause':
      if (f.status !== 'running') return state;
      return { ...state, focus: { ...f, status: 'paused', remainingMs: Math.max(0, f.endsAt - action.now), endsAt: null } };

    case 'focus/resume':
      if (f.status !== 'paused') return state;
      return { ...state, focus: { ...f, status: 'running', endsAt: action.now + f.remainingMs, remainingMs: null } };

    case 'focus/reset':
      return { ...state, focus: idleFocus(f) };

    case 'focus/complete': {
      if (f.status !== 'running' || f.endsAt > action.now) return state;
      if (f.phase === 'break') {
        return { ...state, focus: idleFocus(f) };
      }
      const { sessions, lastFinished } = recordFocus(state, Math.round(f.durationMs / 60000));
      const breakMs = state.settings.breakMinutes * 60000;
      return {
        ...state,
        sessions,
        focus: { ...f, phase: 'break', status: 'running', durationMs: breakMs, endsAt: f.endsAt + breakMs, remainingMs: null, lastFinished },
      };
    }

    case 'focus/finishEarly': {
      if (f.phase !== 'focus' || f.status === 'idle') return state;
      const left = f.status === 'running' ? Math.max(0, f.endsAt - action.now) : f.remainingMs;
      const { sessions, lastFinished } = recordFocus(state, Math.floor((f.durationMs - left) / 60000));
      return { ...state, sessions, focus: idleFocus(f, lastFinished) };
    }

    case 'focus/skipBreak':
      return { ...state, focus: idleFocus(f) };

    case 'focus/dismiss':
      return { ...state, focus: { ...f, lastFinished: null } };

    default:
      return null;
  }
}

function courseReducer(state, action) {
  switch (action.type) {
    case 'course/add':
      return { ...state, courses: [...state.courses, action.course] };
    case 'course/update':
      return mapCourse(state, action.id, (c) => ({ ...c, ...action.changes }));
    case 'course/delete':
      return {
        ...state,
        courses: state.courses.filter((c) => c.id !== action.id),
        tasks: state.tasks.filter((t) => t.courseId !== action.id),
        assignments: state.assignments.filter((a) => a.courseId !== action.id),
        focus: state.focus.courseId === action.id ? { ...state.focus, courseId: null } : state.focus,
      };

    case 'chapter/add':
      return mapCourse(state, action.courseId, (c) => ({
        ...c,
        chapters: [...c.chapters, { id: action.id, title: action.title, done: false, topics: [] }],
      }));
    case 'chapter/delete':
      return mapCourse(state, action.courseId, (c) => ({ ...c, chapters: c.chapters.filter((ch) => ch.id !== action.id) }));
    case 'chapter/toggle':
      return mapCourse(state, action.courseId, (c) =>
        mapChapter(c, action.id, (ch) => {
          const done = !isChapterDone(ch);
          return { ...ch, done, topics: ch.topics.map((t) => ({ ...t, done })) };
        })
      );

    case 'topic/add':
      return mapCourse(state, action.courseId, (c) =>
        mapChapter(c, action.chapterId, (ch) => ({ ...ch, topics: [...ch.topics, { id: action.id, title: action.title, done: false }] }))
      );
    case 'topic/delete':
      return mapCourse(state, action.courseId, (c) =>
        mapChapter(c, action.chapterId, (ch) => ({ ...ch, topics: ch.topics.filter((t) => t.id !== action.id) }))
      );
    case 'topic/toggle':
      return mapCourse(state, action.courseId, (c) =>
        mapChapter(c, action.chapterId, (ch) => ({
          ...ch,
          topics: ch.topics.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t)),
        }))
      );

    case 'assignment/add':
      return { ...state, assignments: [...state.assignments, action.assignment] };
    case 'assignment/update':
      return { ...state, assignments: state.assignments.map((a) => (a.id === action.id ? { ...a, ...action.changes } : a)) };
    case 'assignment/delete':
      return { ...state, assignments: state.assignments.filter((a) => a.id !== action.id) };
    case 'assignment/toggle':
      return { ...state, assignments: state.assignments.map((a) => (a.id === action.id ? { ...a, done: !a.done } : a)) };

    default:
      return null;
  }
}

function socialReducer(state, action) {
  switch (action.type) {
    case 'friend/add':
      return { ...state, friendIds: withItem(state.friendIds, action.id) };
    case 'friend/remove':
      return { ...state, friendIds: without(state.friendIds, action.id) };

    case 'group/create':
      return { ...state, groups: [...state.groups, action.group] };
    case 'group/delete':
      // Only groups you created can be deleted.
      return { ...state, groups: state.groups.filter((g) => !(g.id === action.id && g.createdBy === USER_ID)) };
    case 'group/join':
      return { ...state, groups: state.groups.map((g) => (g.id === action.id ? { ...g, memberIds: withItem(g.memberIds, USER_ID) } : g)) };
    case 'group/leave':
      return { ...state, groups: state.groups.map((g) => (g.id === action.id ? { ...g, memberIds: without(g.memberIds, USER_ID) } : g)) };

    case 'room/create':
      return { ...state, rooms: [...state.rooms.map(leaveRoom), action.room] };
    case 'room/join':
      // One room at a time: joining a room leaves any other.
      return {
        ...state,
        rooms: state.rooms.map((r) =>
          r.id === action.id
            ? { ...r, participantIds: withItem(r.participantIds, USER_ID), joinedAt: action.now, myCourseId: action.courseId || null }
            : leaveRoom(r)
        ),
      };
    case 'room/leave': {
      const rooms = state.rooms.map((r) => (r.id === action.id ? leaveRoom(r) : r)).filter((r) => r.participantIds.length > 0);
      return { ...state, rooms };
    }
    case 'room/course':
      return mapRoom(state, action.id, (r) => ({ ...r, myCourseId: action.courseId || null }));
    // Room chat keeps the latest 200 messages; shared notes stay until someone deletes them.
    case 'room/message':
      return mapRoom(state, action.id, (r) => ({ ...r, messages: [...(r.messages || []), action.message].slice(-200) }));
    case 'room/note/add':
      return mapRoom(state, action.id, (r) => ({ ...r, notes: [action.note, ...(r.notes || [])] }));
    case 'room/note/delete':
      return mapRoom(state, action.id, (r) => ({ ...r, notes: (r.notes || []).filter((n) => n.id !== action.noteId) }));
    case 'room/goal':
      return mapRoom(state, action.id, (r) => ({ ...r, goal: { ...r.goal, ...action.changes } }));
    case 'room/timer':
      return mapRoom(state, action.id, (r) => ({ ...r, timer: roomTimerCommand(r.timer, action.command, action.now) }));

    case 'rooms/tick': {
      let sessions = state.sessions;
      let changed = false;
      const rooms = state.rooms.map((room) => {
        const { room: next, finishedRounds } = advanceRoom(room, action.now);
        if (next !== room) changed = true;
        if (room.participantIds.includes(USER_ID) && room.joinedAt) {
          finishedRounds.forEach((endedAt) => {
            const roundStart = endedAt - room.timer.focusMinutes * 60000;
            const start = Math.max(roundStart, room.joinedAt);
            const minutes = Math.round((endedAt - start) / 60000);
            if (minutes >= 1) {
              sessions = [
                ...sessions,
                makeSession({ courseId: room.myCourseId, goal: room.goal.text, startedAt: start, minutes, roomId: room.id }),
              ];
            }
          });
        }
        return next;
      });
      return changed ? { ...state, rooms, sessions } : state;
    }

    default:
      return null;
  }
}

function leaveRoom(room) {
  if (!room.participantIds.includes(USER_ID)) return room;
  const participantIds = without(room.participantIds, USER_ID);
  return {
    ...room,
    participantIds,
    hostId: room.hostId === USER_ID ? participantIds[0] || null : room.hostId,
    joinedAt: null,
    myCourseId: null,
  };
}

function roomTimerCommand(timer, command, now) {
  switch (command) {
    case 'start': {
      const minutes = timer.phase === 'break' ? timer.breakMinutes : timer.focusMinutes;
      return { ...timer, status: 'running', endsAt: now + minutes * 60000, remainingMs: null };
    }
    case 'pause':
      return timer.status === 'running' ? { ...timer, status: 'paused', remainingMs: Math.max(0, timer.endsAt - now), endsAt: null } : timer;
    case 'resume':
      return timer.status === 'paused' ? { ...timer, status: 'running', endsAt: now + timer.remainingMs, remainingMs: null } : timer;
    case 'reset':
      return { ...timer, status: 'idle', phase: 'focus', endsAt: null, remainingMs: null };
    default:
      return timer;
  }
}

// Every change to saved data goes through here, so a backend can later replace this one place.
export function studyReducer(state, action) {
  switch (action.type) {
    case 'task/toggle':
      return { ...state, tasks: state.tasks.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t)) };
    case 'task/add':
      return { ...state, tasks: [...state.tasks, action.task] };
    case 'task/delete':
      return {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== action.id),
        focus: state.focus.taskId === action.id ? { ...state.focus, taskId: null } : state.focus,
      };
    case 'session/delete':
      return {
        ...state,
        sessions: state.sessions.filter((s) => s.id !== action.id),
        focus:
          state.focus.lastFinished && state.focus.lastFinished.sessionId === action.id
            ? { ...state.focus, lastFinished: null }
            : state.focus,
      };
    case 'settings/update':
      return { ...state, settings: { ...state.settings, ...action.changes } };
    case 'data/reset':
      return createInitialData();
    default:
      return focusReducer(state, action) || courseReducer(state, action) || socialReducer(state, action) || state;
  }
}
