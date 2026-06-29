import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Switch, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import GradientText from '@/components/GradientText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import { usersApi } from '@/lib/api';

// Each notification type the user can toggle (key must match backend types)
const NOTIF_TYPES: { key: string; icon: string; label: string; desc: string }[] = [
  { key: 'FRIEND_REQUEST', icon: 'person-add',           label: 'Friend requests',  desc: 'When someone sends you a request' },
  { key: 'FRIEND_ACCEPTED', icon: 'people',              label: 'Friend accepted',  desc: 'When someone accepts your request' },
  { key: 'NEW_MESSAGE',    icon: 'chatbubble',           label: 'Messages',         desc: 'New direct messages' },
  { key: 'ROOM_INVITE',    icon: 'albums',               label: 'Room invites',     desc: 'Invites to watch parties' },
  { key: 'FOLLOW',         icon: 'heart',                label: 'New followers',    desc: 'When someone follows you' },
  { key: 'SUBSCRIBE',      icon: 'star',                 label: 'New subscribers',  desc: 'When someone subscribes to you' },
  { key: 'CONTENT_LIKE',   icon: 'thumbs-up',            label: 'Likes',            desc: 'Likes on your content' },
  { key: 'COMMENT',        icon: 'chatbubble-ellipses',  label: 'Comments',         desc: 'Comments on your content' },
  { key: 'LIVE',           icon: 'radio',                label: 'Live streams',     desc: 'When creators you follow go live' },
  { key: 'SYSTEM',         icon: 'notifications',        label: 'System & updates', desc: 'Important announcements' },
];

const NotificationSettingsScreen = () => {
  const navigation = useNavigation<any>();

  const prefsQuery = useQuery({
    queryKey: ['notification-prefs'],
    queryFn: () => usersApi.getNotificationPrefs(),
  });

  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (prefsQuery.data?.prefs) setPrefs(prefsQuery.data.prefs);
  }, [prefsQuery.data]);

  const mutation = useMutation({
    mutationFn: (partial: Record<string, boolean>) => usersApi.updateNotificationPrefs(partial),
    onError: () => {
      // re-sync from server on failure
      prefsQuery.refetch();
    },
  });

  // value of a single pref (default ON if not set)
  const valueOf = (key: string) => prefs[key] !== false;
  const masterOn = valueOf('ALL');

  const setPref = (key: string, value: boolean) => {
    setPrefs((p) => ({ ...p, [key]: value })); // optimistic
    mutation.mutate({ [key]: value });          // backend merges
  };

  return (
    <ScreenContainer>
      <BrandHeader
        showBack
        onBack={() => navigation.goBack()}
        infoTitle="Notifications"
        infoIntro="Choose exactly what you want to be notified about."
        infoPoints={[
          { icon: 'notifications-off', title: 'Master switch', text: 'Turn everything off with one toggle.' },
          { icon: 'options', title: 'Fine control', text: 'Pick each type you care about.' },
        ]}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: spacing.lg }} showsVerticalScrollIndicator={false}>

        <GradientText variant="h1" center style={styles.pageTitle}>Notifications</GradientText>

        {prefsQuery.isLoading ? (
          <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
        ) : (
          <>
            {/* Master toggle */}
            <View style={styles.masterCard}>
              <View style={styles.iconWrap}><Icon name="notifications" size={18} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <AppText bold>All Notifications</AppText>
                <AppText variant="tiny" color={colors.textSecondary}>
                  {masterOn ? 'Notifications are on' : 'Everything is muted'}
                </AppText>
              </View>
              <Switch
                value={masterOn}
                onValueChange={(v) => setPref('ALL', v)}
                trackColor={{ false: 'rgba(255,255,255,0.2)', true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>

            <AppText variant="tiny" color={colors.textSecondary} style={styles.hint}>
              {masterOn
                ? 'You can fine-tune each type below.'
                : 'Turn on All Notifications to choose individual types.'}
            </AppText>

            {/* Individual types */}
            <View style={[styles.card, !masterOn && { opacity: 0.45 }]}>
              {NOTIF_TYPES.map((t, idx) => (
                <View
                  key={t.key}
                  style={[styles.row, idx < NOTIF_TYPES.length - 1 && styles.rowDivider]}>
                  <View style={styles.iconWrap}><Icon name={t.icon} size={16} color={colors.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="small" bold>{t.label}</AppText>
                    <AppText variant="tiny" color={colors.textSecondary}>{t.desc}</AppText>
                  </View>
                  <Switch
                    value={masterOn && valueOf(t.key)}
                    disabled={!masterOn}
                    onValueChange={(v) => setPref(t.key, v)}
                    trackColor={{ false: 'rgba(255,255,255,0.2)', true: colors.primary }}
                    thumbColor={colors.white}
                  />
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  pageTitle: { lineHeight: 40, paddingBottom: 4, marginBottom: spacing.md },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl },
  masterCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(238,48,99,0.08)',
    borderWidth: 1, borderColor: colors.primary,
    borderRadius: 18, padding: spacing.md,
  },
  hint: { marginTop: spacing.sm, marginBottom: spacing.md, paddingHorizontal: 4 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  iconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(238,48,99,0.15)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
});

export default NotificationSettingsScreen;