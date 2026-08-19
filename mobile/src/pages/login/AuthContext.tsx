import React, {createContext, useContext, useEffect, useState} from 'react';
import {FirebaseAuthTypes} from '@react-native-firebase/auth';
import {AuthService} from './AuthService';

interface AuthContextType {
  currentUser: FirebaseAuthTypes.User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<FirebaseAuthTypes.User>;
  signOut: () => Promise<void>;
}

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

  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged(user => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    loading,
    signInWithGoogle: AuthService.signInWithGoogle,
    signOut: AuthService.signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
