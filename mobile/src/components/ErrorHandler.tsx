import React, {useEffect, useState} from 'react';
import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import auth from '@react-native-firebase/auth';

import {useAppTheme} from '../styles/theme';

interface ErrorModalProps {
  visible: boolean;
  message: string;
  onClose: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({
  visible,
  message,
  onClose,
}) => {
  const theme = useAppTheme();

  const handleSignOut = async () => {
    try {
      await auth().signOut();
      onClose();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.dialog, {backgroundColor: theme.bgCard}]}>
          <Icon name="error" size={40} color={theme.accentRed} />
          <Text style={[styles.title, {color: theme.accentRed}]}>
            Access Denied
          </Text>
          <Text style={[styles.message, {color: theme.textSecondary}]}>
            {message}
          </Text>
          <Pressable
            onPress={handleSignOut}
            style={[styles.button, {backgroundColor: theme.accentRed}]}>
            <Text style={[styles.buttonText, {color: theme.textWhite}]}>
              Sign In Again
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

let globalShowError: ((message: string) => void) | null = null;

export const ErrorHandlerProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [visible, setVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    globalShowError = (message: string) => {
      setErrorMessage(message);
      setVisible(true);
    };
    return () => {
      globalShowError = null;
    };
  }, []);

  return (
    <>
      {children}
      <ErrorModal
        visible={visible}
        message={errorMessage}
        onClose={() => setVisible(false)}
      />
    </>
  );
};

export const ErrorHandlers = {
  handleApiError: (error: unknown) => {
    console.error('API Error:', error);

    let status: unknown;
    if (typeof error === 'object' && error !== null) {
      status =
        (error as {code?: unknown; response?: {status?: unknown}}).code ||
        (error as {code?: unknown; response?: {status?: unknown}}).response
          ?.status;
    }

    const isAuthError =
      status === 401 ||
      status === 403 ||
      (typeof status === 'string' &&
        (status.includes('permission-denied') ||
          status.includes('unauthenticated') ||
          status.includes('auth/')));

    if (
      isAuthError ||
      (typeof status === 'number' && status >= 400 && status < 500)
    ) {
      ErrorHandlers.showAccessDeniedModal();
    }

    return error;
  },

  showAccessDeniedModal: (customMessage?: string) => {
    const message =
      customMessage ||
      "You don't have access to this application or your session has expired.";
    if (globalShowError) {
      globalShowError(message);
    }
  },
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    width: '80%',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  title: {fontSize: 18, fontWeight: '700', marginTop: 12, marginBottom: 8},
  message: {fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20},
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {fontSize: 14, fontWeight: '600'},
});
