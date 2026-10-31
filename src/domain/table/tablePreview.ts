export type TablePreview = Readonly<{
  status: "empty";
  cardCount: 0;
  isInteractive: false;
}>;

export function createEmptyTablePreview(): TablePreview {
  return {
    status: "empty",
    cardCount: 0,
    isInteractive: false,
  };
}
