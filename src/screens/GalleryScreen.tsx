import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary, ImagePickerResponse, MediaType, PhotoQuality } from 'react-native-image-picker';import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import GradientText from '@/components/GradientText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import { usersApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { showApiError } from '@/hooks/useApiErrorAlert';

const GalleryScreen = () => {
  const navigation = useNavigation<any>();
  const { setUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const launchedRef = useRef(false);

  useEffect(() => {
    if (launchedRef.current) return;
    launchedRef.current = true;
    const opts = { mediaType: 'photo' as MediaType, maxWidth: 1024, maxHeight: 1024, quality: 0.85 as PhotoQuality, selectionLimit: 1 };
    launchImageLibrary(opts, async (response: ImagePickerResponse) => {
      if (response.didCancel) return navigation.goBack();
      if (response.errorCode) { Alert.alert('Photo library', response.errorMessage || 'Could not open library.'); return navigation.goBack(); }
      const asset = response.assets?.[0];
      if (!asset?.uri) return navigation.goBack();
      setUploading(true);
      try {
        const { user: updated } = await usersApi.uploadAvatar(asset.uri, asset.type || 'image/jpeg');
        await setUser(updated);
        navigation.replace('ProfilePictureAdded');
      } catch (err) {
        showApiError(err, 'Upload failed.');
        navigation.goBack();
      } finally {
        setUploading(false);
      }
    });
  }, [navigation, setUser]);

  return (
    <ScreenContainer>
      <BrandHeader showBack onBack={() => navigation.goBack()} />
      <View style={styles.body}>
        <GradientText variant="h2" center style={{ lineHeight: 30, paddingBottom: 2, marginBottom: spacing.lg }}>
          {uploading ? 'Uploading' : 'Choose a Photo'}
        </GradientText>
        <ActivityIndicator color={colors.primary} size="large" />
        <AppText variant="small" color={colors.textSecondary} center style={{ marginTop: spacing.lg }}>
          {uploading ? 'Uploading your photo…' : 'Opening photo library…'}
        </AppText>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
});

export default GalleryScreen;