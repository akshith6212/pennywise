import React, {createContext, useContext, useEffect, useState} from 'react';
import {FirebaseAuthTypes} from '@react-native-firebase/auth';
import {AuthService} from './AuthService';

export interface UserProfile {
  name: string;
  email: string;
  photoUrl: string | null;
  uid: string | null;
}

interface AuthContextType {
  currentUser: FirebaseAuthTypes.User | null;
  userProfile: UserProfile;
  loading: boolean;
  isLoading: boolean;
  signInWithGoogle: () => Promise<FirebaseAuthTypes.User>;
  signOut: () => Promise<{success: boolean; error?: string}>;
}

const defaultProfile: UserProfile = {
  name: 'Not signed in',
  email: 'Please sign in',
  photoUrl: null,
  uid: null,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] =
    useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile>(defaultProfile);

  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged(user => {
      setCurrentUser(user);
      setLoading(false);

      if (user) {
        setUserProfile({
          name: user.displayName || 'User',
          email: user.email || 'No email',
          photoUrl: user.photoURL,
          uid: user.uid,
        });
      } else {
        setUserProfile(defaultProfile);
      }
    });

    return unsubscribe;
  }, []);

  const handleSignOut = async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      await AuthService.signOut();
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

  const value: AuthContextType = {
    currentUser,
    userProfile,
    loading,
    isLoading: loading,
    signInWithGoogle: AuthService.signInWithGoogle,
    signOut: handleSignOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
