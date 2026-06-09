
import React, { useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Platform, PermissionsAndroid,
  Linking, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import GradientText from '@/components/GradientText';
import AppButton from '@/components/AppButton';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';

const BENEFITS = [
  {
    icon: 'flash',
    title: 'Instant friend matches',
    text: 'We securely check your contacts against WatchPartyLive members so you can follow friends in a single tap.',
  },
  {
    icon: 'lock-closed',
    title: 'Private by design',
    text: 'Your contacts are never sold, posted, or shared. They are only used to suggest people you already know.',
  },
  {
    icon: 'people',
    title: 'Better watch parties',
    text: 'Watching together is more fun with people you know. Build your circle before your very first room.',
  },
];

const ContactPermissionScreen = () => {
  const navigation = useNavigation<any>();
  const [requesting, setRequesting] = useState(false);

  const continueToFriends = () => navigation.replace('AddFriends', { fromOnboarding: true });

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
        if (granted === PermissionsAndroid.RESULTS.GRANTED) continueToFriends();
        else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          Alert.alert('Permission needed', 'You can grant contact access later in Settings.', [
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
            { text: 'Skip', onPress: continueToFriends },
          ]);
        } else continueToFriends();
      } else {
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
      <BrandHeader
        infoTitle="Why we ask for contacts"
        infoIntro="This step helps you find friends already on WatchPartyLive. Sharing contacts is optional — you can skip it."
        infoPoints={[
          { icon: 'search', title: 'How it works', text: 'We match your contacts against existing members and show you who to add.' },
          { icon: 'shield-checkmark', title: 'Your privacy', text: 'Contacts are processed securely and never shared with third parties or other users.' },
          { icon: 'play-skip-forward', title: 'Optional', text: 'You can skip this and add friends manually by searching their username anytime.' },
        ]}
      />

      <View style={styles.body}>
        <GradientText variant="h1" style={styles.title}>
          Find your friends{'\n'}faster
        </GradientText>

        <AppText variant="small" color={colors.textSecondary} style={styles.intro}>
          Turn on contact syncing to instantly see which of your friends are already hosting
          watch parties — and invite the ones who haven't joined yet.
        </AppText>

        {BENEFITS.map((b, i) => (
          <View key={i} style={styles.benefitRow}>
            <View style={styles.benefitIcon}>
              <Icon name={b.icon} size={20} color={colors.primary} />
            </View>
            <View style={styles.benefitText}>
              <AppText bold>{b.title}</AppText>
              <AppText variant="small" color={colors.textSecondary} style={{ marginTop: 3, lineHeight: 19 }}>
                {b.text}
              </AppText>
            </View>
          </View>
        ))}

        <View style={styles.footer}>
          <AppButton
            title={requesting ? 'Requesting…' : 'Turn on contact syncing'}
            size="lg"
            fullWidth
            onPress={requestPermission}
            disabled={requesting}
          />
          <TouchableOpacity onPress={continueToFriends} style={styles.skip}>
            <AppText variant="small" color={colors.textSecondary}>Skip for now</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  title: { marginBottom: spacing.md, lineHeight: 40, paddingBottom: 4 },
  intro: { marginBottom: spacing.xl, lineHeight: 21 },
  benefitRow: { flexDirection: 'row', marginBottom: spacing.lg, alignItems: 'flex-start' },
  benefitIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(238,48,99,0.12)',
    borderWidth: 1, borderColor: 'rgba(238,48,99,0.25)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14, marginTop: 2,
  },
  benefitText: { flex: 1 },
  footer: { position: 'absolute', bottom: spacing.xl, left: spacing.lg, right: spacing.lg },
  skip: { alignItems: 'center', paddingTop: spacing.md },
});

export default ContactPermissionScreen;