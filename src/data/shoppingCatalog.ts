// 買い物リストの売り場カテゴリと、一括追加用の商品カタログ。

export const SHOPPING_CATEGORIES = [
  { key: 'veg',    label: '野菜',         emoji: '🥬' },
  { key: 'fruit',  label: '果物',         emoji: '🍌' },
  { key: 'meat',   label: '肉・魚',       emoji: '🥩' },
  { key: 'dairy',  label: '乳・卵',       emoji: '🥚' },
  { key: 'soy',    label: '大豆製品',     emoji: '🫘' },
  { key: 'staple', label: 'パン・米',     emoji: '🍞' },
  { key: 'drink',  label: '飲料',         emoji: '🥤' },
  { key: 'frozen', label: '冷凍',         emoji: '❄️' },
  { key: 'deli',   label: '惣菜',         emoji: '🍤' },
  { key: 'season', label: '調味料・乾物', emoji: '🧂' },
  { key: 'snack',  label: 'お菓子',       emoji: '🍫' },
  { key: 'daily',  label: '日用品',       emoji: '🧴' },
  { key: 'baby',   label: 'ベビー用品',   emoji: '👶' },
  { key: 'kids',   label: '子供用品',     emoji: '🧒' },
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
    { label: '果物', items: ['りんご', 'バナナ', '梨', 'キウイ', '柿'] },
    { label: 'ベリー・房', items: ['いちご', 'ぶどう', 'ブルーベリー'] },
    { label: '柑橘', items: ['みかん', 'レモン', 'オレンジ', 'グレープフルーツ'] },
  ],
  meat: [
    { label: '鶏肉', items: ['鶏むね肉', '鶏もも肉', '手羽先', 'ささみ'] },
    { label: '豚肉', items: ['豚バラ肉', '豚こま切れ', '豚ロース'] },
    { label: '牛肉', items: ['牛こま切れ', '牛ステーキ肉'] },
    { label: 'ひき肉', items: ['鶏むね肉(ひき肉)', '鶏もも肉(ひき肉)', '豚ひき肉', '牛ひき肉', '合いびき肉'] },
    { label: '加工肉', items: ['ベーコン', 'ウインナー', 'ハム'] },
    { label: '魚介', items: ['鮭', 'さば', 'まぐろ', 'えび', 'いか', 'あさり'] },
  ],
  dairy: [
    { label: '牛乳・ヨーグルト', items: ['牛乳', 'ヨーグルト', '飲むヨーグルト', 'ベビー用ヨーグルト'] },
    { label: 'チーズ', items: ['スライスチーズ', '粉チーズ', 'ピザ用チーズ', '6Pチーズ', 'クリームチーズ', 'モッツァレラチーズ'] },
    { label: 'バター・クリーム', items: ['バター', 'マーガリン', '生クリーム'] },
    { label: '卵', items: ['卵'] },
  ],
  soy: [
    { label: '豆腐', items: ['豆腐', '絹豆腐', '木綿豆腐'] },
    { label: '納豆', items: ['納豆', 'ひきわり納豆'] },
    { label: '豆乳', items: ['豆乳', '調整豆乳'] },
    { label: '揚げ・厚揚げ', items: ['油揚げ', '厚揚げ', 'がんもどき'] },
    { label: 'その他', items: ['きなこ', 'おから', '高野豆腐'] },
  ],
  staple: [
    { label: '米', items: ['米', '無洗米', 'もち米'] },
    { label: 'パン', items: ['食パン', '菓子パン', 'ロールパン', 'バゲット'] },
    { label: '麺類', items: ['パスタ', 'うどん', 'そば', 'ラーメン', 'そうめん'] },
    { label: '粉物', items: ['小麦粉', '強力粉', 'ホットケーキミックス'] },
  ],
  drink: [
    { label: '水・お茶', items: ['水', 'お茶', '麦茶', '緑茶', 'ほうじ茶'] },
    { label: 'コーヒー・紅茶', items: ['コーヒー', 'インスタントコーヒー', '缶コーヒー', '紅茶'] },
    { label: 'ジュース', items: ['オレンジジュース', 'りんごジュース', '野菜ジュース'] },
    { label: '炭酸', items: ['炭酸水', 'コーラ', 'サイダー'] },
    { label: 'アルコール', items: ['ビール', '缶チューハイ', 'ワイン', '日本酒'] },
    { label: 'スポーツ・健康', items: ['スポーツドリンク', 'エナジードリンク', '経口補水液'] },
  ],
  frozen: [
    { label: '麺・主食', items: ['冷凍うどん', '冷凍チャーハン', '冷凍パスタ', '冷凍ピザ'] },
    { label: 'おかず', items: ['冷凍餃子', '冷凍唐揚げ', '冷凍コロッケ', '冷凍ハンバーグ'] },
    { label: '野菜・素材', items: ['冷凍野菜', '冷凍ブロッコリー', '冷凍ほうれん草', '冷凍枝豆'] },
    { label: 'アイス', items: ['アイス', 'アイスクリーム', 'シャーベット'] },
  ],
  deli: [
    { label: '揚げ物', items: ['唐揚げ', 'コロッケ', 'とんかつ', 'メンチカツ'] },
    { label: 'サラダ・副菜', items: ['サラダ', 'ポテトサラダ', '煮物'] },
    { label: '弁当・寿司', items: ['弁当', '寿司', 'おにぎり'] },
    { label: 'パン・主食', items: ['惣菜パン'] },
  ],
  season: [
    { label: '基本調味料', items: ['醤油', '味噌', '塩', '砂糖', '酢'] },
    { label: '酒類', items: ['みりん', '料理酒'] },
    { label: '油', items: ['サラダ油', 'ごま油', 'オリーブオイル'] },
    { label: '出汁', items: ['だしの素', '出汁パック', '鰹節'] },
    { label: 'ソース・たれ', items: ['ケチャップ', 'マヨネーズ', '中濃ソース', 'めんつゆ'] },
    { label: '乾物', items: ['のり', 'わかめ', 'ごま', '片栗粉', 'パン粉'] },
  ],
  snack: [
    { label: 'チョコレート', items: ['チョコレート', 'チョコ菓子'] },
    { label: 'スナック', items: ['スナック菓子', 'ポテトチップス', 'おせんべい'] },
    { label: 'ビスケット・クッキー', items: ['クッキー', 'ビスケット', 'ウエハース'] },
    { label: 'グミ・あめ・ガム', items: ['グミ', 'あめ', 'ガム'] },
    { label: '和菓子', items: ['どら焼き', '大福', 'まんじゅう'] },
  ],
  daily: [
    { label: '紙類', items: ['トイレットペーパー', 'ティッシュ', 'キッチンペーパー'] },
    { label: '洗剤', items: ['洗剤（食器用）', '洗剤（洗濯用）', '漂白剤', '柔軟剤'] },
    { label: '入浴・ヘアケア', items: ['シャンプー', 'リンス', 'ボディソープ', 'ハンドソープ'] },
    { label: 'オーラルケア', items: ['歯ブラシ', '歯磨き粉'] },
    { label: 'キッチン消耗品', items: ['ラップ', 'アルミホイル', 'ジップロック'] },
    { label: 'ゴミ袋・電池', items: ['ゴミ袋', '乾電池'] },
  ],
  baby: [
    { label: 'おむつ・おしりまわり', items: ['紙おむつ', 'パンツタイプおむつ', 'おしりふき', 'おむつ用ゴミ袋'] },
    { label: '授乳・ミルク', items: ['粉ミルク', '液体ミルク', '哺乳瓶', '哺乳瓶用乳首', '哺乳瓶洗剤', '母乳パッド'] },
    { label: '離乳食', items: ['ベビーフード', '離乳食用おかゆ', 'ベビー麦茶', 'ベビー用おやつ'] },
    { label: '衛生・スキンケア', items: ['ベビーシャンプー', 'ベビーソープ', 'ベビーローション', 'ベビーオイル', 'ベビー綿棒'] },
    { label: '衣類・雑貨', items: ['スタイ', 'ガーゼ', 'おくるみ', 'ベビー用洗剤', 'ベビー用柔軟剤'] },
  ],
  kids: [
    { label: '文房具', items: ['鉛筆', '消しゴム', '色鉛筆', 'クレヨン', 'のり', 'はさみ', 'ノート', '自由帳'] },
    { label: '学用品', items: ['連絡帳', '上履き', '体操着', '給食袋', '水筒', 'お弁当箱'] },
    { label: '衛生・身だしなみ', items: ['子供用歯ブラシ', '子供用シャンプー', 'ハンカチ', 'ポケットティッシュ'] },
    { label: 'おやつ・補食', items: ['子供用お菓子', 'ゼリー', 'ジュース（紙パック）'] },
  ],
}

// 指定カテゴリの全商品名（サブグループを平坦化）
export function catalogNames(key: string): string[] {
  return (SHOPPING_CATALOG[key] ?? []).flatMap(section => section.items)
}
