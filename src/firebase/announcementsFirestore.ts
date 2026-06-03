import { collection, getDocs } from 'firebase/firestore'
import type { Announcement } from '../types'
import { db } from './firebase'

// announcements/ はトップレベル・読み取り専用コレクション。
// リリースノート相当の内容を Firebase Console から手動投入する運用。
export async function fetchAnnouncements(): Promise<Announcement[]> {
  const snapshot = await getDocs(collection(db, 'announcements'))
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Announcement)
}
