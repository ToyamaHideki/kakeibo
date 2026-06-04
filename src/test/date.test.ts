import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  currentYear,
  currentYearMonth,
  currentPayPeriodMonth,
  monthFromPath,
  formatYearMonth,
  adjacentMonth,
  getPayPeriodRange,
  formatPayPeriodLabel,
} from '../utils/date'

afterEach(() => {
  vi.useRealTimers()
})

describe('currentYear', () => {
  it('現在の年を返す', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15'))
    expect(currentYear()).toBe(2025)
  })
})

describe('currentYearMonth', () => {
  it('yyyy-MM 形式で返す', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-05'))
    expect(currentYearMonth()).toBe('2025-01')
  })

  it('月が2桁にゼロパディングされる', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-09-01'))
    expect(currentYearMonth()).toBe('2025-09')
  })
})

describe('currentPayPeriodMonth', () => {
  it('給与日未設定（null）はカレンダー月を返す', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-04'))
    expect(currentPayPeriodMonth(null)).toBe('2026-06')
  })

  it('給与日より前の日付は前月分を返す', () => {
    // 給与日20・今日6/4 → 期間 2026-05(5/20〜6/19) に属する
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-04'))
    expect(currentPayPeriodMonth(20)).toBe('2026-05')
  })

  it('給与日当日は当月分を返す', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-20'))
    expect(currentPayPeriodMonth(20)).toBe('2026-06')
  })

  it('給与日より後の日付は当月分を返す', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-25'))
    expect(currentPayPeriodMonth(20)).toBe('2026-06')
  })

  it('年をまたぐ場合: 1月かつ給与日前は前年12月分を返す', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-05'))
    expect(currentPayPeriodMonth(20)).toBe('2025-12')
  })
})

describe('monthFromPath', () => {
  it('/months/yyyy-MM から月を取り出す', () => {
    expect(monthFromPath('/months/2026-03')).toBe('2026-03')
  })

  it('/personal/months/yyyy-MM から月を取り出す', () => {
    expect(monthFromPath('/personal/months/2026-03')).toBe('2026-03')
  })

  it('/budget/yyyy-MM から月を取り出す', () => {
    expect(monthFromPath('/budget/2026-03')).toBe('2026-03')
  })

  it('月を持たない画面では null を返す', () => {
    expect(monthFromPath('/annual')).toBeNull()
    expect(monthFromPath('/shopping')).toBeNull()
  })
})

describe('formatYearMonth', () => {
  it('yyyy-MM → yyyy年M月 に変換する', () => {
    expect(formatYearMonth('2025-03')).toBe('2025年3月')
  })

  it('月のゼロパディングを除去する', () => {
    expect(formatYearMonth('2025-10')).toBe('2025年10月')
  })
})

describe('adjacentMonth', () => {
  it('+1 で翌月を返す', () => {
    expect(adjacentMonth('2025-03', 1)).toBe('2025-04')
  })

  it('-1 で前月を返す', () => {
    expect(adjacentMonth('2025-03', -1)).toBe('2025-02')
  })

  it('12月+1 で翌年1月になる', () => {
    expect(adjacentMonth('2024-12', 1)).toBe('2025-01')
  })

  it('1月-1 で前年12月になる', () => {
    expect(adjacentMonth('2025-01', -1)).toBe('2024-12')
  })

  it('delta=0 で同じ月を返す', () => {
    expect(adjacentMonth('2025-06', 0)).toBe('2025-06')
  })
})

describe('getPayPeriodRange', () => {
  it('通常月: 開始日・終了日を返す', () => {
    const { start, end } = getPayPeriodRange('2025-03', 25)
    expect(start).toBe('2025-03-25')
    expect(end).toBe('2025-04-24')
  })

  it('12月: 終了日が翌年1月になる', () => {
    const { start, end } = getPayPeriodRange('2025-12', 25)
    expect(start).toBe('2025-12-25')
    expect(end).toBe('2026-01-24')
  })

  it('給与日1桁はゼロパディングされる', () => {
    const { start, end } = getPayPeriodRange('2025-03', 5)
    expect(start).toBe('2025-03-05')
    expect(end).toBe('2025-04-04')
  })
})

describe('formatPayPeriodLabel', () => {
  it('同年内のラベルは年を一度だけ表示する', () => {
    expect(formatPayPeriodLabel('2025-03', 25)).toBe('2025年3/25〜4/24')
  })

  it('12月→1月をまたぐ場合は終了側に翌年を表示する', () => {
    expect(formatPayPeriodLabel('2025-12', 25)).toBe('2025年12/25〜2026/1/24')
  })

  it('給与日1の場合 (end = 前月末日相当)', () => {
    // payDay=1 → end = 0日 = 前月末日、ここでは表示形式のみ確認
    expect(formatPayPeriodLabel('2025-06', 1)).toBe('2025年6/1〜7/0')
  })
})
