import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStudy } from '../context/StudyContext';
import { useNow } from '../hooks';
import { Header } from '../components/layout';
import { FriendsList, Leaderboard, roomTimerSummary, StudyGroupCard, StudyRoom } from '../components/social';
import { AvatarStack, Badge, Button, Field, Modal, Section } from '../components/ui';

function useNames() {
  const { people, user, userId } = useStudy();
  return (ids) =>
    ids.map((id) => (id === userId ? `${user.name} (you)` : (people.find((p) => p.id === id) || { name: 'Student' }).name));
}

function CreateRoomForm({ courses, onCreate, onCancel }) {
  const [name, setName] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [goalText, setGoalText] = useState('');
  const [targetRounds, setTargetRounds] = useState(4);
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [courseId, setCourseId] = useState('');
  const [error, setError] = useState('');

  const num = (v, max) => Math.max(1, Math.min(max, Math.round(Number(v)) || 1));

  return (
    <form
      noValidate={true}
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) {
          setError('Give the room a name.');
          return;
        }
        onCreate({
          name: name.trim(),
          privacy,
          goalText: goalText.trim() || 'Stay focused together',
          targetRounds: num(targetRounds, 20),
          focusMinutes: num(focusMinutes, 120),
          breakMinutes: num(breakMinutes, 60),
          courseId,
        });
      }}
    >
      <Field
        id="room-name"
        label="Room name"
        value={name}
        autoFocus={true}
        placeholder="Sunday revision"
        onChange={(e) => {
          setName(e.target.value);
          setError('');
        }}
      />
      {error ? <p className="text-sm font-bold">{error}</p> : null}
      <fieldset>
        <legend className="mb-2 text-sm font-bold">Who can join</legend>
        <div className="space-y-2">
          {[
            {
              value: 'public',
              label: 'Public',
              hint: 'Listed for everyone on the platform.',
            },
            {
              value: 'private',
              label: 'Private',
              hint: 'Hidden. People join with an invite code.',
            },
          ].map((o) => (
            <label key={o.value} className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="room-privacy"
                value={o.value}
                checked={privacy === o.value}
                onChange={() => setPrivacy(o.value)}
                className="mt-1 accent-ink"
              />
              <span>
                <span className="font-bold">{o.label}</span>
                <span className="block text-sm text-pencil">{o.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field
        id="room-goal"
        label="Shared goal"
        value={goalText}
        placeholder="Finish the problem set"
        onChange={(e) => setGoalText(e.target.value)}
      />
      <div className="grid grid-cols-3 gap-3">
        <Field
          id="room-rounds"
          label="Rounds"
          type="number"
          min={1}
          max={20}
          value={targetRounds}
          onChange={(e) => setTargetRounds(e.target.value)}
        />
        <Field
          id="room-focus"
          label="Focus min"
          type="number"
          min={1}
          max={120}
          value={focusMinutes}
          onChange={(e) => setFocusMinutes(e.target.value)}
        />
        <Field
          id="room-break"
          label="Break min"
          type="number"
          min={1}
          max={60}
          value={breakMinutes}
          onChange={(e) => setBreakMinutes(e.target.value)}
        />
      </div>
      <Field
        id="room-create-course"
        as="select"
        label="Count my time toward"
        value={courseId}
        onChange={(e) => setCourseId(e.target.value)}
      >
        <option value="">No course</option>
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Field>
      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit">Create room</Button>
        <Button variant="quiet" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function CreateGroupForm({ onCreate, onCancel }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [meets, setMeets] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState('');

  return (
    <form
      noValidate={true}
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) {
          setError('Give the group a name.');
          return;
        }
        onCreate({
          name: name.trim(),
          description: description.trim(),
          meets: meets.trim(),
          isPublic,
        });
      }}
    >
      <Field
        id="group-name"
        label="Group name"
        value={name}
        autoFocus={true}
        placeholder="Stats study group"
        onChange={(e) => {
          setName(e.target.value);
          setError('');
        }}
      />
      {error ? <p className="text-sm font-bold">{error}</p> : null}
      <Field
        id="group-description"
        as="textarea"
        rows={3}
        label="What the group does"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <Field
        id="group-meets"
        label="When you meet (optional)"
        value={meets}
        placeholder="Wednesdays at 17:00"
        onChange={(e) => setMeets(e.target.value)}
      />
      <label className="flex cursor-pointer items-center gap-3">
        <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="task-check" />
        Anyone can find and join this group
      </label>
      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit">Create group</Button>
        <Button variant="quiet" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function RoomsSection({ onCreate }) {
  const { rooms, userId, joinRoom } = useStudy();
  const names = useNames();
  const navigate = useNavigate();
  const now = useNow(1000);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');

  const visible = rooms.filter((r) => r.privacy === 'public' || r.participantIds.includes(userId));

  function joinByCode(event) {
    event.preventDefault();
    const wanted = code.trim().toUpperCase();
    if (!wanted) return;
    const room = rooms.find((r) => r.code && r.code.toUpperCase() === wanted);
    if (!room) {
      setCodeError(`No room uses the code ${wanted}. Check it with whoever invited you.`);
      return;
    }
    joinRoom(room.id, null);
    navigate(`/together/rooms/${room.id}`);
  }

  return (
    <Section
      title="Study rooms"
      icon="door"
      action={
        <Button variant="quiet" className="py-1.5 text-sm" onClick={onCreate}>
          Create room
        </Button>
      }
    >
      {visible.length ? (
        <ul className="divide-y divide-rule/60">
          {visible.map((room) => {
            const joined = room.participantIds.includes(userId);
            return (
              <li key={room.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                <div className="min-w-0 flex-1 basis-60">
                  <Link
                    to={`/together/rooms/${room.id}`}
                    className="font-bold underline decoration-transparent underline-offset-4 hover:decoration-rule"
                  >
                    {room.name}
                  </Link>
                  {room.privacy === 'private' ? <Badge className="ml-2">Private</Badge> : null}
                  {joined ? (
                    <Badge variant="solid" className="ml-2">
                      You are here
                    </Badge>
                  ) : null}
                  <p className="text-sm text-pencil tabular">{`${roomTimerSummary(room.timer, now)}. ${Math.min(room.goal.rounds, room.goal.targetRounds)} of ${room.goal.targetRounds} rounds toward “${room.goal.text}”.`}</p>
                </div>
                <AvatarStack names={names(room.participantIds)} />
                {joined ? (
                  <Button to={`/together/rooms/${room.id}`} variant="quiet" className="py-1.5 text-sm">
                    Open room
                  </Button>
                ) : (
                  <Button
                    className="py-1.5 text-sm"
                    onClick={() => {
                      joinRoom(room.id, null);
                      navigate(`/together/rooms/${room.id}`);
                    }}
                  >
                    Join room
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-3 text-pencil">No open rooms right now. Create one and invite friends.</p>
      )}
      <form onSubmit={joinByCode} className="mt-4 flex flex-wrap gap-2 border-t border-rule/70 pt-4">
        <label htmlFor="room-code" className="sr-only">
          Invite code for a private room
        </label>
        <input
          id="room-code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setCodeError('');
          }}
          placeholder="Invite code for a private room"
          aria-describedby={codeError ? 'room-code-error' : undefined}
          className="field min-w-0 flex-1 basis-56 uppercase placeholder:normal-case"
        />
        <Button type="submit" variant="quiet">
          Join with code
        </Button>
      </form>
      {codeError ? (
        <p id="room-code-error" role="alert" className="mt-2 text-sm font-bold">
          {codeError}
        </p>
      ) : null}
    </Section>
  );
}

function GroupsSection({ onCreate }) {
  const { groups, userId, joinGroup, leaveGroup, deleteGroup } = useStudy();
  const names = useNames();
  const sorted = groups.slice().sort((a, b) => Number(b.memberIds.includes(userId)) - Number(a.memberIds.includes(userId)));

  return (
    <Section
      title="Study groups"
      icon="group"
      action={
        <Button variant="quiet" className="py-1.5 text-sm" onClick={onCreate}>
          Create group
        </Button>
      }
    >
      {sorted.length ? (
        <ul className="divide-y divide-rule/60">
          {sorted.map((group) => (
            <StudyGroupCard
              key={group.id}
              group={group}
              memberNames={names(group.memberIds)}
              isMember={group.memberIds.includes(userId)}
              isOwner={group.createdBy === userId}
              onJoin={() => joinGroup(group.id)}
              onLeave={() => leaveGroup(group.id)}
              onDelete={() => deleteGroup(group.id)}
            />
          ))}
        </ul>
      ) : (
        <p className="py-3 text-pencil">No groups yet. Start one for a course you share with friends.</p>
      )}
    </Section>
  );
}

export default function StudyTogether() {
  const { roomId } = useParams();
  const study = useStudy();
  const navigate = useNavigate();
  const [modal, setModal] = useState(null);

  if (roomId) {
    const room = study.rooms.find((r) => r.id === roomId);
    if (!room || (room.privacy === 'private' && !room.participantIds.includes(study.userId))) {
      return (
        <div>
          <Header title="Room not found">The room may have closed, or it is private and needs an invite code.</Header>
          <Button to="/together" variant="quiet">
            Back to Study Together
          </Button>
        </div>
      );
    }
    return <StudyRoom room={room} />;
  }

  const studying = study.friends.filter((f) => f.status === 'studying').length;

  return (
    <div>
      <Header title="Study Together" icon="users">
        {studying
          ? `${studying} of your friends ${studying === 1 ? 'is' : 'are'} studying right now.`
          : 'None of your friends are studying right now.'}
      </Header>
      <div className="grid gap-x-12 gap-y-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <RoomsSection onCreate={() => setModal('room')} />
        <Leaderboard />
        <FriendsList />
        <GroupsSection onCreate={() => setModal('group')} />
      </div>
      <Modal open={modal === 'room'} title="Create a study room" onClose={() => setModal(null)}>
        <CreateRoomForm
          courses={study.courses}
          onCancel={() => setModal(null)}
          onCreate={(room) => {
            const id = study.createRoom(room);
            setModal(null);
            navigate(`/together/rooms/${id}`);
          }}
        />
      </Modal>
      <Modal open={modal === 'group'} title="Create a study group" onClose={() => setModal(null)}>
        <CreateGroupForm
          onCancel={() => setModal(null)}
          onCreate={(group) => {
            study.createGroup(group);
            setModal(null);
          }}
        />
      </Modal>
    </div>
  );
}
