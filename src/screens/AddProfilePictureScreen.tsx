// src/screens/AddProfilePictureScreen.tsx
//
// CHANGES:
//   - Real image picker via react-native-image-picker
//   - Uploads avatar to backend (which sends to Cloudinary)
//   - On success, navigates to ProfilePictureAdded with the URL

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary, launchCamera, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import ScreenContainer from '@/components/ScreenContainer';
import AppHeader from '@/components/AppHeader';
import AppText from '@/components/AppText';
import GradientButton from '@/components/GradientButton';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import { usersApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { showApiError } from '@/hooks/useApiErrorAlert';

const AddProfilePictureScreen = () => {
  const navigation = useNavigation<any>();
  const { user, setUser } = useAuth();
  const [previewUri, setPreviewUri] = useState<string | null>(user?.avatarUrl || null);
  const [uploading, setUploading] = useState(false);

  const pickAndUpload = async (source: 'camera' | 'library') => {
    const opts = {
      mediaType: 'photo' as MediaType,
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 0.85 as const,
      includeBase64: false,
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

      setPreviewUri(asset.uri);
      setUploading(true);
      try {
        const { user: updated } = await usersApi.uploadAvatar(
          asset.uri,
          asset.type || 'image/jpeg'
        );
        await setUser(updated);
        navigation.navigate('ProfilePictureAdded');
      } catch (err) {
        setPreviewUri(user?.avatarUrl || null);
        showApiError(err, 'Upload failed.');
      } finally {
        setUploading(false);
      }
    });
  };

  const showSourcePicker = () => {
    Alert.alert(
      'Add profile picture',
      'Choose source',
      [
        { text: 'Take photo', onPress: () => pickAndUpload('camera') },
        { text: 'Choose from library', onPress: () => pickAndUpload('library') },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  return (
    <ScreenContainer>
      <AppHeader />
      <View style={styles.body}>
        <AppText variant="h1" bold center style={styles.title}>
          Add a profile picture so{'\n'}that friends can find you
        </AppText>

        <TouchableOpacity onPress={showSourcePicker} activeOpacity={0.85} style={styles.avatarWrap}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
              style={styles.avatarPlaceholder}>
              <Icon name="person" size={80} color={colors.textMuted} />
            </LinearGradient>
          )}
          {uploading && (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator color={colors.white} size="large" />
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <GradientButton
            title={previewUri ? 'Add Photo' : 'Add Photo'}
            size="lg"
            onPress={showSourcePicker}
            disabled={uploading}
          />
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => navigation.replace('ContactPermission')}
            disabled={uploading}>
            <AppText bold color={colors.primary}>Skip</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  title: { marginBottom: spacing.xxl },
  avatarWrap: {
    alignSelf: 'center',
    width: 180, height: 180, borderRadius: 90,
    marginTop: spacing.lg,
  },
  avatar: { width: '100%', height: '100%', borderRadius: 90 },
  avatarPlaceholder: {
    width: '100%', height: '100%', borderRadius: 90,
    alignItems: 'center', justifyContent: 'center',
  },
  uploadOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 90,
  },
  footer: {
    position: 'absolute', bottom: Platform.OS === 'ios' ? 32 : 24,
    left: spacing.lg, right: spacing.lg,
  },
  skipBtn: {
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: spacing.md,
  },
});

export default AddProfilePictureScreen;
