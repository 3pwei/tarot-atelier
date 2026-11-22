import { ConfirmDialog } from "@/presentation/components/dialog/ConfirmDialog";
import type { ArrangeConfirmation } from "@/presentation/components/spread/useArrangeMode";

/** Asks before entering or leaving arrange mode would lose something. */
export function ArrangeConfirmDialog({
  confirmation,
  onConfirm,
  onCancel,
}: {
  readonly confirmation: ArrangeConfirmation;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}) {
  if (confirmation.kind === "clear-draws") {
    return (
      <ConfirmDialog
        title="清除這次的抽牌結果？"
        message="編輯牌陣前，會先把這次抽到的牌收回牌堆，解讀也會一起清除。牌位、問題和主問題都會保留。"
        confirmLabel="清除並編輯"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
  }
  const { target } = confirmation;
  return (
    <ConfirmDialog
      title="牌陣還沒儲存"
      message={
        target.kind === "template"
          ? `離開後，剛才的修改會還原成牌陣庫裡的「${target.template.name}」。確定要離開嗎？`
          : "離開後，剛才的修改會還原成開始編輯前的牌陣。確定要離開嗎？"
      }
      confirmLabel="確定離開"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
