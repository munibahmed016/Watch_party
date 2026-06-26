import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import AppText from '@/components/AppText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';

export type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  icon?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

// Reliable in-app confirm dialog (works even with the debugger attached,
// unlike RN's native Alert). Use for delete confirmations, etc.
const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  destructive, icon, onConfirm, onCancel,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          {icon ? (
            <View style={[styles.iconWrap, destructive && { backgroundColor: 'rgba(255,90,90,0.15)' }]}>
              <Icon name={icon} size={26} color={destructive ? '#FF5A5A' : colors.primary} />
            </View>
          ) : null}
          <AppText variant="h3" bold center style={{ marginBottom: 6 }}>{title}</AppText>
          {message ? (
            <AppText variant="small" color={colors.textSecondary} center style={{ marginBottom: spacing.lg, lineHeight: 19 }}>
              {message}
            </AppText>
          ) : <View style={{ height: spacing.md }} />}

          <View style={styles.row}>
            <TouchableOpacity onPress={onCancel} activeOpacity={0.85} style={[styles.btn, styles.btnGhost]}>
              <AppText bold color={colors.textSecondary}>{cancelLabel}</AppText>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm} activeOpacity={0.85} style={[styles.btn, styles.btnConfirm]}>
              {destructive ? (
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#FF5A5A', borderRadius: 999 }]} pointerEvents="none" />
              ) : (
                <LinearGradient colors={colors.buttonGradient as unknown as string[]}
                  start={colors.gradientStartPoint} end={colors.gradientEndPoint}
                  style={StyleSheet.absoluteFillObject} pointerEvents="none" />
              )}
              <AppText bold color={colors.white}>{confirmLabel}</AppText>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  card: { width: '100%', maxWidth: 340, backgroundColor: colors.bg3 || '#16161f', borderRadius: layout.radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  iconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(238,48,99,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: 10, width: '100%' },
  btn: { flex: 1, height: 46, borderRadius: 999, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  btnGhost: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: colors.border },
  btnConfirm: {},
});

export default ConfirmModal;