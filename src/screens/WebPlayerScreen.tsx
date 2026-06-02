import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import ScreenContainer from '@/components/ScreenContainer';
import AppText from '@/components/AppText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';

const WebPlayerScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <ScreenContainer withGradient={false}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <Image
          source={{
            uri: 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?auto=format&fit=crop&w=900&q=70',
          }}
          style={StyleSheet.absoluteFillObject}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.8)']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.top}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Icon name="chevron-back" size={20} color={colors.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.iconBtn}>
            <Icon name="ellipsis-horizontal" size={18} color={colors.white} />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <TouchableOpacity style={styles.playBtn}>
            <Icon name="play" size={32} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: 60,
    alignItems: 'center',
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  playBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default WebPlayerScreen;
