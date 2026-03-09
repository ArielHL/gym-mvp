import {
  FacebookAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { auth } from '@/services/firebase/client';

export const authService = {
  register: (email: string, password: string) => createUserWithEmailAndPassword(auth, email, password),
  login: (email: string, password: string) => signInWithEmailAndPassword(auth, email, password),
  logout: () => signOut(auth),
  loginWithGoogleIdToken: (idToken: string) => {
    const credential = GoogleAuthProvider.credential(idToken);
    return signInWithCredential(auth, credential);
  },
  loginWithFacebookToken: (accessToken: string) => {
    const credential = FacebookAuthProvider.credential(accessToken);
    return signInWithCredential(auth, credential);
  },
  loginWithAppleToken: (idToken: string, nonce?: string) => {
    const provider = new OAuthProvider('apple.com');
    const credential = provider.credential({ idToken, rawNonce: nonce });
    return signInWithCredential(auth, credential);
  }
};
