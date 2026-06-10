import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { NavigationContext } from '../../context/NavigationContext';
import { AttendanceContext } from '../../context/AttendanceContext';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { shareAsync } from 'expo-sharing';
import * as ExcelJS from 'exceljs';
import * as api from '../../../apis/api';
import { Buffer } from 'buffer';
import Toast from 'react-native-toast-message';
import { ChevronLeft } from "lucide-react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AddStudentScreen({ college, className, isNgoVolunteer, ngo }) {
  const { goBack, navigate } = useContext(NavigationContext);
  const insets = useSafeAreaInsets();
  const { addStudent } = useContext(AttendanceContext);
  const { accessToken } = useContext(AuthContext);
  const { darkMode, lightTheme, darkTheme } = useTheme();
  const colors = darkMode ? darkTheme : lightTheme;

  // Manage a dynamic list of students to add
  const [students, setStudents] = useState([
    { id: Date.now().toString(), name: '', prn: '', department: '', email: '', password: '' },
  ]);

  function updateStudent(idx, key, value) {
    setStudents(prev => prev.map((s, i) => (i === idx ? { ...s, [key]: value } : s)));
  }

  function addEmptyStudent() {
    setStudents(prev => [...prev, { id: Date.now().toString() + Math.random().toString(36).slice(2), name: '', prn: '', department: '', email: '', password: '' }]);
  }

  // Helper: read a blob/file URI as text (web)
  function readFileAsText(uri) {
    return new Promise((resolve, reject) => {
      fetch(uri)
        .then(r => r.text())
        .then(resolve)
        .catch(reject);
    });
  }

  // Helper: read a blob/file URI as ArrayBuffer (web)
  function readFileAsArrayBuffer(uri) {
    return new Promise((resolve, reject) => {
      fetch(uri)
        .then(r => r.arrayBuffer())
        .then(resolve)
        .catch(reject);
    });
  }

  async function parseCSVContent(csvContent) {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      Alert.alert('No data found in CSV file');
      return null;
    }
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const rowData = {};
      headers.forEach((header, index) => {
        rowData[header] = values[index] || '';
      });
      rows.push(rowData);
    }
    return rows;
  }

  // ExcelJS returns { text, hyperlink } for auto-hyperlinked cells (emails, URLs).
  // This helper extracts the plain string from any cell value.
  function cellToString(value) {
    if (value == null) return '';
    if (typeof value === 'object') {
      // Hyperlink object: { text: '...', hyperlink: 'mailto:...' }
      if (value.text != null) return String(value.text);
      if (value.hyperlink != null) return String(value.hyperlink).replace(/^mailto:/i, '');
      // RichText object: { richText: [{ text: '...' }, ...] }
      if (Array.isArray(value.richText)) return value.richText.map(r => r.text || '').join('');
      return '';
    }
    return String(value);
  }

  async function parseExcelBuffer(buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];
    const headerRow = worksheet.getRow(1);
    const headers = [];
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber] = cellToString(cell.value);
    });
    const rows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const rowData = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber];
        if (header) rowData[header] = cellToString(cell.value);
      });
      rows.push(rowData);
    });
    return rows;
  }

  async function pickAndParseFile() {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv', 'application/octet-stream'],
        copyToCacheDirectory: true
      });

      if (res.canceled) return;

      const fileUri = res.assets[0].uri;
      const fileName = res.assets[0].name || '';
      const isCSV = fileName.toLowerCase().endsWith('.csv');

      let rows = [];

      if (Platform.OS === 'web') {
        // ---- WEB: use fetch/FileReader instead of expo-file-system ----
        if (isCSV) {
          const csvContent = await readFileAsText(fileUri);
          rows = await parseCSVContent(csvContent);
          if (!rows) return;
        } else {
          const arrayBuffer = await readFileAsArrayBuffer(fileUri);
          rows = await parseExcelBuffer(arrayBuffer);
        }
      } else {
        // ---- NATIVE (Android / iOS): use expo-file-system ----
        if (isCSV) {
          const csvContent = await FileSystem.readAsStringAsync(fileUri, { encoding: 'utf8' });
          rows = await parseCSVContent(csvContent);
          if (!rows) return;
        } else {
          const fileStr = await FileSystem.readAsStringAsync(fileUri, { encoding: 'base64' });
          rows = await parseExcelBuffer(Buffer.from(fileStr, 'base64'));
        }
      }

      if (!rows || rows.length === 0) {
        Alert.alert('No rows found in the selected file');
        return;
      }

      const mapped = rows.map(r => {
        const name = r.name || r.Name || r['Student name'] || r['Student Name'] || r.student || '';
        const prn = r.prn || r.PRN || r.Prn || r['PRN'] || r.roll || r.Roll || '';
        const department = r.department || r.dept || r.Department || r.Dept || '';
        const email = r.email || r.Email || '';
        const password = r.password || r.Password || 'defaultPassword123';
        return { id: Date.now().toString() + Math.random().toString(36).slice(2), name: String(name).trim(), prn: String(prn).trim(), department: String(department).trim(), email: String(email).trim(), password: String(password).trim() };
      }).filter(s => s.name);

      if (mapped.length === 0) {
        Alert.alert('No student rows found. Make sure the file has a header with a Name column or similar.');
        return;
      }

      setStudents(prev => {
        const nonEmptyStudents = prev.filter(s => s.name.trim());
        return [...nonEmptyStudents, ...mapped];
      });
      Alert.alert('Imported', `${mapped.length} students were parsed and added to the list.`);
    } catch (err) {
      console.warn('Failed to parse file', err);
      Alert.alert('Import failed', 'Could not parse the selected file.');
    }
  }

  const downloadTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Students');

      // 1. Setup Headers & Columns
      worksheet.columns = [
        { header: 'Name', key: 'name', width: 20 },
        { header: 'PRN', key: 'prn', width: 15 },
        { header: 'Department', key: 'department', width: 20 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Password', key: 'password', width: 20 },
      ];

      // Add Sample Row
      worksheet.addRow(['John Doe', '123456', 'Computer Science', 'john@example.com', 'password123']);

      // 2. Generate Excel Buffer
      const buffer = await workbook.xlsx.writeBuffer();
      const base64String = Buffer.from(buffer).toString('base64');
      const filename = 'Student_Template.xlsx';

      // --- WEB DOWNLOAD ---
      if (Platform.OS === 'web') {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        window.URL.revokeObjectURL(url);
        return;
      }

      // --- ANDROID "SAVE TO DEVICE" (SAF) ---
      if (Platform.OS === 'android') {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

        if (permissions.granted) {
          // Creates a blank file in the user-selected directory
          const uri = await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            filename,
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          );

          // Writes the Excel data into that file
          await FileSystem.writeAsStringAsync(uri, base64String, {
            encoding: FileSystem.EncodingType.Base64,
          });

          Alert.alert('Success', 'Template saved to your device!');
        } else {
          // Fallback to sharing if they deny folder access
          await shareFallback(base64String, filename);
        }
      }

      // --- iOS "SAVE TO FILES" ---
      else {
        // iOS handles "Save to Files" natively within the Share Sheet
        await shareFallback(base64String, filename);
      }

    } catch (error) {
      console.error('Error downloading template:', error);
      Alert.alert('Error', 'Failed to generate template');
    }
  };

  // Helper function for iOS or Android fallback
  const shareFallback = async (base64String, filename) => {
    const fileUri = FileSystem.cacheDirectory + filename;
    await FileSystem.writeAsStringAsync(fileUri, base64String, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Save Student Template',
      UTI: 'com.microsoft.excel.xlsx', // Required for iOS to recognize Excel
    });
  };

  function removeStudent(idx) {
    setStudents(prev => prev.filter((_, i) => i !== idx));
  }

  const emptyStudent = () => ({ id: Date.now().toString() + Math.random().toString(36).slice(2), name: '', prn: '', department: '', email: '', password: '' });

  async function onSave() {
    try {
      const validStudents = students.filter(s => s.name.trim());

      if (validStudents.length === 0) {
        Toast.show({ type: 'error', text1: 'No students to save', text2: 'Please fill in at least one student name.' });
        return;
      }

      let classId = null;
      if (!isNgoVolunteer) {
        // Find the class ID from college.classes for normal colleges
        const selectedClass = college?.classes?.find(c => c.className === className);
        if (!selectedClass) {
          Alert.alert('Error', 'Class not found');
          return;
        }
        classId = selectedClass._id;
      }

      // Prepare the request body
      let requestBody = {
        students: validStudents.map(s => ({
          name: s.name.trim(),
          department: s.department.trim(),
          email: s.email.trim(),
          prn: s.prn.trim(),
          password: s.password.trim() || 'defaultPassword123'
        }))
      };

      if (!isNgoVolunteer) {
        requestBody.classId = classId;
      }

      const apiEndpoint = isNgoVolunteer ? api.addNgoVolunteerAPI : api.addStudentAPI;

      // Call the API
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (response.ok) {
        // 1. Fire toast immediately (shows on both web & Android)
        Toast.show({
          type: 'success',
          text1: isNgoVolunteer ? '✅ Volunteers Added!' : '✅ Students Added!',
          text2: `${validStudents.length} ${isNgoVolunteer ? 'volunteer' : 'student'}${validStudents.length > 1 ? 's' : ''} added ${isNgoVolunteer ? 'successfully' : `to ${className}`}.`,
          visibilityTime: 3000,
        });

        // 2. Reset the form to one empty row
        setStudents([emptyStudent()]);

        // 3. Alert with navigate-back option
        Alert.alert(
          'Success',
          `${validStudents.length} ${isNgoVolunteer ? 'volunteer' : 'student'}${validStudents.length > 1 ? 's' : ''} added ${isNgoVolunteer ? 'successfully' : `to ${className}`}!`,
          [
            { text: 'Add More', style: 'cancel' },
            {
              text: isNgoVolunteer ? 'View Events' : 'View Class',
              onPress: () => isNgoVolunteer ? navigate('NgoEvents', { ngo }) : navigate('CollegeClasses', { college })
            },
          ]
        );
      } else {
        Toast.show({ type: 'error', text1: 'Failed to add records', text2: result.message || 'Please try again.' });
        Alert.alert('Error', result.message || 'Failed to add records');
      }
    } catch (error) {
      console.error('Error adding records:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to add records. Please try again.' });
      Alert.alert('Error', 'Failed to add records');
    }
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.backgroundColors ? colors.backgroundColors[0] : '#fff' }}>
      {/* Header with Back Button */}
      <View className="flex-row items-center px-4 pb-4 border-b" style={{ backgroundColor: colors.cardBg, borderBottomColor: colors.border, paddingTop: Math.max(insets.top, 16) }}>
        <TouchableOpacity
          onPress={goBack}
          className="p-2 rounded-full mr-3 border"
          style={{ borderColor: colors.border }}
        >
          <ChevronLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xl font-extrabold" style={{ color: colors.header }}>
            {isNgoVolunteer ? 'Add NGO Volunteers' : 'Add Students'}
          </Text>
          {!isNgoVolunteer && (
            <Text className="text-xs" style={{ color: colors.textSecondary }}>
              Class: {className}
            </Text>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 + insets.bottom }}>
        {/* Upload Section */}
        <View className="p-4 rounded-lg mb-4" style={{ backgroundColor: colors.cardBg, borderColor: colors.border, borderWidth: 1 }}>
          <Text className="text-base font-semibold mb-3" style={{ color: colors.textPrimary }}>Import from File</Text>

          <TouchableOpacity onPress={downloadTemplate} className="p-3 rounded-lg items-center mb-3 border" style={{ borderColor: colors.accent, backgroundColor: 'transparent' }}>
            <Text className="font-semibold" style={{ color: colors.accent }}>Download Excel Template</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={pickAndParseFile} className="p-3 rounded-lg items-center mb-2" style={{ backgroundColor: colors.accent }}>
            <Text className="text-white font-semibold">Pick Excel/CSV File</Text>
          </TouchableOpacity>
          <Text className="text-xs text-center" style={{ color: colors.textSecondary }}>
            Supported: .xlsx, .xls, .csv with columns: Name, PRN, Department, Email, Password
          </Text>
        </View>

        {/* Summary Card */}
        <View className="p-4 rounded-xl mb-4" style={{ backgroundColor: colors.cardBg, borderColor: colors.border, borderWidth: 1 }}>
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.textSecondary }}>Total Records Ready</Text>
              <Text className="text-3xl font-extrabold" style={{ color: colors.accent }}>{students.filter(s => s.name.trim()).length}</Text>
            </View>
            <View className="items-end">
              <Text className="text-[10px] italic" style={{ color: colors.textSecondary }}>Fill in at least 'Name'</Text>
              <Text className="text-[10px] italic" style={{ color: colors.textSecondary }}>to include in save</Text>
            </View>
          </View>
        </View>

        {/* Students List */}
        <Text className="text-base font-semibold mb-2" style={{ color: colors.textPrimary }}>Student List</Text>

        {students.map((s, idx) => (
          <View key={s.id} className="mb-2 rounded-lg overflow-hidden" style={{ backgroundColor: colors.cardBg, borderColor: colors.border, borderWidth: 1 }}>
            {/* Compact Header */}
            <View className="flex-row items-center justify-between p-2 px-3" style={{ backgroundColor: colors.iconBg }}>
              <Text className="font-semibold" style={{ color: colors.textPrimary }}>
                {idx + 1}. {s.name || 'New Student'}
              </Text>
              <TouchableOpacity onPress={() => removeStudent(idx)} className="p-1 px-3 rounded" style={{ backgroundColor: '#ef4444' }}>
                <Text className="text-white text-xs font-semibold">Remove</Text>
              </TouchableOpacity>
            </View>

            {/* Editable Fields */}
            <View className="p-3">
              <View className="mb-2">
                <Text className="text-xs mb-1" style={{ color: colors.textSecondary }}>Name</Text>
                <TextInput
                  placeholder="Student Name"
                  placeholderTextColor={colors.textSecondary}
                  value={s.name}
                  onChangeText={(v) => updateStudent(idx, 'name', v)}
                  className="p-2 rounded border"
                  style={{ color: colors.textPrimary, backgroundColor: colors.iconBg, borderColor: colors.border }}
                />
              </View>

              <View className="flex-row gap-2 mb-2">
                <View className="flex-1">
                  <Text className="text-xs mb-1" style={{ color: colors.textSecondary }}>PRN</Text>
                  <TextInput
                    placeholder="PRN"
                    placeholderTextColor={colors.textSecondary}
                    value={s.prn}
                    onChangeText={(v) => updateStudent(idx, 'prn', v)}
                    className="p-2 rounded border"
                    style={{ color: colors.textPrimary, backgroundColor: colors.iconBg, borderColor: colors.border }}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs mb-1" style={{ color: colors.textSecondary }}>Department</Text>
                  <TextInput
                    placeholder="Department"
                    placeholderTextColor={colors.textSecondary}
                    value={s.department}
                    onChangeText={(v) => updateStudent(idx, 'department', v)}
                    className="p-2 rounded border"
                    style={{ color: colors.textPrimary, backgroundColor: colors.iconBg, borderColor: colors.border }}
                  />
                </View>
              </View>

              <View>
                <Text className="text-xs mb-1" style={{ color: colors.textSecondary }}>Email</Text>
                <TextInput
                  placeholder="Email"
                  placeholderTextColor={colors.textSecondary}
                  value={s.email}
                  onChangeText={(v) => updateStudent(idx, 'email', v)}
                  className="p-2 rounded border"
                  style={{ color: colors.textPrimary, backgroundColor: colors.iconBg, borderColor: colors.border }}
                />
              </View>

              <View>
                <Text className="text-xs mb-1" style={{ color: colors.textSecondary }}>Password</Text>
                <TextInput
                  placeholder="Password (default: defaultPassword123)"
                  placeholderTextColor={colors.textSecondary}
                  value={s.password}
                  onChangeText={(v) => updateStudent(idx, 'password', v)}
                  className="p-2 rounded border"
                  style={{ color: colors.textPrimary, backgroundColor: colors.iconBg, borderColor: colors.border }}
                  secureTextEntry
                />
              </View>
            </View>
          </View>
        ))}

        {/* Add Another Button - Placed after the list for better flow */}
        <TouchableOpacity 
          onPress={addEmptyStudent} 
          className="flex-row items-center justify-center py-4 rounded-xl border-2 border-dashed mt-4 mb-10" 
          style={{ borderColor: colors.accent, backgroundColor: `${colors.accent}10` }}
        >
          <Text className="font-bold text-base" style={{ color: colors.accent }}>+ Add Another {isNgoVolunteer ? 'Volunteer' : 'Student'} Manually</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Sticky Footer for Primary Action */}
      <View 
        className="px-6 pt-4 border-t" 
        style={{ 
          backgroundColor: colors.cardBg, 
          borderTopColor: colors.border,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 10,
          paddingBottom: Math.max(insets.bottom, 20)
        }}
      >
        <TouchableOpacity 
          className="py-4 rounded-2xl items-center" 
          style={{ backgroundColor: colors.accent }} 
          onPress={onSave}
        >
          <Text className="text-white font-extrabold text-lg">
            Save {students.filter(s => s.name.trim()).length} {isNgoVolunteer ? 'Volunteers' : 'Students'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
