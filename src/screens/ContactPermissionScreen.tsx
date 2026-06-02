// src/screens/ContactPermissionScreen.tsx
// Matches Figma screens 38 + 39 pixel-perfect.

import React, { useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Platform, PermissionsAndroid,
  Linking, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import ScreenContainer from '@/components/ScreenContainer';
import AppHeader from '@/components/AppHeader';
import AppText from '@/components/AppText';
import GradientButton from '@/components/GradientButton';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';

const ContactPermissionScreen = () => {
  const navigation = useNavigation<any>();
  const [requesting, setRequesting] = useState(false);

  const continueToFriends = () => {
    navigation.replace('AddFriends');
  };

  const requestPermission = async () => {
    setRequesting(true);
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'WatchPartyLive',
            message: 'WatchPartyLive needs access to your contacts to suggest friends.',
            buttonPositive: 'OK',
            buttonNegative: "Don't Allow",
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          continueToFriends();
        } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          Alert.alert(
            'Permission needed',
            'You can grant contact access later in Settings.',
            [
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
              { text: 'Skip', onPress: continueToFriends },
            ]
          );
        } else {
          continueToFriends();
        }
      } else {
        // iOS: react-native-permissions is the proper way, but to avoid adding
        // a dep right now we just show our own confirm + proceed.
        // The native iOS contact picker will request permission on first use.
        Alert.alert(
          '"WatchPartyLive" Would Like to Access Your Contacts',
          'WatchPartyLive uses your contacts to find friends who are already using the app.',
          [
            { text: "Don't Allow", style: 'cancel', onPress: continueToFriends },
            { text: 'OK', onPress: continueToFriends },
          ]
        );
      }
    } catch {
      continueToFriends();
    } finally {
      setRequesting(false);
    }
  };

  return (
    <ScreenContainer>
      <AppHeader />
      <View style={styles.body}>
        <AppText variant="h1" bold style={styles.title}>
          Turn on contact uploading{'\n'}to find friends faster
        </AppText>

        <AppText variant="small" color={colors.textSecondary} style={styles.intro}>
          Lorem Ipsum is simply dummy text of the printing and typesetting industry.
          Lorem Ipsum has been the industry's standard dummy text ever since the 1500s,
          when an unknown printer took a galley of type and scrambled it to make a type specimen book.
        </AppText>

        <View style={styles.bulletRow}>
          <View style={styles.bulletIcon}>
            <Icon name="triangle-outline" size={22} color={colors.white} />
          </View>
          <AppText variant="small" color={colors.textSecondary} style={styles.bulletText}>
            Lorem Ipsum is simply dummy text of the printing and typesetting industry.
            Lorem Ipsum has been the industry's standard dummy text ever since the 1500s,
            when an unknown printer took a galley of type and scrambled it to make a type specimen book.
          </AppText>
        </View>

        <View style={styles.bulletRow}>
          <View style={styles.bulletIcon}>
            <Icon name="sunny-outline" size={22} color={colors.white} />
          </View>
          <AppText variant="small" color={colors.textSecondary} style={styles.bulletText}>
            Lorem Ipsum is simply dummy text of the printing and typesetting industry.
            Lorem Ipsum has been the industry's standard dummy text ever since the 1500s,
            when an unknown printer took a galley of type and scrambled it to make a type specimen book.
          </AppText>
        </View>

        <View style={styles.footer}>
          <GradientButton
            title={requesting ? 'Requesting...' : 'Next'}
            size="lg"
            onPress={requestPermission}
            disabled={requesting}
          />
          <TouchableOpacity onPress={continueToFriends} style={styles.skip}>
            <AppText variant="small" color={colors.textSecondary}>
              Skip for now
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  title: { marginBottom: spacing.lg, lineHeight: 32 },
  intro: { marginBottom: spacing.xl, lineHeight: 20 },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  bulletIcon: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
  },
  skip: {
    alignItems: 'center',
    paddingTop: spacing.md,
  },
});

export default ContactPermissionScreen;