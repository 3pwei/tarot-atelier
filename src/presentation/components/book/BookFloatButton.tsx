import type { ReactNode } from "react";

interface BookFloatButtonProps {
  readonly children: ReactNode;
  readonly label: string;
  readonly onPress: () => void;
  readonly className?: string;
}

/** A control set as raised lettering: a heavy shadow, never a colour. */
export function BookFloatButton({
  children,
  label,
  onPress,
  className,
}: BookFloatButtonProps) {
  return (
    <button
      type="button"
      className={className ? `book-float ${className}` : "book-float"}
      aria-label={label}
      onClick={onPress}
    >
      {children}
    </button>
  );
}
