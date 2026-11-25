/** The small ruled ornament under a page title. */
export function BookFlourish() {
  return (
    <svg
      className="book-flourish"
      viewBox="0 0 150 16"
      fill="none"
      stroke="#3d2a18"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      <path d="M5 8 H55 M95 8 H145" />
      <path d="M75 2 l6 6 -6 6 -6 -6z" fill="#3d2a18" />
      <path d="M55 8 q6 -6 12 0 M95 8 q-6 -6 -12 0" />
    </svg>
  );
}
