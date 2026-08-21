import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMockRoom } from "@baditaflorin/mesh-common/testing";
import { Feature, isValidRound, promptForTurn } from "../../src/Feature";
import { config } from "../../src/config";

describe("Feature (component)", () => {
  it("renders the rotating prompt game when connected", () => {
    const room = createMockRoom();
    render(<Feature room={room} config={config} />);
    expect(screen.getByRole("heading", { name: /Pass the phone/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Start round/i })).toBeInTheDocument();
  });

  it("shows a connecting state when room is null", () => {
    render(<Feature room={null} config={config} />);
    expect(screen.getByText(/Joining the room/i)).toBeInTheDocument();
  });

  it("validates bounded rounds and cycles prompts deterministically", () => {
    expect(
      isValidRound({
        id: "round",
        turn: 0,
        completedTurn: -1,
        lastAction: "started",
        updatedAt: 1,
        updatedBy: "peer",
      }),
    ).toBe(true);
    expect(
      isValidRound({
        id: "round",
        turn: -1,
        completedTurn: -1,
        lastAction: "started",
        updatedAt: 1,
        updatedBy: "peer",
      }),
    ).toBe(false);
    expect(promptForTurn(0)).toBe(promptForTurn(12));
  });
});
