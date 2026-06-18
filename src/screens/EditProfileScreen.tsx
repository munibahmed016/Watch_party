import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { launchCamera, launchImageLibrary, ImagePickerResponse, MediaType, PhotoQuality } from 'react-native-image-picker';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import AppInput from '@/components/AppInput';
import AppButton from '@/components/AppButton';
import GradientText from '@/components/GradientText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import { usersApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { showApiError } from '@/hooks/useApiErrorAlert';

const EditProfileScreen = () => {
  const navigation = useNavigation<any>();
  const { user, setUser } = useAuth();

  const [name, setName] = useState(user?.fullName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const pickAvatar = (source: 'camera' | 'library') => {
    const opts = { mediaType: 'photo' as MediaType, maxWidth: 1024, maxHeight: 1024, quality: 0.85 as PhotoQuality };
    const launcher = source === 'camera' ? launchCamera : launchImageLibrary;
    launcher(opts, async (response: ImagePickerResponse) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert('Image picker', response.errorMessage || 'Could not pick image');
        return;
      }
      const asset = response.assets?.[0];
      if (!asset?.uri) return;
      setUploading(true);
      try {
        const { user: updated } = await usersApi.uploadAvatar(asset.uri, asset.type || 'image/jpeg');
        await setUser(updated);
      } catch (err) {
        showApiError(err, 'Upload failed.');
      } finally {
        setUploading(false);
      }
    });
  };

  const showAvatarMenu = () => {
    Alert.alert('Change photo', undefined, [
      { text: 'Take photo', onPress: () => pickAvatar('camera') },
      { text: 'Choose from library', onPress: () => pickAvatar('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload: { fullName?: string; username?: string; bio?: string } = {};
      if (name.trim() && name !== user?.fullName) payload.fullName = name.trim();
      if (username.trim() && username !== user?.username) payload.username = username.trim().toLowerCase();
      if (bio !== (user?.bio || '')) payload.bio = bio;
      if (Object.keys(payload).length === 0) { navigation.goBack(); return; }
      const { user: updated } = await usersApi.updateMe(payload);
      await setUser(updated);
      navigation.goBack();
    } catch (err) {
      showApiError(err, 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer>
      <BrandHeader
        infoTitle="Editing your profile"
        infoIntro="Your profile is how friends recognise you across WatchPartyLive."
        infoPoints={[
          { icon: 'image', title: 'Profile photo', text: 'Tap the camera badge to change your picture anytime.' },
          { icon: 'at', title: 'Username', text: 'Your unique handle — friends use it to find and tag you.' },
          { icon: 'document-text', title: 'Bio', text: 'Add a short line about yourself to stand out in rooms.' },
        ]}
      />

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <GradientText variant="h1" center style={styles.title}>Edit Profile</GradientText>

        <View style={styles.avatarWrap}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <AppText variant="h2" bold>{(name || user?.username || '?').slice(0, 1).toUpperCase()}</AppText>
            </View>
          )}
          {uploading && (
            <View style={styles.uploadOverlay}><ActivityIndicator color={colors.white} /></View>
          )}
          <TouchableOpacity style={styles.cameraBtn} onPress={showAvatarMenu} disabled={uploading} activeOpacity={0.85}>
            <LinearGradient
              colors={colors.buttonGradient as unknown as string[]}
              start={colors.gradientStartPoint}
              end={colors.gradientEndPoint}
              style={StyleSheet.absoluteFillObject}
              pointerEvents="none"
            />
            <Icon name="camera" size={14} color={colors.white} />
          </TouchableOpacity>
        </View>

        <AppText variant="small" color={colors.textSecondary} style={styles.label}>Name</AppText>
        <AppInput value={name} onChangeText={setName} placeholder="Your full name" containerStyle={{ marginBottom: spacing.md }} />

        <AppText variant="small" color={colors.textSecondary} style={styles.label}>Username</AppText>
        <AppInput value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false}
          placeholder="username" containerStyle={{ marginBottom: spacing.md }} />

        <AppText variant="small" color={colors.textSecondary} style={styles.label}>Bio</AppText>
        <AppInput value={bio} onChangeText={setBio} placeholder="Tell people about yourself" containerStyle={{ marginBottom: spacing.lg }} />

        <AppButton
          title={saving ? 'Saving…' : 'Save Changes'}
          size="lg"
          fullWidth
          onPress={save}
          disabled={saving || uploading}
        />
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  title: { lineHeight: 40, paddingBottom: 4, marginBottom: spacing.md },
  avatarWrap: { alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.md },
  avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 2.5, borderColor: colors.primary },
  avatarFallback: { backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  uploadOverlay: {
    position: 'absolute', width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: '36%',
    width: 32, height: 32, borderRadius: 16,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.background,
  },
  label: { marginBottom: spacing.xs, marginTop: spacing.sm },
});

export default EditProfileScreen;