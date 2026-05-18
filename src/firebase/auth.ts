import { GoogleAuthProvider, signInWithRedirect, signOut as firebaseSignOut } from 'firebase/auth'
import { auth } from './firebase'

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider()
  return signInWithRedirect(auth, provider)
}

export function signInAsGuest(): void {
  window.dispatchEvent(new CustomEvent('kakeibo:guest-mode'))
}

export function signOut() {
  return firebaseSignOut(auth)
}
