import React from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { Check, ExternalLink } from 'lucide-react-native';
import { privacyPolicyURL } from '../../apis/api';

export default function PrivacyPolicyCheckbox({
  checked,
  onChange,
  colors,
  containerStyle,
}) {
  const handleOpenPolicy = () => {
    if (privacyPolicyURL) {
      Linking.openURL(privacyPolicyURL).catch((err) =>
        console.error('Failed to open Privacy Policy URL:', err)
      );
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Checkbox Tap Area */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onChange(!checked)}
        style={[
          styles.checkbox,
          {
            backgroundColor: checked ? colors.accent : (colors.iconBg || colors.cardBg),
            borderColor: checked ? colors.accent : colors.border,
          },
        ]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
      >
        {checked && <Check size={13} color="#ffffff" strokeWidth={3} />}
      </TouchableOpacity>

      {/* Label and Clickable Policy Link */}
      <View style={styles.textContainer}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          I agree to the{' '}
          <Text
            onPress={handleOpenPolicy}
            style={[styles.linkText, { color: colors.accent }]}
          >
            Privacy Policy
          </Text>
        </Text>
      </View>

      {/* External Link Icon Button */}
      <TouchableOpacity
        onPress={handleOpenPolicy}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.linkIconButton}
        accessibilityLabel="Open Privacy Policy website"
      >
        <ExternalLink size={13} color={colors.accent} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
  },
  linkText: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  linkIconButton: {
    paddingLeft: 6,
  },
});
