/**
 * カテゴリカラーをオーガニック/アースカラーへ移行するスクリプト
 * 実行: node scripts/migrate-category-colors.mjs
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'
import { initializeApp } from 'firebase/app'
import { collection, getDocs, updateDoc, doc, getFirestore } from 'firebase/firestore'

// .env.local を読み込み
function loadEnv(path) {
  const env = {}
  try {
    const content = readFileSync(path, 'utf-8')
    for (const line of content.split('\n')) {
      const match = line.match(/^([^#=]+)=(.*)$/)
      if (match) env[match[1].trim()] = match[2].trim()
    }
  } catch {
    console.error('.env.local が見つかりません')
    process.exit(1)
  }
  return env
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const env = loadEnv(join(__dirname, '..', '.env.local'))

const firebaseConfig = {
  apiKey:            env.VITE_FIREBASE_API_KEY,
  authDomain:        env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             env.VITE_FIREBASE_APP_ID,
}

// ── カラーマッピング ────────────────────────────────────────────────────────
// プリセット14色 → オーガニック版
const PRESET_COLOR_MAP = {
  '#ef4444': '#d4553a',  // red      → terracotta
  '#f97316': '#c87a40',  // orange   → burnt orange
  '#eab308': '#b08a28',  // yellow   → mustard
  '#22c55e': '#5a8a43',  // green    → sage
  '#10b981': '#3a8a6a',  // emerald  → moss green
  '#06b6d4': '#287a8a',  // cyan     → teal
  '#3b82f6': '#4a72a0',  // blue     → muted blue
  '#0ea5e9': '#2e7aa0',  // sky      → slate blue
  '#8b5cf6': '#7060a0',  // violet   → dusty violet
  '#a855f7': '#7a52a0',  // purple   → dusty purple
  '#ec4899': '#a85880',  // pink     → dusty rose
  '#f43f5e': '#c04858',  // rose     → terracotta rose
  '#64748b': '#64748b',  // slate    → (そのまま)
  '#9ca3af': '#9ca3af',  // gray     → (そのまま)
}

// ── HSL変換（プリセット外のカスタムカラー用フォールバック） ───────────────

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s
  const l = (max + min) / 2

  if (max === min) {
    h = s = 0
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100
  let r, g, b
  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  }
}

function rgbToHex({ r, g, b }) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

// カスタムカラーの彩度を落としてオーガニック風に
function adjustCustomColor(hex) {
  const { r, g, b } = hexToRgb(hex)
  const { h, s, l } = rgbToHsl(r, g, b)

  // 低彩度はそのまま
  if (s < 20) return hex

  // 彩度を 55% 以下に抑制（元の値が低ければそのまま）
  const newS = Math.min(55, s)
  // 明度を 38〜52% に収める
  const newL = Math.min(52, Math.max(38, l))

  return rgbToHex(hslToRgb(h, newS, newL))
}

// ── メイン処理 ─────────────────────────────────────────────────────────────

async function main() {
  const app = initializeApp(firebaseConfig)
  const db = getFirestore(app)

  console.log('\n📋 categories コレクションを取得中...')
  const snapshot = await getDocs(collection(db, 'categories'))

  if (snapshot.empty) {
    console.log('カテゴリが登録されていません。')
    process.exit(0)
  }

  console.log(`\n${snapshot.size} 件のカテゴリが見つかりました:\n`)

  const updates = []
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data()
    const oldColor = (data.color ?? '').toLowerCase()
    const newColor = PRESET_COLOR_MAP[oldColor] ?? adjustCustomColor(oldColor)
    const changed = oldColor !== newColor

    console.log(
      `  ${changed ? '✏️ ' : '  '} [${data.type}] ${data.name.padEnd(14)} ${oldColor}  →  ${newColor}${changed ? '' : ' (変更なし)'}`
    )

    if (changed) {
      updates.push({ id: docSnap.id, newColor })
    }
  }

  if (updates.length === 0) {
    console.log('\n変更対象のカテゴリはありませんでした。')
    process.exit(0)
  }

  console.log(`\n${updates.length} 件を更新します...`)

  for (const { id, newColor } of updates) {
    await updateDoc(doc(db, 'categories', id), { color: newColor })
  }

  console.log('\n✅ 更新完了！\n')
  process.exit(0)
}

main().catch(err => {
  console.error('エラー:', err)
  process.exit(1)
})
