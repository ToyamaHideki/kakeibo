import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteField,
  query,
  where,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore'
import { db } from './firebase'

export interface UserProfile {
  householdId: string | null
  displayName: string | null
}

export interface MemberProfile {
  email: string
  nickname?: string | undefined
}

export interface Household {
  memberIds: string[]
  inviteCode: string
  createdAt: number
  payDay?: number
  extraAssignees?: string[]
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return snap.data() as UserProfile
}

export async function saveUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  await setDoc(doc(db, 'users', uid), data, { merge: true })
}

export async function createHousehold(uid: string, displayName: string | null): Promise<string> {
  const householdId = doc(collection(db, 'households')).id
  const inviteCode = generateInviteCode()
  const household: Household = {
    memberIds: [uid],
    inviteCode,
    createdAt: Date.now(),
  }
  await setDoc(doc(db, 'households', householdId), household)
  await saveUserProfile(uid, { householdId, displayName })
  return householdId
}

export type JoinResult =
  | { status: 'success'; householdId: string }
  | { status: 'not_found' }
  | { status: 'switch_needed'; newHouseholdId: string }

export async function joinHousehold(
  uid: string,
  inviteCode: string,
  displayName: string | null,
  options?: { forceSwitch?: boolean },
): Promise<JoinResult> {
  const q = query(collection(db, 'households'), where('inviteCode', '==', inviteCode.toUpperCase()))
  const snapshot = await getDocs(q)
  if (snapshot.empty) return { status: 'not_found' }

  // snapshot.empty チェック後なので必ず存在する
  const householdDoc = snapshot.docs[0]!
  const householdId = householdDoc.id
  const data = householdDoc.data() as Household

  if (!options?.forceSwitch) {
    const profile = await fetchUserProfile(uid)
    if (profile?.householdId && profile.householdId !== householdId) {
      return { status: 'switch_needed', newHouseholdId: householdId }
    }
  }

  if (!data.memberIds.includes(uid)) {
    await updateDoc(doc(db, 'households', householdId), {
      memberIds: [...data.memberIds, uid],
    })
  }
  await saveUserProfile(uid, { householdId, displayName })
  return { status: 'success', householdId }
}

export async function fetchHousehold(householdId: string): Promise<(Household & { id: string }) | null> {
  const snap = await getDoc(doc(db, 'households', householdId))
  if (!snap.exists()) return null
  return { id: snap.id, ...(snap.data() as Household) }
}

export async function refreshInviteCode(householdId: string): Promise<string> {
  const inviteCode = generateInviteCode()
  await updateDoc(doc(db, 'households', householdId), { inviteCode })
  return inviteCode
}

export async function updateHouseholdSettings(
  householdId: string,
  settings: { payDay: number | null }
): Promise<void> {
  await updateDoc(doc(db, 'households', householdId), { payDay: settings.payDay })
}

export async function addExtraAssignee(householdId: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'households', householdId), { extraAssignees: arrayUnion(name) })
}

export async function removeExtraAssignee(householdId: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'households', householdId), { extraAssignees: arrayRemove(name) })
}

export async function fetchMemberProfiles(householdId: string): Promise<Record<string, MemberProfile>> {
  const snap = await getDoc(doc(db, 'households', householdId, 'private', 'memberProfiles'))
  if (snap.exists()) return snap.data() as Record<string, MemberProfile>

  // 旧フィールド（households ドキュメント本体）からの一回限りマイグレーション
  const householdSnap = await getDoc(doc(db, 'households', householdId))
  const oldProfiles = (householdSnap.data() as { memberProfiles?: Record<string, MemberProfile> } | undefined)?.memberProfiles
  if (oldProfiles) {
    await setDoc(doc(db, 'households', householdId, 'private', 'memberProfiles'), oldProfiles)
    await updateDoc(doc(db, 'households', householdId), { memberProfiles: deleteField() })
  }
  return oldProfiles ?? {}
}

export async function updateMemberProfile(
  householdId: string,
  uid: string,
  profile: MemberProfile
): Promise<void> {
  await setDoc(
    doc(db, 'households', householdId, 'private', 'memberProfiles'),
    { [uid]: profile },
    { merge: true }
  )
}
