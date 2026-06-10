import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { NavigationContext } from '../../context/NavigationContext';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ChevronLeft } from 'lucide-react-native';
import * as api from '../../../apis/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CLASS_PATTERN = /^\d{4}-\d{4}.{1,6}$/;

function getValidationHint(trimmed) {
  if (!trimmed) return null;
  if (CLASS_PATTERN.test(trimmed)) return { ok: true, msg: 'Looks good!' };
  if (!/^\d{4}-\d{4}/.test(trimmed))
    return { ok: false, msg: 'Must start with a year range — e.g. 2024-2025' };
  if (/^\d{4}-\d{4}$/.test(trimmed))
    return { ok: false, msg: 'Add a class identifier after the year (e.g. FE, SE, BE)' };
  if (/^\d{4}-\d{4}.{7,}$/.test(trimmed))
    return { ok: false, msg: 'Identifier too long — maximum 6 characters' };
  return { ok: false, msg: 'Invalid format — use YYYY-YYYY followed by 1–6 characters' };
}

export default function AddClassScreen({ college }) {
  const { goBack } = useContext(NavigationContext);
  const insets = useSafeAreaInsets();
  const { accessToken } = useContext(AuthContext);
  const { darkMode, lightTheme, darkTheme } = useTheme();
  const c = darkMode ? darkTheme : lightTheme;

  const [className, setClassName] = useState('');
  const [loading, setLoading] = useState(false);

  const trimmed = className.trim();
  const isValid = CLASS_PATTERN.test(trimmed);
  const hint = getValidationHint(trimmed);

  const borderColor = trimmed
    ? isValid ? '#22c55e' : '#ef4444'
    : c.border;

  async function onSave() {
    if (!trimmed) {
      Toast.show({ type: 'error', text1: 'Missing class name', text2: 'Please enter a class name.' });
      return;
    }
    if (!isValid) {
      Toast.show({ type: 'error', text1: 'Invalid format', text2: hint?.msg });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(api.addClassAPI, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ className: trimmed }),
      });
      const result = await response.json();
      if (response.ok) {
        Toast.show({ type: 'success', text1: 'Class created', text2: `${trimmed} has been added.` });
        goBack();
      } else {
        Toast.show({ type: 'error', text1: 'Failed to add class', text2: result.message || 'Something went wrong.' });
      }
    } catch (error) {
      console.error('Error adding class:', error);
      Toast.show({ type: 'error', text1: 'Network error', text2: 'Failed to add class. Try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.backgroundColors ? c.backgroundColors[0] : '#fff' }}
      contentContainerStyle={{ 
        padding: 20, 
        paddingTop: Math.max(insets.top, 20),
        paddingBottom: Math.max(insets.bottom, 40) 
      }}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Header ── */}
      <TouchableOpacity
        onPress={goBack}
        style={[
          styles.backBtn,
          {
            padding: 6,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: darkMode ? '#1e3a50' : '#f0f9f6',
          }
        ]}
      >
        <ChevronLeft size={20} color={c.textPrimary} />
      </TouchableOpacity>

      <Text style={[styles.pageTitle, { color: c.header }]}>Add New Class</Text>
      <Text style={[styles.pageSubtitle, { color: c.textSecondary }]}>
        Create a class for {college?.collegeName || 'your college'}
      </Text>

      {/* ── Input Card ── */}
      <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.border }]}>
        <Text style={[styles.label, { color: c.textPrimary }]}>Class Name</Text>

        <TextInput
          placeholder="e.g. 2025-2026FE"
          placeholderTextColor={c.textSecondary}
          value={className}
          onChangeText={setClassName}
          autoCapitalize="characters"
          style={[
            styles.input,
            {
              backgroundColor: darkMode ? '#1e3a50' : '#f0faf8',
              borderColor: borderColor,
              borderWidth: trimmed ? 2 : 1,
              color: c.textPrimary,
            },
          ]}
        />

        {/* Live validation feedback */}
        {hint ? (
          <View style={[styles.hintRow, { backgroundColor: hint.ok ? '#f0fdf4' : '#fef2f2', borderColor: hint.ok ? '#bbf7d0' : '#fecaca' }]}>
            <Text style={{ fontSize: 12, color: hint.ok ? '#16a34a' : '#dc2626', fontWeight: '500' }}>
              {hint.ok ? '' : '⚠️  '}{hint.msg}
            </Text>
          </View>
        ) : (
          <View style={{ height: 8 }} />
        )}

        {/* Live preview chip */}
        {/* {trimmed ? (
          <View style={styles.previewRow}>
            <Text style={[styles.previewLabel, { color: c.textSecondary }]}>Preview  </Text>
            <View style={[styles.chip, { backgroundColor: isValid ? '#dcfce7' : '#fee2e2', borderColor: isValid ? '#86efac' : '#fca5a5' }]}>
              <Text style={{ color: isValid ? '#15803d' : '#b91c1c', fontWeight: '700', fontSize: 13 }}>
                {trimmed}
              </Text>
            </View>
          </View>
        ) : null} */}
      </View>

      {/* ── Format Guide Card ── */}
      <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.border }]}>
        <Text style={[styles.guideTitle, { color: c.textPrimary }]}>📋  Format Guide</Text>

        <View style={styles.guideRow}>
          <View style={[styles.guideBadge, { backgroundColor: darkMode ? '#1e3a50' : '#e0f2fe' }]}>
            <Text style={[styles.guideBadgeText, { color: c.header }]}>YYYY-YYYY</Text>
          </View>
          <Text style={[styles.guideDesc, { color: c.textSecondary }]}>
            Academic year range{'\n'}
            <Text style={{ color: c.textPrimary, fontWeight: '600' }}>e.g. 2024-2025</Text>
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: c.border }]} />

        <View style={styles.guideRow}>
          <View style={[styles.guideBadge, { backgroundColor: darkMode ? '#1e3a50' : '#e0f2fe' }]}>
            <Text style={[styles.guideBadgeText, { color: c.header }]}>+ 1–6 chars</Text>
          </View>
          <Text style={[styles.guideDesc, { color: c.textSecondary }]}>
            Class identifier (letters or numbers){'\n'}
            <Text style={{ color: c.textPrimary, fontWeight: '600' }}>e.g. FE, SE, BE, TY, 11</Text>
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: c.border }]} />

        {/* Examples */}
        <Text style={[styles.examplesLabel, { color: c.textSecondary }]}>Examples</Text>
        <View style={styles.examplesRow}>
          {['2024-2025FE', '2024-2025SE', '2024-2025BE', '2024-202511'].map(ex => (
            <TouchableOpacity
              key={ex}
              onPress={() => setClassName(ex)}
              style={[styles.exChip, { backgroundColor: darkMode ? '#1e3a50' : '#e8f6f3', borderColor: c.accent + '55' }]}
            >
              <Text style={{ color: c.accent, fontSize: 11, fontWeight: '700' }}>{ex}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={{ fontSize: 10, color: c.textSecondary, marginTop: 4 }}>
          Tap an example to use it
        </Text>

        <View style={[styles.divider, { backgroundColor: c.border }]} />

        {/* Invalid examples */}
        <Text style={[styles.examplesLabel, { color: '#ef4444' }]}>❌  Invalid examples</Text>
        {[
          { val: 'FE2024', reason: 'no year range at the start' },
          { val: '2024-2025', reason: 'missing class identifier' },
          { val: '2024-2025ABCDEFG', reason: 'identifier exceeds 6 characters' },
        ].map(({ val, reason }) => (
          <Text key={val} style={{ fontSize: 11, color: c.textSecondary, marginTop: 3 }}>
            <Text style={{ color: '#ef4444', fontWeight: '700' }}>{val}</Text>
            {'  —  '}{reason}
          </Text>
        ))}
      </View>

      {/* ── Primary Button ── */}
      <TouchableOpacity
        onPress={onSave}
        disabled={loading}
        style={[
          styles.primaryBtn,
          { backgroundColor: isValid ? c.accent : c.accent + '66' },
        ]}
        activeOpacity={0.8}
      >
        <Text style={styles.primaryBtnText}>
          {loading ? 'Creating…' : 'Create Class'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  backBtn: { marginBottom: 12, alignSelf: 'flex-start' },
  pageTitle: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  pageSubtitle: { fontSize: 13, marginBottom: 20 },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },

  label: { fontSize: 13, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },

  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 1,
  },

  hintRow: {
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  previewLabel: { fontSize: 12, fontWeight: '600' },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },

  guideTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },

  guideRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 4 },
  guideBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    minWidth: 90,
    alignItems: 'center',
  },
  guideBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  guideDesc: { fontSize: 12, flex: 1, lineHeight: 18 },

  divider: { height: 1, marginVertical: 10, borderRadius: 1 },

  examplesLabel: { fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  examplesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  exChip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#1abc9c',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
});
