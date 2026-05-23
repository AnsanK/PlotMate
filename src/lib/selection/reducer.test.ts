import { describe, it, expect } from "vitest";
import { applyAction, type SelectionState } from "./reducer";

const initial: SelectionState = {
  selectedIds: new Set<string>(),
  drawnIds: new Set<string>(),
  lastClickedId: null,
  selectedChartIds: new Set<string>(),
  lastClickedChartId: null,
  group1Ids: new Set<string>(),
  group2Ids: new Set<string>(),
  selectedInGroup1Ids: new Set<string>(),
  selectedInGroup2Ids: new Set<string>(),
  lastClickedInGroup1Id: null,
  lastClickedInGroup2Id: null,
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
        ...initial,
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

  describe("draw (replace drawn with selected)", () => {
    it("replaces drawnIds entirely with selectedIds (no accumulation)", () => {
      const state: SelectionState = {
        ...initial,
        selectedIds: new Set(["a", "b", "c"]),
        drawnIds: new Set(["x", "y"]),
        lastClickedId: "c",
      };
      const next = applyAction(state, { type: "draw" });
      expect([...next.drawnIds].sort()).toEqual(["a", "b", "c"]);
      expect(next.selectedIds.size).toBe(0);
      expect(next.lastClickedId).toBeNull();
    });

    it("is a no-op when nothing selected (drawnIds preserved)", () => {
      const state: SelectionState = {
        ...initial,
        drawnIds: new Set(["x", "y"]),
      };
      const next = applyAction(state, { type: "draw" });
      expect([...next.drawnIds].sort()).toEqual(["x", "y"]);
      expect(next.selectedIds.size).toBe(0);
    });

    it("clears selectedChartIds on draw (cards replaced)", () => {
      const state: SelectionState = {
        ...initial,
        selectedIds: new Set(["a"]),
        drawnIds: new Set(["x"]),
        selectedChartIds: new Set(["x"]),
        lastClickedChartId: "x",
      };
      const next = applyAction(state, { type: "draw" });
      expect([...next.drawnIds]).toEqual(["a"]);
      expect(next.selectedChartIds.size).toBe(0);
      expect(next.lastClickedChartId).toBeNull();
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
    group1Ids: new Set<string>(),
    group2Ids: new Set<string>(),
    selectedInGroup1Ids: new Set<string>(),
    selectedInGroup2Ids: new Set<string>(),
    lastClickedInGroup1Id: null,
    lastClickedInGroup2Id: null,
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

describe("group workflow (addToGroup / deleteFromGroup / toggleInGroup / rangeInGroup / clearGroupSelection)", () => {
  const initialGroups: SelectionState = {
    selectedIds: new Set<string>(),
    drawnIds: new Set<string>(),
    lastClickedId: null,
    selectedChartIds: new Set<string>(),
    lastClickedChartId: null,
    group1Ids: new Set<string>(),
    group2Ids: new Set<string>(),
    selectedInGroup1Ids: new Set<string>(),
    selectedInGroup2Ids: new Set<string>(),
    lastClickedInGroup1Id: null,
    lastClickedInGroup2Id: null,
  };

  describe("addToGroup", () => {
    it("moves selectedChartIds into group1 and removes from drawnIds + selectedChartIds", () => {
      const state: SelectionState = {
        ...initialGroups,
        drawnIds: new Set(["a", "b", "c"]),
        selectedChartIds: new Set(["a", "c"]),
        lastClickedChartId: "c",
      };
      const next = applyAction(state, { type: "addToGroup", group: 1 });
      expect([...next.group1Ids].sort()).toEqual(["a", "c"]);
      expect([...next.drawnIds]).toEqual(["b"]);
      expect(next.selectedChartIds.size).toBe(0);
      expect(next.lastClickedChartId).toBeNull();
    });

    it("moves selectedChartIds into group2 without touching group1", () => {
      const state: SelectionState = {
        ...initialGroups,
        drawnIds: new Set(["x", "y"]),
        selectedChartIds: new Set(["x"]),
        group1Ids: new Set(["z"]),
      };
      const next = applyAction(state, { type: "addToGroup", group: 2 });
      expect([...next.group2Ids]).toEqual(["x"]);
      expect([...next.group1Ids]).toEqual(["z"]);
      expect([...next.drawnIds]).toEqual(["y"]);
    });

    it("is a no-op when selectedChartIds is empty", () => {
      const state: SelectionState = {
        ...initialGroups,
        drawnIds: new Set(["a"]),
        group1Ids: new Set(["b"]),
      };
      const next = applyAction(state, { type: "addToGroup", group: 1 });
      expect([...next.group1Ids]).toEqual(["b"]);
      expect([...next.drawnIds]).toEqual(["a"]);
    });
  });

  describe("toggleInGroup", () => {
    it("toggles in group1 selection", () => {
      const state: SelectionState = {
        ...initialGroups,
        group1Ids: new Set(["a", "b"]),
      };
      const next1 = applyAction(state, {
        type: "toggleInGroup",
        group: 1,
        id: "a",
        orderedIds: ["a", "b"],
      });
      expect([...next1.selectedInGroup1Ids]).toEqual(["a"]);
      expect(next1.lastClickedInGroup1Id).toBe("a");

      const next2 = applyAction(next1, {
        type: "toggleInGroup",
        group: 1,
        id: "a",
        orderedIds: ["a", "b"],
      });
      expect(next2.selectedInGroup1Ids.size).toBe(0);
    });

    it("group1 and group2 selections are independent", () => {
      const state: SelectionState = {
        ...initialGroups,
        group1Ids: new Set(["a"]),
        group2Ids: new Set(["b"]),
        selectedInGroup1Ids: new Set(["a"]),
      };
      const next = applyAction(state, {
        type: "toggleInGroup",
        group: 2,
        id: "b",
        orderedIds: ["b"],
      });
      expect([...next.selectedInGroup1Ids]).toEqual(["a"]);
      expect([...next.selectedInGroup2Ids]).toEqual(["b"]);
    });
  });

  describe("rangeInGroup", () => {
    it("selects range in group1 based on lastClickedInGroup1Id", () => {
      const state: SelectionState = {
        ...initialGroups,
        group1Ids: new Set(["a", "b", "c", "d"]),
        selectedInGroup1Ids: new Set(["a"]),
        lastClickedInGroup1Id: "a",
      };
      const next = applyAction(state, {
        type: "rangeInGroup",
        group: 1,
        id: "c",
        orderedIds: ["a", "b", "c", "d"],
      });
      expect([...next.selectedInGroup1Ids].sort()).toEqual(["a", "b", "c"]);
    });

    it("falls back to single select when lastClickedInGroup1Id is null", () => {
      const state: SelectionState = {
        ...initialGroups,
        group1Ids: new Set(["a", "b", "c"]),
      };
      const next = applyAction(state, {
        type: "rangeInGroup",
        group: 1,
        id: "b",
        orderedIds: ["a", "b", "c"],
      });
      expect([...next.selectedInGroup1Ids]).toEqual(["b"]);
      expect(next.lastClickedInGroup1Id).toBe("b");
    });
  });

  describe("clearGroupSelection", () => {
    it("clears only the specified group's selection", () => {
      const state: SelectionState = {
        ...initialGroups,
        selectedInGroup1Ids: new Set(["a", "b"]),
        selectedInGroup2Ids: new Set(["c"]),
        lastClickedInGroup1Id: "b",
      };
      const next = applyAction(state, { type: "clearGroupSelection", group: 1 });
      expect(next.selectedInGroup1Ids.size).toBe(0);
      expect(next.lastClickedInGroup1Id).toBeNull();
      expect([...next.selectedInGroup2Ids]).toEqual(["c"]);
    });
  });

  describe("deleteFromGroup", () => {
    it("moves selected group1 items back into drawnIds and removes from group1", () => {
      const state: SelectionState = {
        ...initialGroups,
        group1Ids: new Set(["a", "b", "c"]),
        selectedInGroup1Ids: new Set(["a", "c"]),
        lastClickedInGroup1Id: "c",
        drawnIds: new Set(["d"]),
      };
      const next = applyAction(state, { type: "deleteFromGroup", group: 1 });
      expect([...next.group1Ids]).toEqual(["b"]);
      expect([...next.drawnIds].sort()).toEqual(["a", "c", "d"]);
      expect(next.selectedInGroup1Ids.size).toBe(0);
      expect(next.lastClickedInGroup1Id).toBeNull();
    });

    it("is a no-op when nothing selected in the group", () => {
      const state: SelectionState = {
        ...initialGroups,
        group1Ids: new Set(["a", "b"]),
        drawnIds: new Set(["x"]),
      };
      const next = applyAction(state, { type: "deleteFromGroup", group: 1 });
      expect([...next.group1Ids].sort()).toEqual(["a", "b"]);
      expect([...next.drawnIds]).toEqual(["x"]);
    });
  });

  describe("draw action does not touch group items", () => {
    it("preserves group1/group2 when draw replaces drawnIds", () => {
      const state: SelectionState = {
        ...initialGroups,
        selectedIds: new Set(["new1", "new2"]),
        drawnIds: new Set(["old1"]),
        group1Ids: new Set(["g1a", "g1b"]),
        group2Ids: new Set(["g2a"]),
      };
      const next = applyAction(state, { type: "draw" });
      expect([...next.drawnIds].sort()).toEqual(["new1", "new2"]);
      expect([...next.group1Ids].sort()).toEqual(["g1a", "g1b"]);
      expect([...next.group2Ids]).toEqual(["g2a"]);
    });
  });
});
