// src/screens/EditProfileScreen.tsx
//
// CHANGES:
//   - Pulls current user from AuthContext (no more hardcoded "Alex Standall")
//   - Camera badge opens image picker → uploads avatar via Cloudinary
//   - Save Changes calls usersApi.updateMe and refreshes auth state
//   - Bio added; "Work" removed (not in our backend schema — can be added if needed)

import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { launchCamera, launchImageLibrary, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import ScreenContainer from '@/components/ScreenContainer';
import AppHeader from '@/components/AppHeader';
import AppText from '@/components/AppText';
import AppInput from '@/components/AppInput';
import GradientButton from '@/components/GradientButton';
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
    const opts = {
      mediaType: 'photo' as MediaType,
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 0.85 as const,
    };
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

      if (Object.keys(payload).length === 0) {
        navigation.goBack();
        return;
      }
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
      <AppHeader title="Edit Profile" showLogo={false} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        <View style={styles.avatarWrap}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <AppText variant="h2" bold>
                {(name || user?.username || '?').slice(0, 1).toUpperCase()}
              </AppText>
            </View>
          )}
          {uploading && (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator color={colors.white} />
            </View>
          )}
          <TouchableOpacity style={styles.cameraBtn} onPress={showAvatarMenu} disabled={uploading}>
            <Icon name="camera" size={14} color={colors.white} />
          </TouchableOpacity>
        </View>

        <AppText variant="small" color={colors.textSecondary} style={styles.label}>Name</AppText>
        <AppInput value={name} onChangeText={setName}
          placeholder="Your full name"
          containerStyle={{ marginBottom: spacing.md }} />

        <AppText variant="small" color={colors.textSecondary} style={styles.label}>Username</AppText>
        <AppInput value={username} onChangeText={setUsername}
          autoCapitalize="none" autoCorrect={false}
          placeholder="username"
          containerStyle={{ marginBottom: spacing.md }} />

        <AppText variant="small" color={colors.textSecondary} style={styles.label}>Bio</AppText>
        <AppInput value={bio} onChangeText={setBio}
          placeholder="Tell people about yourself"
          containerStyle={{ marginBottom: spacing.lg }} />

        <GradientButton
          title={saving ? 'Saving...' : 'Save Changes'}
          size="lg"
          onPress={save}
          disabled={saving || uploading} />
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  avatarWrap: { alignItems: 'center', marginTop: spacing.md },
  avatar: {
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 2, borderColor: colors.white,
  },
  avatarFallback: {
    backgroundColor: colors.primaryDark,
    alignItems: 'center', justifyContent: 'center',
  },
  uploadOverlay: {
    position: 'absolute', width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: '38%',
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.background,
  },
  label: { marginBottom: spacing.xs, marginTop: spacing.sm },
});

export default EditProfileScreen;
