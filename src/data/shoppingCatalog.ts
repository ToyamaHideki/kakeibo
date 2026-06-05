// 買い物リストの売り場カテゴリと、一括追加用の商品カタログ。

export const SHOPPING_CATEGORIES = [
  { key: 'veg',    label: '野菜',         emoji: '🥬' },
  { key: 'fruit',  label: '果物',         emoji: '🍌' },
  { key: 'meat',   label: '肉・魚',       emoji: '🥩' },
  { key: 'dairy',  label: '乳・卵',       emoji: '🥚' },
  { key: 'staple', label: 'パン・米',     emoji: '🍞' },
  { key: 'drink',  label: '飲料',         emoji: '🥤' },
  { key: 'frozen', label: '冷凍',         emoji: '❄️' },
  { key: 'deli',   label: '惣菜',         emoji: '🍤' },
  { key: 'season', label: '調味料・乾物', emoji: '🧂' },
  { key: 'snack',  label: 'お菓子',       emoji: '🍫' },
  { key: 'daily',  label: '日用品',       emoji: '🧴' },
] as const

export const UNCATEGORIZED = { key: '', label: '未分類', emoji: '📦' }
export const ORDERED_KEYS = [...SHOPPING_CATEGORIES.map(c => c.key), UNCATEGORIZED.key]

export function categoryOf(key?: string) {
  return SHOPPING_CATEGORIES.find(c => c.key === key) ?? UNCATEGORIZED
}

// 一括追加モーダルで提示する商品。売り場ごとに、必要なら見出し付きの
// サブグループに分けて表示する（label 省略時は見出しなしの単一グループ）。
export interface CatalogSection {
  label?: string
  items: string[]
}

export const SHOPPING_CATALOG: Record<string, CatalogSection[]> = {
  veg: [
    { label: '葉物', items: ['キャベツ', 'レタス', 'ほうれん草', '白菜', '小松菜', 'もやし'] },
    { label: '果菜', items: ['トマト', 'きゅうり', 'なす', 'ピーマン', 'ブロッコリー', 'アボカド'] },
    { label: '根菜', items: ['にんじん', 'じゃがいも', 'たまねぎ', '大根', 'ごぼう', 'れんこん'] },
    { label: '薬味', items: ['ねぎ', 'にんにく', 'しょうが'] },
  ],
  fruit: [
    { items: ['りんご', 'バナナ', 'みかん', 'いちご', 'ぶどう', '梨', 'キウイ', 'レモン'] },
  ],
  meat: [
    { label: '鶏肉', items: ['鶏むね肉', '鶏もも肉', '手羽先', 'ささみ'] },
    { label: '豚肉', items: ['豚バラ肉', '豚こま切れ', '豚ロース'] },
    { label: '牛肉', items: ['牛こま切れ', '牛ステーキ肉'] },
    { label: 'ひき肉・加工', items: ['ひき肉', 'ベーコン', 'ウインナー', 'ハム'] },
    { label: '魚介', items: ['鮭', 'さば', 'まぐろ', 'えび', 'いか', 'あさり'] },
  ],
  dairy: [
    { items: ['牛乳', '卵', 'ヨーグルト', 'チーズ', 'バター', '生クリーム'] },
  ],
  staple: [
    { items: ['米', '食パン', 'パスタ', 'うどん', 'そば', '小麦粉'] },
  ],
  drink: [
    { items: ['水', 'お茶', 'コーヒー', 'ジュース', '炭酸水', 'ビール'] },
  ],
  frozen: [
    { items: ['冷凍うどん', '冷凍野菜', 'アイス', '冷凍餃子', '冷凍チャーハン'] },
  ],
  deli: [
    { items: ['唐揚げ', 'コロッケ', 'サラダ', '弁当', '寿司', '惣菜パン'] },
  ],
  season: [
    { label: '基本調味料', items: ['醤油', '味噌', '塩', '砂糖', '酢'] },
    { label: '油・だし', items: ['サラダ油', 'ごま油', 'オリーブオイル', 'だしの素'] },
    { label: '酒類', items: ['みりん', '料理酒'] },
    { label: 'ソース・たれ', items: ['ケチャップ', 'マヨネーズ', '中濃ソース', 'めんつゆ'] },
    { label: '乾物', items: ['のり', 'わかめ', '鰹節', 'ごま', '片栗粉', 'パン粉'] },
  ],
  snack: [
    { items: ['チョコレート', 'スナック菓子', 'クッキー', 'ガム', 'あめ', 'アイス'] },
  ],
  daily: [
    { items: ['トイレットペーパー', 'ティッシュ', '洗剤（食器用）', '洗剤（洗濯用）', 'シャンプー', '歯磨き粉', 'ゴミ袋', 'ラップ', '乾電池'] },
  ],
}

// 指定カテゴリの全商品名（サブグループを平坦化）
export function catalogNames(key: string): string[] {
  return (SHOPPING_CATALOG[key] ?? []).flatMap(section => section.items)
}
