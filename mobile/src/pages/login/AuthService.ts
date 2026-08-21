import auth, {FirebaseAuthTypes} from '@react-native-firebase/auth';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {LocalDB} from '../../api/LocalDB';

const GOOGLE_WEB_CLIENT_ID = '';

if (!GOOGLE_WEB_CLIENT_ID) {
  console.error(
    'GOOGLE_WEB_CLIENT_ID is not set. ' +
      'Copy the web client ID (client_type: 3) from google-services.json ' +
      'and set it in AuthService.ts.',
  );
}

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
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
