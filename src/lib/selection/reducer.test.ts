import { describe, it, expect } from "vitest";
import { applyAction, type SelectionState } from "./reducer";

const initial: SelectionState = {
  selectedIds: new Set<string>(),
  drawnIds: new Set<string>(),
  lastClickedId: null,
  selectedChartIds: new Set<string>(),
  lastClickedChartId: null,
};

describe("selection reducer", () => {
  describe("selectOnly", () => {
    it("clears previous selection and selects only the clicked id", () => {
      const state: SelectionState = {
        ...initial,
        selectedIds: new Set(["a", "b"]),
      };
      const next = applyAction(state, {
        type: "selectOnly",
        id: "c",
        orderedIds: ["a", "b", "c"],
      });
      expect([...next.selectedIds]).toEqual(["c"]);
      expect(next.lastClickedId).toBe("c");
    });
  });

  describe("toggle (Ctrl+click)", () => {
    it("adds id when not selected", () => {
      const state: SelectionState = { ...initial, selectedIds: new Set(["a"]) };
      const next = applyAction(state, {
        type: "toggle",
        id: "b",
        orderedIds: ["a", "b"],
      });
      expect([...next.selectedIds].sort()).toEqual(["a", "b"]);
      expect(next.lastClickedId).toBe("b");
    });

    it("removes id when already selected", () => {
      const state: SelectionState = {
        ...initial,
        selectedIds: new Set(["a", "b"]),
      };
      const next = applyAction(state, {
        type: "toggle",
        id: "b",
        orderedIds: ["a", "b"],
      });
      expect([...next.selectedIds]).toEqual(["a"]);
    });
  });

  describe("range (Shift+click)", () => {
    it("selects all ids between lastClickedId and current (inclusive)", () => {
      const state: SelectionState = {
        ...initial,
        selectedIds: new Set(["a"]),
        lastClickedId: "a",
      };
      const next = applyAction(state, {
        type: "range",
        id: "d",
        orderedIds: ["a", "b", "c", "d", "e"],
      });
      expect([...next.selectedIds].sort()).toEqual(["a", "b", "c", "d"]);
    });

    it("works in reverse direction", () => {
      const state: SelectionState = {
        ...initial,
        selectedIds: new Set(["d"]),
        lastClickedId: "d",
      };
      const next = applyAction(state, {
        type: "range",
        id: "a",
        orderedIds: ["a", "b", "c", "d", "e"],
      });
      expect([...next.selectedIds].sort()).toEqual(["a", "b", "c", "d"]);
    });

    it("falls back to selectOnly when lastClickedId is null", () => {
      const state: SelectionState = initial;
      const next = applyAction(state, {
        type: "range",
        id: "c",
        orderedIds: ["a", "b", "c"],
      });
      expect([...next.selectedIds]).toEqual(["c"]);
    });
  });

  describe("clearSelection (Esc)", () => {
    it("clears selection but keeps drawn", () => {
      const state: SelectionState = {
        selectedIds: new Set(["a", "b"]),
        drawnIds: new Set(["c"]),
        lastClickedId: "b",
      };
      const next = applyAction(state, { type: "clearSelection" });
      expect(next.selectedIds.size).toBe(0);
      expect([...next.drawnIds]).toEqual(["c"]);
      expect(next.lastClickedId).toBeNull();
    });
  });

  describe("draw (push selected → drawn, skip already-drawn)", () => {
    it("adds non-drawn selected ids to drawnIds, drops them from selectedIds", () => {
      const state: SelectionState = {
        selectedIds: new Set(["a", "b", "c"]),
        drawnIds: new Set(["b"]),
        lastClickedId: "c",
      };
      const next = applyAction(state, { type: "draw" });
      expect([...next.drawnIds].sort()).toEqual(["a", "b", "c"]);
      expect(next.selectedIds.size).toBe(0);
    });

    it("is a no-op when nothing selected", () => {
      const state: SelectionState = {
        ...initial,
        drawnIds: new Set(["x"]),
      };
      const next = applyAction(state, { type: "draw" });
      expect([...next.drawnIds]).toEqual(["x"]);
      expect(next.selectedIds.size).toBe(0);
    });
  });

  describe("setDrawn (programmatic)", () => {
    it("adds an id to drawnIds (idempotent)", () => {
      const state: SelectionState = {
        ...initial,
        drawnIds: new Set(["a"]),
      };
      const next = applyAction(state, { type: "setDrawn", id: "b", drawn: true });
      expect([...next.drawnIds].sort()).toEqual(["a", "b"]);
    });

    it("removes an id from drawnIds", () => {
      const state: SelectionState = {
        ...initial,
        drawnIds: new Set(["a", "b"]),
      };
      const next = applyAction(state, { type: "setDrawn", id: "a", drawn: false });
      expect([...next.drawnIds]).toEqual(["b"]);
    });
  });
});

describe("chart card selection (toggleChart / rangeChart / clearChartSelection)", () => {
  const initialChart: SelectionState = {
    selectedIds: new Set<string>(),
    drawnIds: new Set<string>(),
    lastClickedId: null,
    selectedChartIds: new Set<string>(),
    lastClickedChartId: null,
  };

  it("toggleChart adds id when not selected", () => {
    const next = applyAction(initialChart, {
      type: "toggleChart",
      id: "MSR0009",
      orderedIds: ["MSR0009", "MSR0018"],
    });
    expect([...next.selectedChartIds]).toEqual(["MSR0009"]);
    expect(next.lastClickedChartId).toBe("MSR0009");
  });

  it("toggleChart removes id when already selected", () => {
    const state: SelectionState = {
      ...initialChart,
      selectedChartIds: new Set(["MSR0009"]),
      lastClickedChartId: "MSR0009",
    };
    const next = applyAction(state, {
      type: "toggleChart",
      id: "MSR0009",
      orderedIds: ["MSR0009"],
    });
    expect(next.selectedChartIds.size).toBe(0);
  });

  it("rangeChart selects all between lastClickedChartId and current", () => {
    const state: SelectionState = {
      ...initialChart,
      selectedChartIds: new Set(["a"]),
      lastClickedChartId: "a",
    };
    const next = applyAction(state, {
      type: "rangeChart",
      id: "c",
      orderedIds: ["a", "b", "c", "d"],
    });
    expect([...next.selectedChartIds].sort()).toEqual(["a", "b", "c"]);
  });

  it("clearChartSelection clears chart selection only", () => {
    const state: SelectionState = {
      ...initialChart,
      selectedIds: new Set(["x"]),
      selectedChartIds: new Set(["MSR0009"]),
      lastClickedChartId: "MSR0009",
    };
    const next = applyAction(state, { type: "clearChartSelection" });
    expect(next.selectedChartIds.size).toBe(0);
    expect([...next.selectedIds]).toEqual(["x"]);
  });

  it("setDrawn(drawn=false) removes from drawnIds AND from selectedChartIds", () => {
    const state: SelectionState = {
      ...initialChart,
      drawnIds: new Set(["MSR0009", "MSR0018"]),
      selectedChartIds: new Set(["MSR0009"]),
    };
    const next = applyAction(state, {
      type: "setDrawn",
      id: "MSR0009",
      drawn: false,
    });
    expect([...next.drawnIds]).toEqual(["MSR0018"]);
    expect(next.selectedChartIds.size).toBe(0);
  });
});
