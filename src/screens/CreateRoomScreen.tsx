import React, { useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView,
  Platform, Switch, ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import AppInput from '@/components/AppInput';
import GradientText from '@/components/GradientText';
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
      <BrandHeader
        infoTitle="Creating a room"
        infoIntro="Spin up a watch party in seconds and invite friends with a room code."
        infoPoints={[
          { icon: 'create', title: 'Name it', text: 'Give your room a name so friends know what they are joining.' },
          { icon: 'lock-closed', title: 'Private rooms', text: 'Turn on private to require the room code before anyone can join.' },
          { icon: 'logo-youtube', title: 'Pick a source', text: 'Tap YouTube or Vimeo — the room opens instantly with the player ready.' },
        ]}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <GradientText variant="h1" center style={styles.title}>Create Room</GradientText>
          <AppText variant="small" color={colors.textSecondary} center style={styles.sub}>
            Name your room, then pick where to watch.
          </AppText>

          {/* Gradient play rings */}
          <View style={styles.ringsWrap}>
            <View style={styles.ring1}>
              <View style={styles.ring2}>
                <View style={styles.ring3}>
                  <LinearGradient
                    colors={colors.buttonGradient as unknown as string[]}
                    start={colors.gradientStartPoint}
                    end={colors.gradientEndPoint}
                    style={StyleSheet.absoluteFillObject}
                    pointerEvents="none"
                  />
                  <Icon name="play" size={42} color={colors.white} />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.form}>
            <AppInput value={name} onChangeText={setName}
              placeholder="Room name (e.g. Friday Movie Night)"
              containerStyle={{ marginBottom: spacing.md }} />

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <AppText bold>Private room</AppText>
                <AppText variant="tiny" color={colors.textSecondary}>Only people with the code can join.</AppText>
              </View>
              <Switch value={isPrivate} onValueChange={setIsPrivate}
                trackColor={{ false: 'rgba(255,255,255,0.15)', true: colors.primary }} thumbColor={colors.white} />
            </View>

            <GradientText variant="h3" style={styles.sectionTitle}>Connect a Video</GradientText>

            <View style={styles.providerGrid}>
              <ProviderTile label="YouTube" icon="youtube-play" color="#FF0000"
                onPress={() => pickProvider('YOUTUBE')} loading={pendingProvider === 'YOUTUBE'} disabled={createMutation.isPending} />
              <ProviderTile label="Vimeo" icon="vimeo" color="#1AB7EA"
                onPress={() => pickProvider('VIMEO')} loading={pendingProvider === 'VIMEO'} disabled={createMutation.isPending} />
            </View>

            <AppText variant="tiny" color={colors.textMuted} center style={{ marginTop: spacing.md }}>
              Netflix / Disney+ / HBO are not supported due to DRM.
            </AppText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const ProviderTile: React.FC<{
  label: string; icon: string; color: string; onPress: () => void; loading: boolean; disabled: boolean;
}> = ({ label, icon, color, onPress, loading, disabled }) => (
  <TouchableOpacity onPress={onPress} disabled={disabled}
    style={[styles.providerTile, disabled && !loading && { opacity: 0.4 }]} activeOpacity={0.85}>
    <View style={[styles.providerIcon, { backgroundColor: color }]}>
      {loading ? <ActivityIndicator color="#fff" /> : <FAIcon name={icon} size={36} color={colors.white} />}
    </View>
    <AppText variant="small" bold center style={{ marginTop: 10 }}>{label}</AppText>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  title: { lineHeight: 40, paddingBottom: 4, marginTop: spacing.sm },
  sub: { paddingHorizontal: spacing.lg, marginBottom: spacing.md, marginTop: spacing.xs },
  sectionTitle: { marginTop: spacing.lg, marginBottom: spacing.md, lineHeight: 28, paddingBottom: 3 },
  ringsWrap: { alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  ring1: { width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(238,48,99,0.05)', alignItems: 'center', justifyContent: 'center' },
  ring2: { width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(238,48,99,0.1)', alignItems: 'center', justifyContent: 'center' },
  ring3: {
    width: 120, height: 120, borderRadius: 60, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  form: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  providerGrid: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: spacing.xl },
  providerTile: { alignItems: 'center' },
  providerIcon: {
    width: 96, height: 96, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
});

export default CreateRoomScreen;