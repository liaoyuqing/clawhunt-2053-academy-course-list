import { Button } from 'tdesign-react';

/**
 * 批量操作条。
 *
 * 订单明写「批量操作只提供批量归档，不要加批量删除或批量上下架」，
 * 因此这里只有一个按钮 —— BULK_ACTIONS 里也只有一项，页面无从渲染出第二个。
 */
export function BulkBar({
  selectedCount,
  archivableCount,
  onBulkArchive,
  onClear,
}: {
  selectedCount: number;
  archivableCount: number;
  onBulkArchive: () => void;
  onClear: () => void;
}) {
  if (selectedCount === 0) return null;
  return (
    <div className="bulk-bar" data-testid="bulk-bar" data-selected={selectedCount}>
      <span className="bulk-bar__text">
        已选择 <b data-testid="bulk-selected-count">{selectedCount}</b> 门课程
        {archivableCount < selectedCount ? (
          <span className="bulk-bar__hint">
            （其中 {selectedCount - archivableCount} 门当前状态不可归档，将被跳过）
          </span>
        ) : null}
      </span>
      <Button
        theme="primary"
        variant="outline"
        size="small"
        disabled={archivableCount === 0}
        data-testid="bulk-archive"
        onClick={onBulkArchive}
      >
        批量归档
      </Button>
      <Button theme="default" variant="text" size="small" data-testid="bulk-clear" onClick={onClear}>
        取消选择
      </Button>
    </div>
  );
}
