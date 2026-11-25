import type { ReactNode } from "react";

interface BookFloatButtonProps {
  readonly children: ReactNode;
  readonly label: string;
  readonly onPress: () => void;
  readonly className?: string;
  /** For a switch: whether it is on. */
  readonly pressed?: boolean;
  readonly disabled?: boolean;
}

/** A control set as raised lettering: a heavy shadow, never a colour. */
export function BookFloatButton({
  children,
  label,
  onPress,
  className,
  pressed,
  disabled,
}: BookFloatButtonProps) {
  return (
    <button
      type="button"
      className={className ? `book-float ${className}` : "book-float"}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onPress}
    >
      {children}
    </button>
  );
}
