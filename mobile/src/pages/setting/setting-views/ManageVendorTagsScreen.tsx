import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useAppTheme} from '../../../styles/theme';

const ManageVendorTagsScreen: React.FC = () => {
  const theme = useAppTheme();

  return (
    <View style={[styles.container, {backgroundColor: theme.bgPrimary}]}>
      <Text style={[styles.title, {color: theme.textPrimary}]}>
        Manage Vendor Tags
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  title: {fontSize: 24, fontWeight: 'bold'},
});

export default ManageVendorTagsScreen;
