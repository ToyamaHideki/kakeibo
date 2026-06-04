// announcements/ コレクションへリリースノートを投入するスクリプト。
//
// announcements/ はクライアントから書き込み禁止（firestore.rules: allow write: if false）のため、
// Admin SDK（ルールをバイパス）を使ってローカルから投入する。
//
// 認証は ADC（Application Default Credentials）を利用する。事前に一度だけ以下を実行すること:
//   gcloud auth application-default login
//
// 実行: npm run announce
//   scripts/announcements.json の全件を Firestore へ upsert する。
//   ドキュメントID = version なので、再実行しても重複せず上書きされる（冪等）。

import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const PROJECT_ID = 'kakeibo-app-478c5'

initializeApp({
  credential: applicationDefault(),
  projectId: PROJECT_ID,
})

const db = getFirestore()
const here = dirname(fileURLToPath(import.meta.url))
const items = JSON.parse(readFileSync(join(here, 'announcements.json'), 'utf-8'))

for (const item of items) {
  if (!item.version || !item.title) {
    throw new Error(`version と title は必須です: ${JSON.stringify(item)}`)
  }
  await db.collection('announcements').doc(item.version).set({
    version: item.version,
    title: item.title,
    content: item.content ?? '',
    releasedAt: item.releasedAt ?? Date.now(),
    order: item.order ?? 0,
  })
  console.log(`✓ ${item.version} を投入しました`)
}

console.log(`完了: ${items.length} 件を同期しました`)
process.exit(0)
