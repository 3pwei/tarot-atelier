import type { Deck } from "@/domain/deck/deck";
import type { CardInstance } from "@/domain/deck/types";
import type { SpreadPosition } from "@/domain/spread/types";

interface PositionListProps {
  readonly positions: readonly SpreadPosition[];
  readonly deck: Deck;
  readonly selectedId?: string;
  readonly revealedInstanceIds: ReadonlySet<string>;
  readonly nextPositionId?: string;
  readonly onSelect: (positionId: string) => void;
}

function describeCard(
  deck: Deck,
  instance: CardInstance,
  revealed: boolean,
  role: string,
): string {
  if (!revealed) return `${role}：尚未揭示`;
  const name = deck.getCard(instance.cardId)?.name.zhHant ?? "未知卡牌";
  return `${role}：${name}（${instance.orientation === "reversed" ? "逆位" : "正位"}）`;
}

function resultText(
  position: SpreadPosition,
  deck: Deck,
  revealed: ReadonlySet<string>,
  isNext: boolean,
): string {
  const result = position.drawResult;
  if (!result) return isNext ? "下一個抽牌位置" : "待抽牌";
  const parts = [
    describeCard(
      deck,
      result.primary,
      revealed.has(result.primary.instanceId),
      "主牌",
    ),
  ];
  if (result.jumper) {
    parts.push(
      describeCard(
        deck,
        result.jumper,
        revealed.has(result.jumper.instanceId),
        "跳牌",
      ),
    );
  }
  return parts.join("；");
}

/** The reading in number order; also the accessible view of the table. */
export function PositionList({
  positions,
  deck,
  selectedId,
  revealedInstanceIds,
  nextPositionId,
  onSelect,
}: PositionListProps) {
  if (positions.length === 0) {
    return <p className="position-list__empty">還沒有牌位。</p>;
  }

  return (
    <ol className="position-list" aria-label="牌位與問題">
      {positions.map((position) => {
        const question = position.question.trim();
        return (
          <li key={position.id}>
            <button
              type="button"
              className="position-list__item"
              aria-current={position.id === selectedId || undefined}
              data-missing-question={!question || undefined}
              data-next={position.id === nextPositionId || undefined}
              onClick={() => onSelect(position.id)}
            >
              <span className="position-list__number" aria-hidden="true">
                {position.index}
              </span>
              <span className="position-list__body">
                <span className="sr-only">牌位 {position.index}：</span>
                <strong>{question || "尚未設定問題"}</strong>
                <small>
                  {resultText(
                    position,
                    deck,
                    revealedInstanceIds,
                    position.id === nextPositionId,
                  )}
                </small>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
