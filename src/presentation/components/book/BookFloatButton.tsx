import type { ReactNode, Ref } from "react";

interface BookFloatButtonProps {
  readonly children: ReactNode;
  readonly label: string;
  readonly onPress: () => void;
  readonly className?: string;
  /** For a switch: whether it is on. */
  readonly pressed?: boolean;
  readonly disabled?: boolean;
  readonly ref?: Ref<HTMLButtonElement>;
}

/** A control set as raised lettering: a heavy shadow, never a colour. */
export function BookFloatButton({
  children,
  label,
  onPress,
  className,
  pressed,
  disabled,
  ref,
}: BookFloatButtonProps) {
  return (
    <button
      ref={ref}
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
