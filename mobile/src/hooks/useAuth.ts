import {useEffect, useState} from 'react';
import auth, {FirebaseAuthTypes} from '@react-native-firebase/auth';
import {LocalDB} from '../api/LocalDB';

export interface UserProfile {
  name: string;
  email: string;
  photoUrl: string | null;
  uid: string | null;
}

export const useAuth = () => {
  const [currentUser, setCurrentUser] =
    useState<FirebaseAuthTypes.User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'Loading...',
    email: 'Loading...',
    photoUrl: null,
    uid: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(user => {
      setCurrentUser(user);
      setIsLoading(false);

      if (user) {
        setUserProfile({
          name: user.displayName || 'User',
          email: user.email || 'No email',
          photoUrl: user.photoURL,
          uid: user.uid,
        });
      } else {
        setUserProfile({
          name: 'Not signed in',
          email: 'Please sign in',
          photoUrl: null,
          uid: null,
        });
      }
    });

    return unsubscribe;
  }, []);

  const signOut = async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      await LocalDB.clearLocalDBData();
      await LocalDB.initDB();
      await auth().signOut();
      return {success: true};
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error during sign out',
      };
    }
  };

  return {currentUser, userProfile, isLoading, signOut};
};
