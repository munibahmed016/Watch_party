// src/screens/CreateRoomScreen.tsx
// Name the room → tap YouTube/Vimeo → room creates instantly → RoomScreen opens with WebView player.

import React, { useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView,
  Platform, Switch, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import AppHeader from '@/components/AppHeader';
import AppText from '@/components/AppText';
import AppInput from '@/components/AppInput';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import { roomsApi } from '@/lib/api';
import { queryClient, queryKeys } from '@/lib/queryClient';
import { showApiError } from '@/hooks/useApiErrorAlert';

type Provider = 'YOUTUBE' | 'VIMEO';

const HOMEPAGES: Record<Provider, string> = {
  YOUTUBE: 'https://m.youtube.com',
  VIMEO: 'https://vimeo.com',
};

const CreateRoomScreen = () => {
  const navigation = useNavigation<any>();
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<Provider | null>(null);

  const createMutation = useMutation({
    mutationFn: (provider: Provider) =>
      roomsApi.create({
        name: name.trim() || `Watch Party ${new Date().toLocaleDateString()}`,
        isPrivate,
        videoUrl: HOMEPAGES[provider],
      }),
    onMutate: (provider) => setPendingProvider(provider),
    onSuccess: ({ room }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rooms });
      setPendingProvider(null);
      navigation.replace('Room', { roomId: room.id });
    },
    onError: (err) => {
      setPendingProvider(null);
      showApiError(err, 'Could not create room.');
    },
  });

  const pickProvider = (provider: Provider) => {
    if (createMutation.isPending) return;
    createMutation.mutate(provider);
  };

  return (
    <ScreenContainer>
      <AppHeader title="Create Room" showLogo={false} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          <AppText variant="small" color={colors.textSecondary} center style={styles.sub}>
            Name your room, then pick where to watch.
          </AppText>

          {/* Concentric rings */}
          <View style={styles.ringsWrap}>
            <View style={styles.ring1}>
              <View style={styles.ring2}>
                <View style={styles.ring3}>
                  <Icon name="play" size={42} color="rgba(255,255,255,0.7)" />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.form}>
            <AppInput
              value={name}
              onChangeText={setName}
              placeholder="Room name (e.g. Friday Movie Night)"
              containerStyle={{ marginBottom: spacing.md }}
            />

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <AppText bold>Private room</AppText>
                <AppText variant="tiny" color={colors.textSecondary}>
                  Only people with the code can join.
                </AppText>
              </View>
              <Switch
                value={isPrivate}
                onValueChange={setIsPrivate}
                trackColor={{ false: 'rgba(255,255,255,0.15)', true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>

            <AppText variant="h3" bold style={{ marginTop: spacing.lg, marginBottom: spacing.md }}>
              Connect a Video
            </AppText>

            <View style={styles.providerGrid}>
              <ProviderTile
                label="YouTube"
                icon="youtube-play"
                color="#FF0000"
                onPress={() => pickProvider('YOUTUBE')}
                loading={pendingProvider === 'YOUTUBE'}
                disabled={createMutation.isPending}
              />
              <ProviderTile
                label="Vimeo"
                icon="vimeo"
                color="#1AB7EA"
                onPress={() => pickProvider('VIMEO')}
                loading={pendingProvider === 'VIMEO'}
                disabled={createMutation.isPending}
              />
            </View>

            <AppText variant="tiny" color={colors.textSecondary} center style={{ marginTop: spacing.md }}>
              Netflix / Disney+ / HBO are not supported due to DRM.
            </AppText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const ProviderTile: React.FC<{
  label: string;
  icon: string;
  color: string;
  onPress: () => void;
  loading: boolean;
  disabled: boolean;
}> = ({ label, icon, color, onPress, loading, disabled }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    style={[styles.providerTile, disabled && !loading && { opacity: 0.4 }]}
    activeOpacity={0.85}>
    <View style={[styles.providerIcon, { backgroundColor: color }]}>
      {loading
        ? <ActivityIndicator color="#fff" />
        : <FAIcon name={icon} size={32} color={colors.white} />
      }
    </View>
    <AppText variant="tiny" bold center style={{ marginTop: 8 }}>{label}</AppText>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  sub: { paddingHorizontal: spacing.lg, marginBottom: spacing.md, marginTop: spacing.sm },
  ringsWrap: { alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  ring1: {
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(238,48,99,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  ring2: {
    width: 170, height: 170, borderRadius: 85,
    backgroundColor: 'rgba(238,48,99,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  ring3: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 3, borderColor: 'rgba(238,48,99,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  form: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  providerGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.xl,
  },
  providerTile: { alignItems: 'center' },
  providerIcon: {
    width: 90, height: 90, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
});

export default CreateRoomScreen;