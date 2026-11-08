import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePersistentReducer } from '../hooks';
import { createInitialData, createMockPresence, DATA_VERSION, FRIEND_ACTIVITIES, migrateData, PEOPLE, ROOM_REPLIES, USER_ID } from '../data';
import { defaultReminder, tomorrowKey } from '../utils';
import { dataKeyFor } from './AuthContext';
import { makeId, studyReducer } from './studyReducer';

const LEGACY_STORAGE_KEY = 'social-study:data';
const PRESENCE_UPDATE_MS = 45000;
const ROOM_TICK_MS = 5000;

const StudyContext = createContext(null);

export { makeId };

const isCurrentVersion = (data) => Boolean(data && data.version === DATA_VERSION);

// Simulated real time: every so often one person starts or stops studying.
function useSimulatedPresence() {
  const [presence, setPresence] = useState(() => createMockPresence());

  useEffect(() => {
    const id = setInterval(() => {
      setPresence((current) => {
        const active = Object.keys(current).filter((pid) => current[pid].status !== 'offline');
        if (!active.length) return current;
        const pick = active[Math.floor(Math.random() * active.length)];
        const next =
          current[pick].status === 'studying'
            ? { status: 'online', activity: null, startedAt: null }
            : {
                status: 'studying',
                activity: FRIEND_ACTIVITIES[Math.floor(Math.random() * FRIEND_ACTIVITIES.length)],
                startedAt: new Date().toISOString(),
              };
        return { ...current, [pick]: next };
      });
    }, PRESENCE_UPDATE_MS);
    return () => clearInterval(id);
  }, []);

  return presence;
}

function playChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.55);
    });
  } catch (error) {
    // Sound is a nicety; ignore failures.
  }
}

/**
 * Holds one person's study data. `account` is who is signed in; each account (and the guest)
 * has its own saved copy. Render with key={account.id} so switching people starts fresh.
 */
export function StudyProvider({ account, children }) {
  const storageKey = account ? dataKeyFor(account.id) : LEGACY_STORAGE_KEY;
  const [data, dispatch] = usePersistentReducer(studyReducer, storageKey, createInitialData, isCurrentVersion, migrateData);
  const presence = useSimulatedPresence();
  const { status: focusStatus, endsAt: focusEndsAt } = data.focus;

  // Finish the focus/break phase when its time is up (also catches up after a reload).
  useEffect(() => {
    if (focusStatus !== 'running') return undefined;
    const id = setTimeout(
      () => {
        playChime();
        dispatch({ type: 'focus/complete', now: Date.now() });
      },
      Math.max(0, focusEndsAt - Date.now()) + 50
    );
    return () => clearTimeout(id);
  }, [focusStatus, focusEndsAt, dispatch]);

  // Shared room timers keep running for everyone in the room.
  useEffect(() => {
    dispatch({ type: 'rooms/tick', now: Date.now() });
    const id = setInterval(() => dispatch({ type: 'rooms/tick', now: Date.now() }), ROOM_TICK_MS);
    return () => clearInterval(id);
  }, [dispatch]);

  // Pending simulated chat replies; cleared if this person signs out before they arrive.
  const replyTimers = useRef(new Set());
  useEffect(() => {
    const timers = replyTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const actions = useMemo(() => {
    const now = () => Date.now();
    return {
      // Tasks
      toggleTask: (id) => dispatch({ type: 'task/toggle', id }),
      addTask: (task) => dispatch({ type: 'task/add', task: { id: makeId('k'), done: false, estimate: 25, ...task } }),
      deleteTask: (id) => dispatch({ type: 'task/delete', id }),
      deleteSession: (id) => dispatch({ type: 'session/delete', id }),

      // Courses
      addCourse: (course) => {
        const id = makeId('c');
        dispatch({ type: 'course/add', course: { id, chapters: [], ...course } });
        return id;
      },
      updateCourse: (id, changes) => dispatch({ type: 'course/update', id, changes }),
      deleteCourse: (id) => dispatch({ type: 'course/delete', id }),
      addChapter: (courseId, title) => dispatch({ type: 'chapter/add', courseId, id: makeId('ch'), title }),
      deleteChapter: (courseId, id) => dispatch({ type: 'chapter/delete', courseId, id }),
      toggleChapter: (courseId, id) => dispatch({ type: 'chapter/toggle', courseId, id }),
      addTopic: (courseId, chapterId, title) => dispatch({ type: 'topic/add', courseId, chapterId, id: makeId('t'), title }),
      deleteTopic: (courseId, chapterId, id) => dispatch({ type: 'topic/delete', courseId, chapterId, id }),
      toggleTopic: (courseId, chapterId, id) => dispatch({ type: 'topic/toggle', courseId, chapterId, id }),
      addAssignment: (assignment) =>
        dispatch({
          type: 'assignment/add',
          assignment: {
            id: makeId('a'),
            type: 'homework',
            courseId: null,
            time: null,
            remindDaysBefore: defaultReminder(assignment.type),
            reminderDismissed: false,
            snoozedUntil: null,
            done: false,
            ...assignment,
          },
        }),
      updateAssignment: (id, changes) => dispatch({ type: 'assignment/update', id, changes }),
      snoozeReminder: (id) => dispatch({ type: 'assignment/update', id, changes: { snoozedUntil: tomorrowKey() } }),
      dismissReminder: (id) => dispatch({ type: 'assignment/update', id, changes: { reminderDismissed: true } }),
      deleteAssignment: (id) => dispatch({ type: 'assignment/delete', id }),
      toggleAssignment: (id) => dispatch({ type: 'assignment/toggle', id }),

      // Focus
      updateSettings: (changes) => dispatch({ type: 'settings/update', changes }),
      configureFocus: (changes) => dispatch({ type: 'focus/configure', changes }),
      startFocus: () => dispatch({ type: 'focus/start', now: now() }),
      pauseFocus: () => dispatch({ type: 'focus/pause', now: now() }),
      resumeFocus: () => dispatch({ type: 'focus/resume', now: now() }),
      resetFocus: () => dispatch({ type: 'focus/reset' }),
      finishFocusEarly: () => dispatch({ type: 'focus/finishEarly', now: now() }),
      skipBreak: () => dispatch({ type: 'focus/skipBreak' }),
      dismissSummary: () => dispatch({ type: 'focus/dismiss' }),

      // Social
      addFriend: (id) => dispatch({ type: 'friend/add', id }),
      removeFriend: (id) => dispatch({ type: 'friend/remove', id }),
      createGroup: (group) => {
        const id = makeId('g');
        dispatch({ type: 'group/create', group: { id, memberIds: [USER_ID], createdBy: USER_ID, ...group } });
        return id;
      },
      deleteGroup: (id) => dispatch({ type: 'group/delete', id }),
      joinGroup: (id) => dispatch({ type: 'group/join', id }),
      leaveGroup: (id) => dispatch({ type: 'group/leave', id }),
      createRoom: ({ name, privacy, goalText, targetRounds, focusMinutes, breakMinutes, courseId }) => {
        const id = makeId('r');
        dispatch({
          type: 'room/create',
          room: {
            id,
            name,
            privacy,
            code: privacy === 'private' ? Math.random().toString(36).slice(2, 8).toUpperCase() : null,
            hostId: USER_ID,
            participantIds: [USER_ID],
            joinedAt: now(),
            myCourseId: courseId || null,
            goal: { text: goalText, targetRounds, rounds: 0 },
            timer: { status: 'idle', phase: 'focus', endsAt: null, remainingMs: null, focusMinutes, breakMinutes },
            messages: [],
            notes: [],
          },
        });
        return id;
      },
      joinRoom: (id, courseId) => dispatch({ type: 'room/join', id, courseId, now: now() }),
      leaveRoom: (id) => dispatch({ type: 'room/leave', id }),
      setRoomCourse: (id, courseId) => dispatch({ type: 'room/course', id, courseId }),
      updateRoomGoal: (id, changes) => dispatch({ type: 'room/goal', id, changes }),
      roomTimer: (id, command) => dispatch({ type: 'room/timer', id, command, now: now() }),

      // Room chat and shared notes
      sendRoomMessage: (room, text) => {
        dispatch({ type: 'room/message', id: room.id, message: { id: makeId('m'), authorId: USER_ID, text, at: new Date().toISOString() } });
        // Simulated real time: someone else in the room answers a few seconds later.
        const others = room.participantIds.filter((pid) => pid !== USER_ID);
        if (!others.length) return;
        const pool = text.trim().endsWith('?') ? ROOM_REPLIES.question : ROOM_REPLIES.other;
        const reply = {
          id: makeId('m'),
          authorId: others[Math.floor(Math.random() * others.length)],
          text: pool[Math.floor(Math.random() * pool.length)],
        };
        const timer = setTimeout(() => {
          replyTimers.current.delete(timer);
          dispatch({ type: 'room/message', id: room.id, message: { ...reply, at: new Date().toISOString() } });
        }, 2000 + Math.random() * 2500);
        replyTimers.current.add(timer);
      },
      addRoomNote: (roomId, { text, authorId = USER_ID, fromMessageId = null }) =>
        dispatch({
          type: 'room/note/add',
          id: roomId,
          note: { id: makeId('n'), authorId, savedBy: USER_ID, text, at: new Date().toISOString(), fromMessageId },
        }),
      deleteRoomNote: (roomId, noteId) => dispatch({ type: 'room/note/delete', id: roomId, noteId }),

      resetData: () => dispatch({ type: 'data/reset' }),
    };
  }, [dispatch]);

  // People joined with their live presence. Friends are the subset the user added.
  const people = useMemo(
    () => PEOPLE.map((p) => ({ ...p, ...(presence[p.id] || { status: 'offline', activity: null, startedAt: null }) })),
    [presence]
  );
  const friends = useMemo(() => people.filter((p) => data.friendIds.includes(p.id)), [people, data.friendIds]);

  // The name always comes from the signed-in account (or the name the guest typed).
  const user = useMemo(
    () => ({ ...data.user, name: account ? account.name : data.user.name, isGuest: Boolean(account && account.isGuest) }),
    [data.user, account]
  );

  const value = useMemo(
    () => ({ ...data, user, userId: USER_ID, people, friends, ...actions }),
    [data, user, people, friends, actions]
  );

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
}

export function useStudy() {
  const context = useContext(StudyContext);
  if (!context) throw new Error('useStudy must be used inside StudyProvider');
  return context;
}

export default StudyContext;
