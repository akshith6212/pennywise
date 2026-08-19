import auth, {FirebaseAuthTypes} from '@react-native-firebase/auth';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {LocalDB} from '../../api/LocalDB';

GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID_FROM_GOOGLE_SERVICES_JSON',
});

export const AuthService = {
  signInWithGoogle: async (): Promise<FirebaseAuthTypes.User> => {
    try {
      await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken;

      if (!idToken) {
        throw new Error('No ID token received from Google Sign-In');
      }

      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const userCredential = await auth().signInWithCredential(googleCredential);
      return userCredential.user;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  },

  signOut: async (): Promise<void> => {
    try {
      await LocalDB.clearLocalDBData();
      await LocalDB.initDB();
      try {
        await GoogleSignin.revokeAccess();
      } catch {
        // revokeAccess can fail if user wasn't signed in via Google
      }
      await auth().signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  },

  getCurrentUser: (): FirebaseAuthTypes.User | null => {
    return auth().currentUser;
  },

  onAuthStateChanged: (
    callback: (user: FirebaseAuthTypes.User | null) => void,
  ): (() => void) => {
    return auth().onAuthStateChanged(callback);
  },
};
