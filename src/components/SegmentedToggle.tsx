// 表示切替用のセグメントトグル。
// グレーのトラック上を白いピルがスライドして選択状態を示す（iOS 風）。
// 月別収支リストのヘッダーで実装したトグルを共通化し、各画面の表示切替 UI を統一する。

interface SegmentedToggleOption<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  options: readonly SegmentedToggleOption<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
}

export default function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = '',
}: Props<T>) {
  const count = options.length
  const activeIndex = Math.max(0, options.findIndex(o => o.value === value))

  return (
    <div className={`bg-gray-100 rounded-xl p-1 ${className}`}>
      <div
        className="relative grid"
        style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
        role="tablist"
        aria-label={ariaLabel}
      >
        {/* スライドするピル */}
        <span
          aria-hidden="true"
          className="absolute top-0 left-0 h-full rounded-lg bg-white shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{ width: `${100 / count}%`, transform: `translateX(${activeIndex * 100}%)` }}
        />
        {options.map(option => {
          const selected = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => { if (!selected) onChange(option.value) }}
              className={`relative z-10 py-2 text-xs font-semibold transition-colors duration-200 ${
                selected ? 'text-sage-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
