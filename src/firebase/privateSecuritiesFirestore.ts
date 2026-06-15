import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { SecuritiesAccount } from '../types'
import {
  GUEST_HOUSEHOLD_ID,
  guestGetCollection,
  guestAddCollectionItem,
  guestUpdateCollectionItem,
  guestRemoveCollectionItem,
} from './guestStore'

// 本人のみ表示の証券口座は users/{uid}/privateSecuritiesAccounts に保存。
// 世帯用 (households/{hid}/securitiesAccounts) と完全に分離する。
//
// ゲストモードでは uid が無いため、guestStore の collections に
// 'privateSecuritiesAccounts' キーで保存する（GuestStoreData 側に追加済み）。

const SUB_PATH = 'privateSecuritiesAccounts'

function isGuest(uid: string): boolean {
  return uid === GUEST_HOUSEHOLD_ID
}

export async function fetchPrivateSecuritiesAccounts(uid: string): Promise<SecuritiesAccount[]> {
  if (isGuest(uid)) return guestGetCollection<SecuritiesAccount>(SUB_PATH)
  const snap = await getDocs(collection(db, 'users', uid, SUB_PATH))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as SecuritiesAccount)
}

export async function addPrivateSecuritiesAccount(
  uid: string,
  data: Omit<SecuritiesAccount, 'id'>,
): Promise<string> {
  if (isGuest(uid)) return guestAddCollectionItem<SecuritiesAccount>(SUB_PATH, data)
  const ref = await addDoc(collection(db, 'users', uid, SUB_PATH), data)
  return ref.id
}

export async function updatePrivateSecuritiesAccount(
  uid: string,
  id: string,
  data: Partial<Omit<SecuritiesAccount, 'id'>>,
): Promise<void> {
  if (isGuest(uid)) {
    guestUpdateCollectionItem(SUB_PATH, id, data as Record<string, unknown>)
    return
  }
  await updateDoc(doc(db, 'users', uid, SUB_PATH, id), data)
}

export async function deletePrivateSecuritiesAccount(uid: string, id: string): Promise<void> {
  if (isGuest(uid)) {
    guestRemoveCollectionItem(SUB_PATH, id)
    return
  }
  await deleteDoc(doc(db, 'users', uid, SUB_PATH, id))
}

/** 世帯共有 + 本人プライベートを統合取得（visibility タグ付き） */
export async function fetchAllSecuritiesAccountsForUser(
  householdId: string,
  uid: string | null,
): Promise<SecuritiesAccount[]> {
  const { fetchSecuritiesAccounts } = await import('./securitiesFirestore')
  const sharedPromise = fetchSecuritiesAccounts(householdId)
  // ゲスト世帯の場合は private 取得元も guest store と共有しているため、guest扱いの uid を渡す
  const privateUid = householdId === GUEST_HOUSEHOLD_ID ? GUEST_HOUSEHOLD_ID : uid
  const privatePromise = privateUid ? fetchPrivateSecuritiesAccounts(privateUid) : Promise.resolve([])
  const [shared, priv] = await Promise.all([sharedPromise, privatePromise])
  return [
    ...shared.map(a => ({ ...a, visibility: 'shared' as const })),
    ...priv.map(a => ({ ...a, visibility: 'private' as const })),
  ]
}
