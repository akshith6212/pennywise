import React from 'react';
import {create, act} from 'react-test-renderer';
import auth from '@react-native-firebase/auth';

let mockOnAuthStateChanged: jest.Mock;
let mockSignOut: jest.Mock;

jest.mock('@react-native-firebase/auth', () => {
  mockOnAuthStateChanged = jest.fn();
  mockSignOut = jest.fn(() => Promise.resolve());

  return () => ({
    onAuthStateChanged: mockOnAuthStateChanged,
    signOut: mockSignOut,
  });
});

jest.mock('../../src/api/LocalDB', () => ({
  LocalDB: {
    initDB: jest.fn(() => Promise.resolve()),
    clearLocalDBData: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() =>
      Promise.resolve({data: {idToken: 'mock-token'}}),
    ),
    revokeAccess: jest.fn(() => Promise.resolve()),
  },
}));

import {useAuth, UserProfile} from '../../src/hooks/useAuth';
import {Text, View} from 'react-native';

const TestAuthComponent: React.FC = () => {
  const {currentUser, userProfile, isLoading} = useAuth();

  return (
    <View>
      <Text testID="loading">{String(isLoading)}</Text>
      <Text testID="name">{userProfile.name}</Text>
      <Text testID="email">{userProfile.email}</Text>
      <Text testID="hasUser">{String(currentUser !== null)}</Text>
    </View>
  );
};

describe('Auth Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnAuthStateChanged.mockImplementation(() => jest.fn());
  });

  it('starts in loading state', () => {
    mockOnAuthStateChanged.mockImplementation(() => jest.fn());
    const tree = create(<TestAuthComponent />);
    const loadingText = tree.root.findByProps({testID: 'loading'});
    expect(loadingText.props.children).toBe('true');
  });

  it('unauthenticated user has default profile', () => {
    mockOnAuthStateChanged.mockImplementation(callback => {
      callback(null);
      return jest.fn();
    });

    const tree = create(<TestAuthComponent />);
    const nameText = tree.root.findByProps({testID: 'name'});
    const hasUserText = tree.root.findByProps({testID: 'hasUser'});

    expect(nameText.props.children).toBe('Not signed in');
    expect(hasUserText.props.children).toBe('false');
  });

  it('authenticated user shows profile data', () => {
    const mockUser = {
      displayName: 'Test User',
      email: 'test@example.com',
      photoURL: 'https://example.com/photo.jpg',
      uid: 'user-123',
    };

    mockOnAuthStateChanged.mockImplementation(callback => {
      callback(mockUser);
      return jest.fn();
    });

    const tree = create(<TestAuthComponent />);
    const nameText = tree.root.findByProps({testID: 'name'});
    const emailText = tree.root.findByProps({testID: 'email'});
    const hasUserText = tree.root.findByProps({testID: 'hasUser'});

    expect(nameText.props.children).toBe('Test User');
    expect(emailText.props.children).toBe('test@example.com');
    expect(hasUserText.props.children).toBe('true');
  });

  it('sign-out clears local data and signs out of Firebase', async () => {
    const {LocalDB} = require('../../src/api/LocalDB');

    mockOnAuthStateChanged.mockImplementation(callback => {
      callback({
        displayName: 'User',
        email: 'user@test.com',
        photoURL: null,
        uid: 'uid-1',
      });
      return jest.fn();
    });

    let signOutResult: {success: boolean; error?: string} | undefined;

    const SignOutTestComponent: React.FC = () => {
      const {signOut} = useAuth();

      React.useEffect(() => {
        signOut().then(result => {
          signOutResult = result;
        });
      }, []);

      return <View />;
    };

    await act(async () => {
      create(<SignOutTestComponent />);
    });

    expect(LocalDB.clearLocalDBData).toHaveBeenCalled();
    expect(LocalDB.initDB).toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalled();
    expect(signOutResult?.success).toBe(true);
  });

  it('cleans up auth listener on unmount', () => {
    const unsubscribe = jest.fn();
    mockOnAuthStateChanged.mockReturnValue(unsubscribe);

    const tree = create(<TestAuthComponent />);
    tree.unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
