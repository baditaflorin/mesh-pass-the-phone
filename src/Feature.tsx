import { useMemo, useState } from "react";
import {
  MeshNameInput,
  useNamedPeer,
  useRoster,
  useSharedCollection,
  type MeshConfig,
  type YRoom,
} from "@baditaflorin/mesh-common";

type Props = { room: YRoom | null; config: MeshConfig };
type Round = {
  id: "round";
  turn: number;
  completedTurn: number;
  lastAction: "started" | "completed" | "skipped" | "reset";
  updatedAt: number;
  updatedBy: string;
};

const PROMPTS = [
  "Name a tiny win from today.",
  "Show the room your best celebration pose.",
  "Recommend something you watched, read, or played.",
  "Invent a two-word slogan for this room.",
  "Tell a 15-second story that begins: ‘I didn’t expect…’",
  "Share one thing you are looking forward to.",
  "Give the next player a kind, specific compliment.",
  "Describe your perfect snack without naming it.",
  "Teach everyone a harmless life hack.",
  "Make a sound effect for the current mood.",
  "Name a fictional place you would visit for one hour.",
  "Give the group a one-word challenge for tomorrow.",
];

export function isValidRound(value: unknown): value is Round {
  if (!value || typeof value !== "object") return false;
  const round = value as Partial<Round>;
  return (
    round.id === "round" &&
    Number.isInteger(round.turn) &&
    (round.turn ?? -1) >= 0 &&
    (round.turn ?? 1001) <= 1000 &&
    Number.isInteger(round.completedTurn) &&
    (round.completedTurn ?? -2) >= -1 &&
    (round.completedTurn ?? 1001) <= 1000 &&
    ["started", "completed", "skipped", "reset"].includes(round.lastAction ?? "") &&
    Number.isFinite(round.updatedAt) &&
    typeof round.updatedBy === "string" &&
    round.updatedBy.length <= 64
  );
}

export function promptForTurn(turn: number) {
  return PROMPTS[turn % PROMPTS.length] ?? PROMPTS[0];
}

export function Feature({ room, config }: Props) {
  const { name, setName } = useNamedPeer(config, room);
  const roster = useRoster(room);
  const game = useSharedCollection<Round>(room, "mesh-pass-the-phone:round", {
    validate: isValidRound,
  });
  const [resetArmed, setResetArmed] = useState(false);
  const round = game.byId("round");
  const players = useMemo(
    () =>
      [...new Set(roster.present.length > 0 ? roster.present : room ? [room.peerId] : [])].sort(),
    [roster.present, room],
  );
  const holderId = round && players.length > 0 ? players[round.turn % players.length] : undefined;
  const isHolder = Boolean(room && holderId === room.peerId);
  const holderLabel = holderId === room?.peerId ? "You" : "Another player";

  const start = () =>
    room &&
    !round &&
    game.add({
      id: "round",
      turn: 0,
      completedTurn: -1,
      lastAction: "started",
      updatedAt: Date.now(),
      updatedBy: room.peerId,
    });
  const advance = (lastAction: "completed" | "skipped") => {
    if (!room || !round || !isHolder || round.completedTurn === round.turn) return;
    game.update("round", {
      turn: round.turn + 1,
      completedTurn: round.turn,
      lastAction,
      updatedAt: Date.now(),
      updatedBy: room.peerId,
    });
  };
  const reset = () => {
    if (!room || !resetArmed) return;
    game.update("round", {
      turn: 0,
      completedTurn: -1,
      lastAction: "reset",
      updatedAt: Date.now(),
      updatedBy: room.peerId,
    });
    setResetArmed(false);
  };

  if (!room)
    return (
      <main className="phone-page">
        <h1>{config.appName}</h1>
        <p className="live-status" role="status">
          Joining the room…
        </p>
      </main>
    );

  return (
    <main className="phone-page">
      <section className="hero" aria-labelledby="game-title">
        <p className="eyebrow">Pass it on</p>
        <h1 id="game-title">Pass the phone, not the pressure.</h1>
        <p>
          One rotating prompt, one current holder, and a clear way forward. Everyone in this room
          sees the same turn.
        </p>
        <p className="live-status" role="status" aria-live="polite">
          {round
            ? `Turn ${round.turn + 1}: ${holderLabel} hold${holderId === room.peerId ? "" : "s"} the phone.`
            : "No round yet. Start when the room is ready."}
        </p>
      </section>
      <section className="game-card" aria-labelledby="prompt-title">
        <div className="turn-badge">{round ? `Turn ${round.turn + 1}` : "Ready"}</div>
        <p className="eyebrow">Current prompt</p>
        <h2 id="prompt-title">
          {round ? promptForTurn(round.turn) : "Start the round to reveal the first prompt."}
        </h2>
        <p className="holder" aria-live="polite">
          {round ? (
            <>
              <strong>{holderLabel}</strong> {isHolder ? "have" : "has"} the turn.{" "}
              {isHolder
                ? "When you are done, pass it on."
                : "Wait for the holder or use the safe reset if the room is stuck."}
            </>
          ) : (
            "The first present peer gets the first turn."
          )}
        </p>
        <div className="controls" aria-label="Turn controls">
          {!round ? (
            <button className="primary" type="button" onClick={start}>
              Start round
            </button>
          ) : (
            <>
              <button
                className="primary"
                type="button"
                onClick={() => advance("completed")}
                disabled={!isHolder}
              >
                I completed this prompt
              </button>
              <button
                className="secondary"
                type="button"
                onClick={() => advance("skipped")}
                disabled={!isHolder}
              >
                Skip this turn
              </button>
            </>
          )}
        </div>
        {round && !isHolder && (
          <p className="hint">
            Only the deterministic current holder can complete or skip this turn.
          </p>
        )}
      </section>
      <section className="room-card" aria-labelledby="room-title">
        <div>
          <p className="eyebrow">Room status</p>
          <h2 id="room-title">
            {players.length} active {players.length === 1 ? "player" : "players"}
          </h2>
          <p>
            Holder order is the stable, sorted peer list. The same turn number yields the same
            holder for every peer.
          </p>
        </div>
        <MeshNameInput value={name} onChange={setName} ariaLabel="Your display name" />
      </section>
      {round && (
        <section className="reset-card" aria-labelledby="reset-title">
          <div>
            <p className="eyebrow">Recovery</p>
            <h2 id="reset-title">Stuck? Reset safely.</h2>
            <p>
              Reset returns the shared game to turn one. Arm it first to avoid accidental wipes.
            </p>
          </div>
          <label className="reset-check">
            <input
              type="checkbox"
              checked={resetArmed}
              onChange={(event) => setResetArmed(event.target.checked)}
            />
            I want to reset this room’s round
          </label>
          <button className="danger" type="button" disabled={!resetArmed} onClick={reset}>
            Reset round
          </button>
        </section>
      )}
    </main>
  );
}
