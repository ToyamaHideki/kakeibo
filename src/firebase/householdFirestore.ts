import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
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
  nickname?: string
}

export interface Household {
  memberIds: string[]
  inviteCode: string
  createdAt: number
  payDay?: number
  memberProfiles?: Record<string, MemberProfile>
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

export async function joinHousehold(uid: string, inviteCode: string, displayName: string | null): Promise<string | null> {
  const q = query(collection(db, 'households'), where('inviteCode', '==', inviteCode.toUpperCase()))
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null

  const householdDoc = snapshot.docs[0]
  const householdId = householdDoc.id
  const data = householdDoc.data() as Household

  if (!data.memberIds.includes(uid)) {
    await updateDoc(doc(db, 'households', householdId), {
      memberIds: [...data.memberIds, uid],
    })
  }
  await saveUserProfile(uid, { householdId, displayName })
  return householdId
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

export async function updateMemberProfile(
  householdId: string,
  uid: string,
  profile: MemberProfile
): Promise<void> {
  await updateDoc(doc(db, 'households', householdId), {
    [`memberProfiles.${uid}`]: profile,
  })
}
