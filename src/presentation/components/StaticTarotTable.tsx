import type { TablePreview } from "@/domain/table/tablePreview";

export function StaticTarotTable({
  preview,
}: Readonly<{ preview: TablePreview }>) {
  return (
    <div className="tarot-table-frame">
      <div
        className="tarot-table"
        aria-label="靜態牌桌預覽，尚未啟用抽牌功能"
        data-card-count={preview.cardCount}
      >
        <div className="table-empty-state" role="status">
          <strong>牌桌靜待啟用</strong>
          <p>Phase 00 僅展示空牌桌與視覺方向；目前沒有抽牌、翻牌或解牌互動。</p>
        </div>
      </div>
    </div>
  );
}
