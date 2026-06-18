import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary, launchCamera, ImagePickerResponse, MediaType, PhotoQuality } from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import GradientText from '@/components/GradientText';
import AppButton from '@/components/AppButton';
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
      quality: 0.85 as PhotoQuality,
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
        const { user: updated } = await usersApi.uploadAvatar(asset.uri, asset.type || 'image/jpeg');
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
    Alert.alert('Add profile picture', 'Choose source', [
      { text: 'Take photo', onPress: () => pickAndUpload('camera') },
      { text: 'Choose from library', onPress: () => pickAndUpload('library') },
      { text: 'Cancel', style: 'cancel' },
    ], { cancelable: true });
  };

  return (
    <ScreenContainer>
      <BrandHeader
        infoTitle="Your profile picture"
        infoIntro="A photo helps friends recognise and find you on WatchPartyLive."
        infoPoints={[
          { icon: 'happy', title: 'Be recognisable', text: 'Friends find you faster when your avatar matches who they know.' },
          { icon: 'shield-checkmark', title: 'Safe upload', text: 'Your image is stored securely and only shown on your profile.' },
          { icon: 'create', title: 'Change anytime', text: 'You can update or remove your picture later from profile settings.' },
        ]}
      />

      <View style={styles.body}>
        <GradientText variant="h1" center style={styles.title}>
          Add a profile picture
        </GradientText>
        <AppText variant="small" color={colors.textSecondary} center style={styles.sub}>
          So your friends can find you and know it's really you.
        </AppText>

        <TouchableOpacity onPress={showSourcePicker} activeOpacity={0.85} style={styles.avatarWrap}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <LinearGradient
                colors={['rgba(238,48,99,0.15)', 'rgba(74,81,161,0.15)']}
                style={StyleSheet.absoluteFillObject}
              />
              <Icon name="camera" size={56} color={colors.textSecondary} />
              <AppText variant="tiny" color={colors.textSecondary} style={{ marginTop: 8 }}>Tap to add</AppText>
            </View>
          )}
          {!previewUri && (
            <View style={styles.plusBadge}>
              <LinearGradient
                colors={colors.buttonGradient as unknown as string[]}
                start={colors.gradientStartPoint}
                end={colors.gradientEndPoint}
                style={StyleSheet.absoluteFillObject}
              />
              <Icon name="add" size={22} color={colors.white} />
            </View>
          )}
          {uploading && (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator color={colors.white} size="large" />
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <AppButton title="Add Photo" size="lg" fullWidth onPress={showSourcePicker} disabled={uploading} />
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => navigation.replace('ContactPermission')}
            disabled={uploading}>
            <AppText bold color={colors.textSecondary}>Skip for now</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  title: { lineHeight: 40, paddingBottom: 4 },
  sub: { marginTop: spacing.xs, marginBottom: spacing.xxl },
  avatarWrap: {
    alignSelf: 'center', marginTop: spacing.lg,
    width: 180, height: 180, borderRadius: 90,
  },
  avatar: { width: '100%', height: '100%', borderRadius: 90 },
  avatarPlaceholder: {
    width: '100%', height: '100%', borderRadius: 90,
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.border,
    borderStyle: 'dashed',
  },
  plusBadge: {
    position: 'absolute', bottom: 8, right: 8,
    width: 44, height: 44, borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: colors.background,
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 90,
  },
  footer: { position: 'absolute', bottom: Platform.OS === 'ios' ? 32 : 24, left: spacing.lg, right: spacing.lg },
  skipBtn: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
});

export default AddProfilePictureScreen;