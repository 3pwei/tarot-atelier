import "@testing-library/jest-dom/vitest";

// jsdom has no object URLs; share previews only need a stable string.
if (typeof URL.createObjectURL !== "function") {
  let next = 0;
  URL.createObjectURL = () => `blob:test/${(next += 1)}`;
  URL.revokeObjectURL = () => undefined;
}
