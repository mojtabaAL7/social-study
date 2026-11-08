import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStudy } from '../context/StudyContext';
import { useNow } from '../hooks';
import { formatClock, formatMinutes, formatShortDate, formatTime, minutesThisWeek, phaseMinutes, timeLeft, todayKey, toKey } from '../utils';
import { Avatar, AvatarStack, Badge, Button, ConfirmButton, Field, Icon, Section, StatusBadge } from './ui';

// ---------- FriendsList ----------

/** What someone is doing, as words: "Studying Organic Chemistry for 34 min", "Online", "Offline". */
export function statusText(person, now) {
  if (person.status === 'studying') {
    return `Studying ${person.activity} for ${formatMinutes((now - new Date(person.startedAt).getTime()) / 60000)}`;
  }
  return person.status === 'online' ? 'Online' : 'Offline';
}

/** A status label plus what they are studying, if anything. */
export function PersonStatus({ person, now }) {
  return (
    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-pencil">
      <StatusBadge status={person.status} />
      {person.status === 'studying' ? (
        <span>{`${person.activity}, ${formatMinutes((now - new Date(person.startedAt).getTime()) / 60000)}`}</span>
      ) : null}
    </p>
  );
}

function FriendRow({ friend, now, onRemove }) {
  const [open, setOpen] = useState(false);
  const detailsId = `friend-${friend.id}-progress`;

  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        <Avatar name={friend.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate">{friend.name}</p>
          <PersonStatus person={friend} now={now} />
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailsId}
          onClick={() => setOpen(!open)}
          className="whitespace-nowrap text-sm underline decoration-rule underline-offset-4 hover:decoration-ink"
        >
          {open ? 'Hide progress' : 'View progress'}
        </button>
      </div>
      {open ? (
        <div id={detailsId} className="ml-12 mt-3 space-y-3 border-l-2 border-rule pl-4">
          <p className="text-sm">{`${friend.program}. ${formatMinutes(liveWeekMinutes(friend, now))} this week, ${friend.streak}-day streak.`}</p>
          <ul className="space-y-2">
            {friend.courses.map((c) => (
              <li key={c.name}>
                <div className="flex justify-between text-sm">
                  <span>{c.name}</span>
                  <span className="tabular">{`${c.percent}%`}</span>
                </div>
                <div aria-hidden={true} className="mt-1 h-1.5 rounded-full bg-rule/40">
                  <div
                    className="h-full rounded-full bg-ink"
                    style={{
                      width: `${c.percent}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <ConfirmButton
            label="Remove friend"
            confirmLabel={`Click again to remove ${friend.name.split(' ')[0]}`}
            onConfirm={() => onRemove(friend.id)}
          />
        </div>
      ) : null}
    </li>
  );
}

export function FriendsList() {
  const { friends, people, friendIds, addFriend, removeFriend } = useStudy();
  const now = useNow(30000);
  const [query, setQuery] = useState('');

  const order = { studying: 0, online: 1, offline: 2 };
  const sorted = friends.slice().sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name));
  const q = query.trim().toLowerCase();
  const others = people.filter((p) => !friendIds.includes(p.id));
  const matches = others.filter((p) => !q || p.name.toLowerCase().includes(q) || p.program.toLowerCase().includes(q));

  return (
    <Section
      title="Friends"
      icon="users"
      action={
        <span className="text-sm text-pencil">{`${friends.filter((f) => f.status === 'studying').length} studying now`}</span>
      }
    >
      {sorted.length ? (
        <ul className="divide-y divide-rule/60">
          {sorted.map((f) => (
            <FriendRow key={f.id} friend={f} now={now} onRemove={removeFriend} />
          ))}
        </ul>
      ) : (
        <p className="py-3 text-pencil">No friends yet. Find classmates below and add them.</p>
      )}
      <div className="mt-6 border-t border-rule/70 pt-4">
        <h3 className="mb-2 font-sans text-base font-bold">Find classmates</h3>
        <label htmlFor="people-search" className="sr-only">
          Search by name or programme
        </label>
        <input
          id="people-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or programme"
          className="field w-full"
        />
        {matches.length ? (
          <ul className="mt-2 divide-y divide-rule/60">
            {matches.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2.5">
                <Avatar name={p.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate">{p.name}</p>
                  <p className="text-sm text-pencil">{p.program}</p>
                </div>
                <Button
                  variant="quiet"
                  className="py-1.5 text-sm"
                  onClick={() => addFriend(p.id)}
                  aria-label={`Add ${p.name} as a friend`}
                >
                  Add friend
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-pencil">
            {others.length ? `No one matches “${query}”.` : 'You are friends with everyone here.'}
          </p>
        )}
      </div>
    </Section>
  );
}

// ---------- Leaderboard ----------

/** Live weekly minutes for a person: their total so far plus any session in progress. */
export function liveWeekMinutes(person, now) {
  const running = person.status === 'studying' && person.startedAt ? (now - new Date(person.startedAt).getTime()) / 60000 : 0;
  return Math.round(person.weekMinutes + running);
}

export function Leaderboard() {
  const { friends, sessions, user, userId } = useStudy();
  const now = useNow(30000);

  const rows = [
    { id: userId, name: user.name, minutes: minutesThisWeek(sessions), isMe: true },
    ...friends.map((f) => ({ id: f.id, name: f.name, minutes: liveWeekMinutes(f, now), isMe: false })),
  ].sort((a, b) => b.minutes - a.minutes);
  const max = Math.max(1, ...rows.map((r) => r.minutes));
  const myRank = rows.findIndex((r) => r.isMe) + 1;

  return (
    <Section
      title="This week’s leaderboard"
      icon="podium"
      action={
        <span className="text-sm text-pencil">{`You are ${myRank === 1 ? 'first' : `number ${myRank} of ${rows.length}`}`}</span>
      }
    >
      <ol className="space-y-3 pt-1">
        {rows.map((row, i) => (
          <li key={row.id} className="grid grid-cols-[1.75rem_minmax(0,1fr)_6.5rem] items-baseline gap-x-3">
            <span className="font-serif text-md font-semibold tabular text-pencil">{i + 1}</span>
            <span className="min-w-0">
              <span className={`block truncate ${row.isMe ? 'font-bold' : ''}`}>
                {row.isMe ? <span className="hl">{`${row.name} (you)`}</span> : row.name}
              </span>
              <span aria-hidden={true} className="mt-1 block h-1.5 rounded-full bg-rule/40">
                <span
                  className="block h-full rounded-full bg-ink"
                  style={{
                    width: `${(row.minutes / max) * 100}%`,
                  }}
                />
              </span>
            </span>
            <span className="text-right text-sm tabular">{formatMinutes(row.minutes)}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm text-pencil">Weeks start on Monday. Your focus sessions and study room rounds count here.</p>
    </Section>
  );
}

// ---------- RoomChat ----------

const MESSAGE_MAX_LENGTH = 300;

function when(iso) {
  const key = toKey(new Date(iso));
  return key === todayKey() ? formatTime(iso) : `${formatShortDate(key)}, ${formatTime(iso)}`;
}

/**
 * The room's chat. Everyone can read it; members can write, and save any message to the
 * shared notes so the important ones don't get lost in the scroll.
 */
export function RoomChat({ room, isMember, userId, nameOf, onSend, onSaveToNotes }) {
  const [text, setText] = useState('');
  const listRef = useRef(null);
  const messages = room.messages || [];
  const savedIds = new Set((room.notes || []).map((n) => n.fromMessageId).filter(Boolean));

  // Keep the newest message in view when one arrives.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length]);

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  }

  return (
    <Section title="Chat" icon="chat">
      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-label={`Chat in ${room.name}`}
        tabIndex={0}
        className="max-h-[26rem] min-h-[8rem] overflow-y-auto pr-1"
      >
        {messages.length ? (
          <ul className="space-y-1 py-1">
            {messages.map((m) => {
              const mine = m.authorId === userId;
              return (
                <li key={m.id} className={`group flex gap-3 rounded-md px-2 py-2 ${mine ? 'bg-white' : ''}`}>
                  <Avatar name={nameOf(m.authorId)} className="h-8 w-8 text-xs" />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                      <span className="font-bold">{mine ? 'You' : nameOf(m.authorId)}</span>
                      <span className="text-pencil tabular">{when(m.at)}</span>
                    </p>
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  </div>
                  {isMember ? (
                    savedIds.has(m.id) ? (
                      <span className="self-start whitespace-nowrap pt-0.5 text-sm text-pencil">In notes</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSaveToNotes(m)}
                        aria-label={`Save to notes: ${m.text}`}
                        className="self-start whitespace-nowrap pt-0.5 text-sm underline decoration-rule underline-offset-4 hover:decoration-ink sm:opacity-0 sm:focus:opacity-100 sm:group-hover:opacity-100"
                      >
                        Save to notes
                      </button>
                    )
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="py-3 text-pencil">No messages yet. Say hello to the room.</p>
        )}
      </div>

      {isMember ? (
        <form onSubmit={handleSubmit} className="mt-3 flex gap-2 border-t border-rule pt-3">
          <label htmlFor={`chat-${room.id}`} className="sr-only">
            Message
          </label>
          <input
            id={`chat-${room.id}`}
            value={text}
            maxLength={MESSAGE_MAX_LENGTH}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a message"
            autoComplete="off"
            className="field min-w-0 flex-1"
          />
          <Button type="submit" variant="quiet">
            Send
          </Button>
        </form>
      ) : (
        <p className="mt-3 border-t border-rule pt-3 text-sm text-pencil">Join the room to chat.</p>
      )}
    </Section>
  );
}

// ---------- RoomNotes ----------

const NOTE_MAX_LENGTH = 500;

/**
 * The room's shared notes, on a ruled index card: the important things that should stay
 * while the chat scrolls on. Members can write a note or delete the ones they added.
 */
export function RoomNotes({ room, isMember, userId, nameOf, onAdd, onDelete }) {
  const [text, setText] = useState('');
  const notes = room.notes || [];

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setText('');
  }

  return (
    <section aria-labelledby={`notes-${room.id}`} className="index-card min-w-0 self-start">
      <div className="flex items-baseline justify-between gap-4 border-b-2 border-card-red px-4 pb-2 pt-4 sm:px-6">
        <h2 id={`notes-${room.id}`} className="flex items-center gap-2 text-lg">
          <Icon name="pin" className="h-[1.1rem] w-[1.1rem]" />
          Shared notes
        </h2>
        {notes.length ? <span className="text-sm text-pencil tabular">{notes.length}</span> : null}
      </div>

      {notes.length ? (
        <ul>
          {notes.map((note) => {
            const canDelete = isMember && (note.savedBy === userId || note.authorId === userId);
            return (
              <li key={note.id} className="border-b border-card-line px-4 py-3 sm:px-6">
                <p className="whitespace-pre-wrap break-words">{note.text}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-pencil">
                  <span>
                    {note.authorId === userId ? 'You' : nameOf(note.authorId)}, {formatShortDate(toKey(new Date(note.at)))}
                  </span>
                  {note.fromMessageId ? <Badge>From chat</Badge> : null}
                  {canDelete ? (
                    <ConfirmButton
                      label="Delete"
                      confirmLabel="Delete note?"
                      ariaLabel={`Delete note: ${note.text}`}
                      onConfirm={() => onDelete(note.id)}
                      className="ml-auto"
                    />
                  ) : null}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="border-b border-card-line px-4 py-3 text-pencil sm:px-6">
          No notes yet. Keep the important things here: deadlines, page numbers, what to review.
        </p>
      )}

      {isMember ? (
        <form onSubmit={handleSubmit} className="px-4 py-3 sm:px-6">
          <label htmlFor={`new-note-${room.id}`} className="sr-only">
            New shared note
          </label>
          <textarea
            id={`new-note-${room.id}`}
            rows={2}
            value={text}
            maxLength={NOTE_MAX_LENGTH}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a note everyone in the room can see"
            className="w-full resize-y border-0 border-b border-dashed border-pencil/40 bg-transparent px-0 py-1.5 placeholder:text-pencil focus:border-solid focus:border-ink"
          />
          <div className="mt-2 flex justify-end">
            <Button type="submit" variant="quiet" className="py-1.5 text-sm">
              Add note
            </Button>
          </div>
        </form>
      ) : (
        <p className="px-4 py-3 text-sm text-pencil sm:px-6">Join the room to add notes.</p>
      )}
    </section>
  );
}

// ---------- StudyGroupCard ----------

/** One study group, as a row with a join or leave action. */
export function StudyGroupCard({ group, memberNames, isMember, isOwner, onJoin, onLeave, onDelete }) {
  return (
    <li className="py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-56">
          <p className="flex flex-wrap items-center gap-2 font-bold">
            {group.name}
            {isMember ? <Badge variant="solid">{isOwner ? 'Yours' : 'Member'}</Badge> : null}
            {group.isPublic ? null : <Badge>Invite only</Badge>}
          </p>
          <p className="mt-0.5 text-sm text-pencil">{[group.meets, group.description].filter(Boolean).join('. ')}</p>
        </div>
        <div className="flex items-center gap-4">
          {isOwner ? (
            <ConfirmButton
              label="Delete group"
              confirmLabel="Click again to delete"
              ariaLabel={`Delete group ${group.name}`}
              onConfirm={onDelete}
            />
          ) : null}
          {isMember ? (
            <Button variant="text" className="text-sm" onClick={onLeave}>
              Leave group
            </Button>
          ) : (
            <Button variant="quiet" className="py-1.5 text-sm" onClick={onJoin}>
              Join group
            </Button>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 text-sm text-pencil">
        <AvatarStack names={memberNames} />
        {`${memberNames.length} ${memberNames.length === 1 ? 'member' : 'members'}${isMember ? ', including you' : ''}`}
      </div>
    </li>
  );
}

// ---------- StudyRoom ----------

/** Short status for a room timer, used in lists. */
export function roomTimerSummary(timer, now) {
  const left = timeLeft(timer, now);
  if (timer.status === 'idle') return 'Timer not running';
  const phase = timer.phase === 'break' ? 'Break' : 'Focus round';
  return `${phase}, ${formatClock(left)} ${timer.status === 'paused' ? 'paused' : 'left'}`;
}

function SharedTimer({ room, isMember, onCommand }) {
  const now = useNow(room.timer.status === 'running' ? 500 : 60000);
  const { timer } = room;
  const total = phaseMinutes(timer) * 60000;
  const left = timeLeft(timer, now);
  const remaining = left === null ? total : left;
  const progress = left === null ? 0 : Math.min(1, Math.max(0, 1 - remaining / total));
  const isBreak = timer.phase === 'break';

  const controls = [];
  if (isMember) {
    if (timer.status === 'idle')
      controls.push(
        <Button key="s" onClick={() => onCommand('start')}>
          {isBreak ? 'Start break for everyone' : 'Start round for everyone'}
        </Button>
      );
    if (timer.status === 'running')
      controls.push(
        <Button key="p" variant="quiet" onClick={() => onCommand('pause')}>
          Pause for everyone
        </Button>
      );
    if (timer.status === 'paused')
      controls.push(
        <Button key="r" onClick={() => onCommand('resume')}>
          Resume for everyone
        </Button>
      );
    if (timer.status !== 'idle')
      controls.push(
        <Button key="x" variant="text" onClick={() => onCommand('reset')}>
          Reset timer
        </Button>
      );
  }

  return (
    <div>
      <p className="text-pencil">
        <span className="font-bold text-ink">
          {timer.status === 'idle' ? 'Waiting to start' : isBreak ? 'Break' : 'Focus round'}
        </span>
        {` ${timer.focusMinutes} min focus, ${timer.breakMinutes} min break. Everyone in the room sees the same clock.`}
      </p>
      <p role="timer" className="mt-2 font-serif text-3xl font-semibold leading-none tabular md:text-4xl">
        {formatClock(remaining)}
      </p>
      <div
        role="progressbar"
        aria-label="Round progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        className="relative mt-4 h-6 w-full overflow-hidden rounded-md bg-rule/30"
      >
        <div
          className={`swipe-fill absolute inset-y-0 left-0 ${isBreak ? 'swipe-break' : 'swipe-focus'}`}
          style={{
            width: `${progress * 100}%`,
          }}
        />
      </div>
      {controls.length ? <div className="mt-4 flex flex-wrap items-center gap-3">{controls}</div> : null}
    </div>
  );
}

function GoalEditor({ room, onSave, onCancel }) {
  const [text, setText] = useState(room.goal.text);
  const [target, setTarget] = useState(room.goal.targetRounds);
  return (
    <form
      className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onSave({
          text: text.trim(),
          targetRounds: Math.max(1, Math.min(20, Number(target) || 1)),
        });
      }}
    >
      <Field id="room-goal-text" label="Shared goal" value={text} onChange={(e) => setText(e.target.value)} />
      <Field
        id="room-goal-target"
        label="Rounds"
        type="number"
        min={1}
        max={20}
        value={target}
        onChange={(e) => setTarget(e.target.value)}
      />
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" variant="quiet">
          Save goal
        </Button>
        <Button variant="text" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function StudyRoom({ room }) {
  const study = useStudy();
  const { people, user, userId, courses } = study;
  const navigate = useNavigate();
  const now = useNow(30000);
  const [editingGoal, setEditingGoal] = useState(false);
  const isMember = room.participantIds.includes(userId);

  const participants = room.participantIds.map((id) =>
    id === userId
      ? { id, name: `${user.name} (you)`, status: 'studying', isMe: true }
      : people.find((p) => p.id === id) || { id, name: 'Student', status: 'offline' }
  );
  const nameOf = (id) => (id === userId ? user.name : (people.find((p) => p.id === id) || { name: 'Student' }).name);
  const goalPercent = Math.round((Math.min(room.goal.rounds, room.goal.targetRounds) / room.goal.targetRounds) * 100);

  return (
    <div>
      <Link to="/together" className="text-sm text-pencil underline decoration-rule underline-offset-4 hover:text-ink">
        Study Together
      </Link>
      <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl">{room.name}</h1>
          <p className="mt-1 text-pencil">
            {room.privacy === 'private' ? 'Private room. ' : 'Public room. '}
            {room.privacy === 'private' && room.code ? (
              <span>
                {'Invite code '}
                <span className="font-bold tracking-wide text-ink">{room.code}</span>.
              </span>
            ) : (
              'Anyone on the platform can join.'
            )}
          </p>
        </div>
        {isMember ? (
          <Button
            variant="quiet"
            onClick={() => {
              study.leaveRoom(room.id);
              navigate('/together');
            }}
          >
            Leave room
          </Button>
        ) : (
          <Button onClick={() => study.joinRoom(room.id, null)}>Join room</Button>
        )}
      </header>
      <div className="mt-8 border-t border-rule pt-6">
        <SharedTimer room={room} isMember={isMember} onCommand={(command) => study.roomTimer(room.id, command)} />
      </div>
      <div className="mt-8 grid gap-x-12 gap-y-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Section title="Shared goal" icon="target">
          {editingGoal ? (
            <GoalEditor
              room={room}
              onCancel={() => setEditingGoal(false)}
              onSave={(changes) => {
                study.updateRoomGoal(room.id, changes);
                setEditingGoal(false);
              }}
            />
          ) : (
            <div>
              <p className="font-serif text-lg font-semibold">{room.goal.text}</p>
              <p className="mt-1 text-sm text-pencil">
                {`${Math.min(room.goal.rounds, room.goal.targetRounds)} of ${room.goal.targetRounds} focus rounds done`}
                {room.goal.rounds >= room.goal.targetRounds ? '. Goal reached.' : ''}
              </p>
              <div aria-hidden={true} className="mt-2 h-2 rounded-full bg-rule/50">
                <div
                  className="h-full rounded-full bg-ink"
                  style={{
                    width: `${goalPercent}%`,
                  }}
                />
              </div>
              {isMember ? (
                <Button variant="text" className="mt-3 text-sm" onClick={() => setEditingGoal(true)}>
                  Change goal
                </Button>
              ) : null}
            </div>
          )}
          {isMember ? (
            <div className="mt-6 max-w-sm">
              <Field
                id="room-course"
                as="select"
                label="Count my time toward"
                hint={`Each finished round adds up to ${formatMinutes(room.timer.focusMinutes)} to your study history.`}
                value={room.myCourseId || ''}
                onChange={(e) => study.setRoomCourse(room.id, e.target.value)}
              >
                <option value="">No course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Field>
            </div>
          ) : null}
        </Section>
        <Section title={`In the room (${participants.length})`} icon="users">
          <ul className="divide-y divide-rule/60">
            {participants.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2.5">
                <Avatar name={p.name} />
                <div className="min-w-0">
                  <p className="flex min-w-0 items-center gap-2">
                    <span className="truncate">{p.name}</span>
                    {p.id === room.hostId ? <Badge>Host</Badge> : null}
                  </p>
                  {p.isMe ? <p className="mt-0.5 text-sm text-pencil">Here now</p> : <PersonStatus person={p} now={now} />}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      {/* Talk in the chat; keep what matters in the shared notes beside it. */}
      <div className="mt-12 grid gap-x-12 gap-y-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <RoomChat
          room={room}
          isMember={isMember}
          userId={userId}
          nameOf={nameOf}
          onSend={(text) => study.sendRoomMessage(room, text)}
          onSaveToNotes={(message) =>
            study.addRoomNote(room.id, { text: message.text, authorId: message.authorId, fromMessageId: message.id })
          }
        />
        <RoomNotes
          room={room}
          isMember={isMember}
          userId={userId}
          nameOf={nameOf}
          onAdd={(text) => study.addRoomNote(room.id, { text })}
          onDelete={(noteId) => study.deleteRoomNote(room.id, noteId)}
        />
      </div>
    </div>
  );
}
