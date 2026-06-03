import { lazy, type ComponentType } from 'react'

// デプロイ更新で古いチャンク名が解決できないと dynamic import が失敗するため、
// その場合のみ自動で1度だけリロードして新しい index.html を取得する
export const CHUNK_RELOAD_KEY = 'kakeibo:chunk-reloaded'

export function isChunkLoadError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err)
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Failed to load module script') ||
    message.includes('Importing a module script failed')
  )
}

// factory の成否に応じてフラグ管理とリロードを行う。
// テストで React.lazy の内部APIに依存しないよう、純粋関数として独立させる。
export async function handleChunkLoad<T>(factory: () => Promise<T>): Promise<T> {
  try {
    const mod = await factory()
    sessionStorage.removeItem(CHUNK_RELOAD_KEY)
    return mod
  } catch (err) {
    if (isChunkLoadError(err) && !sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
      window.location.reload()
      return new Promise<T>(() => {})
    }
    throw err
  }
}

export function lazyWithReload<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(() => handleChunkLoad(factory))
}
