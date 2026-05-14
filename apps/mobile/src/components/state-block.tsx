import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

type StateBlockProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  loading?: boolean;
  fullScreen?: boolean;
  actionLabel?: string;
  onAction?: () => void;
};

export function StateBlock({
  title,
  description,
  icon,
  loading,
  fullScreen,
  actionLabel,
  onAction,
}: StateBlockProps) {
  return (
    <View style={[styles.wrap, fullScreen && styles.wrapFullscreen]}>
      <View style={[styles.card, fullScreen && styles.cardFullscreen]}>
        {loading ? <ActivityIndicator size="large" color={colors.primary} style={styles.loader} /> : icon ? <View style={styles.iconWrap}>{icon}</View> : null}
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
        {actionLabel && onAction ? (
          <TouchableOpacity activeOpacity={0.88} style={styles.button} onPress={onAction}>
            <Text style={styles.buttonText}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  wrapFullscreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    borderRadius: 28,
    padding: 24,
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.10)',
    alignItems: 'center',
  },
  cardFullscreen: {
    width: '100%',
    maxWidth: 420,
    paddingVertical: 30,
  },
  loader: {
    marginBottom: 16,
  },
  iconWrap: {
    marginBottom: 14,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  button: {
    marginTop: 18,
    minHeight: 48,
    alignSelf: 'stretch',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  buttonText: {
    ...typography.label,
    color: colors.background,
  },
});
