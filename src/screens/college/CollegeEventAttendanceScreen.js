import React, { useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Platform as RNPlatform, ActivityIndicator, FlatList } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import ExcelJS from 'exceljs';
import { Buffer } from 'buffer';
import { NavigationContext } from '../../context/NavigationContext';
import { useTheme } from '../../context/ThemeContext';
import { AuthContext } from "../../context/AuthContext";
import { college_host } from "../../../apis/api";
import { ArrowLeft, FileSpreadsheet } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── Date helpers ──────────────────────────────────────────────────────────────
function toDateString(date) {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function formatDateLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
function getEventDates(startDate, endDate) {
  const start = new Date(startDate); start.setHours(0, 0, 0, 0);
  const end = new Date(endDate || startDate); end.setHours(0, 0, 0, 0);
  const dates = [];
  const cur = new Date(start);
  while (cur <= end) { dates.push(toDateString(cur)); cur.setDate(cur.getDate() + 1); }
  return dates;
}
const isDatePast = (dateStr) => {
  if (!dateStr) return false;
  const targetDate = new Date(dateStr);
  targetDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return targetDate < today;
};
const getEventStatus = (eventObj, attendanceDateStr, checkingDate) => {
  if (attendanceDateStr && attendanceDateStr !== "N/A") return "Present";
  const dateToCheck = checkingDate || eventObj?.eventDate;
  if (!dateToCheck) return "Registered";
  return isDatePast(dateToCheck) ? "Absent" : "Registered";
};
// ─────────────────────────────────────────────────────────────────────────────

export default function CollegeEventAttendanceScreen({ event, college, accessToken }) {
  const { goBack } = useContext(NavigationContext);
  const insets = useSafeAreaInsets();
  const { darkMode, lightTheme, darkTheme } = useTheme();
  const colors = darkMode ? darkTheme : lightTheme;
  const [loading, setLoading] = useState(false);
  const [eventAttendanceList, setEventAttendanceList] = useState([]);
  const [tableSearch, setTableSearch] = useState('');
  const [tableStatusFilter, setTableStatusFilter] = useState('All');
  const [selectedDate, setSelectedDate] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState('detailed'); // 'detailed' or 'summary'

  const eventDates = useMemo(() => {
    const start = event?.startDate || event?.eventDate;
    const end = event?.endDate || start;
    if (!start) return [];
    return getEventDates(start, end);
  }, [event]);

  const isMultiDay = eventDates.length > 1;

  useEffect(() => {
    if (eventDates.length > 0 && selectedDate === null) {
      const today = toDateString(new Date());
      setSelectedDate(eventDates.includes(today) ? today : eventDates[0]);
    }
  }, [eventDates]);

  const fetchAttendance = useCallback(async (dateOverride = null) => {
    if (!event?._id) return;
    setLoading(true);
    try {
      const url = `${college_host}/event/${event._id}/attendance${dateOverride ? `?date=${dateOverride}` : ""}`;
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error("Failed to fetch attendance");
      const data = await response.json();
      const students = data?.data?.attendance?.[0]?.students || [];

      const list = students.map((student) => {
        const markedAt = student.attendanceMarkedAt;
        const attDate = markedAt ? new Date(markedAt).toLocaleDateString() : "N/A";
        return {
          studentName: student.name,
          prn: student.prn,
          department: student.department || "N/A",
          className: student.className || "N/A",
          attendanceDate: attDate,
          attendanceRecords: student.attendanceRecords || [],
          status: getEventStatus(event, markedAt ? "Present" : "N/A", dateOverride),
        };
      });
      setEventAttendanceList(list);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  }, [event?._id, accessToken]); // eslint-disable-line

  useEffect(() => {
    if (event?._id) {
      if (viewMode === 'detailed') {
        if (selectedDate) fetchAttendance(selectedDate);
      } else {
        fetchAttendance(null);
      }
    }
  }, [selectedDate, event?._id, viewMode, fetchAttendance]);

  const saveFile = async (filename, base64Data) => {
    if (RNPlatform.OS === "web") return;
    try {
      if (RNPlatform.OS === "android") {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const uri = await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
          await FileSystem.writeAsStringAsync(uri, base64Data, { encoding: 'base64' });
          alert("File saved successfully!");
        }
      } else {
        const filepath = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(filepath, base64Data, { encoding: 'base64' });
        await Sharing.shareAsync(filepath, { mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", dialogTitle: "Export Report", UTI: "com.microsoft.excel.xlsx" });
      }
    } catch (err) { alert(err.message); }
  };

  const exportEventAttendanceToExcel = async () => {
    try {
      setIsExporting(true);
      const workbook = new ExcelJS.Workbook();
      const collegeName = college.name?.toUpperCase() || "College";
      const collegeAddress = college.address || "Address not available";
      const logoUrl = college.logoUrl || college.profileImage;

      let logoImageId = null;
      if (logoUrl) {
        try {
          let base64Data = "";
          let extension = logoUrl.toLowerCase().includes("jpg") ? "jpeg" : "png";
          if (RNPlatform.OS === "web") {
            const resp = await fetch(logoUrl);
            const blob = await resp.blob();
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            await new Promise((res) => { reader.onloadend = () => { base64Data = reader.result.toString().split(",")[1]; res(); }; });
          } else {
            const fileUri = `${FileSystem.cacheDirectory}college_logo_temp.${extension}`;
            await FileSystem.downloadAsync(logoUrl, fileUri);
            base64Data = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
          }
          if (base64Data) logoImageId = workbook.addImage({ base64: base64Data, extension });
        } catch (err) {}
      }

      const fetchForSheet = async (date) => {
        try {
          const url = `${college_host}/event/${event._id}/attendance${date ? `?date=${date}` : ""}`;
          const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } });
          if (!res.ok) return [];
          const json = await res.json();
          const students = json?.data?.attendance?.[0]?.students || [];
          return students.map(s => ({
            studentName: s.name, 
            prn: s.prn, 
            department: s.department || "N/A", 
            className: s.className || "N/A",
            attendanceDate: s.attendanceMarkedAt ? new Date(s.attendanceMarkedAt).toLocaleDateString() : "N/A",
            attendanceRecords: s.attendanceRecords || [],
            status: getEventStatus(event, s.attendanceMarkedAt ? new Date(s.attendanceMarkedAt).toDateString() : null, date),
          }));
        } catch (e) { return []; }
      };

      // ─── ADD SUMMARY SHEET FOR MULTI-DAY ───
      if (isMultiDay) {
        const summaryData = await fetchForSheet(null);
        if (summaryData.length > 0) {
          const ws = workbook.addWorksheet("Summary");
          if (logoImageId !== null) ws.addImage(logoImageId, { tl: { col: 0, row: 0 }, br: { col: 1, row: 4 }, editAs: "oneCell" });
          ws.mergeCells("B2:H2"); ws.getCell("B2").value = collegeName; ws.getCell("B2").font = { bold: true, size: 18 };
          ws.mergeCells("B3:H3"); ws.getCell("B3").value = collegeAddress; ws.getCell("B3").font = { size: 12 };
          ws.mergeCells("A6:H6"); const tr = ws.getCell("A6"); tr.value = "EVENT CONSOLIDATED SUMMARY"; tr.font = { bold: true, color: { argb: "FFFFFFFF" } };
          tr.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };

          const headerRow = ws.getRow(8);
          const headers = ["Student Name", "PRN", "Department", ...eventDates.map(d => formatDateLabel(d))];
          headerRow.values = headers;
          headerRow.eachCell(c => { c.font = { bold: true, color: { argb: "FFFFFFFF" } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } }; c.alignment = { horizontal: "center" }; });

          summaryData.forEach((s, idx) => {
            const rowValues = [s.studentName, s.prn, s.department];
            eventDates.forEach(d => {
              const present = s.attendanceRecords.some(r => r.attendanceDate === d);
              rowValues.push(present ? "P" : (isDatePast(d) ? "A" : "R"));
            });
            const row = ws.addRow(rowValues);
            const isEven = idx % 2 === 0;
            row.eachCell((c, col) => {
              if (col > 3) {
                const val = c.value;
                const bg = val === "P" ? "FF10b981" : (val === "A" ? "FFef4444" : "FFf59e0b");
                c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } }; c.font = { color: { argb: "FFFFFFFF" }, bold: true };
              } else {
                c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: isEven ? "FFFFFFFF" : "FFF2F2F2" } };
              }
              c.alignment = { horizontal: "center" };
            });
          });
          ws.columns = [{ width: 25 }, { width: 15 }, { width: 20 }, ...eventDates.map(() => ({ width: 12 }))];
        }
      }

      const datesToExport = eventDates.length > 0 ? eventDates : [null];
      let hasData = false;
      for (const d of datesToExport) {
        const data = await fetchForSheet(d);
        if (data.length === 0) continue;
        hasData = true;
        const sheetName = d ? formatDateLabel(d).replace(/,/g, "").replace(/\s+/g, "_") : "Attendance";
        const ws = workbook.addWorksheet(sheetName.slice(0, 31));
        if (logoImageId !== null) ws.addImage(logoImageId, { tl: { col: 0, row: 0 }, br: { col: 1, row: 4 }, editAs: "oneCell" });
        ws.mergeCells("B2:E2"); ws.getCell("B2").value = collegeName; ws.getCell("B2").font = { bold: true, size: 18 };
        ws.mergeCells("B3:E3"); ws.getCell("B3").value = collegeAddress; ws.getCell("B3").font = { size: 12 };
        ws.mergeCells("A6:E6"); const tr = ws.getCell("A6"); tr.value = "EVENT ATTENDANCE LOG"; tr.font = { bold: true, color: { argb: "FFFFFFFF" } };
        tr.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };

        const addI = (l, v, i, b = false) => { ws.mergeCells(`A${i}:E${i}`); const c = ws.getCell(`A${i}`); c.value = `${l}: ${v}`; c.font = { size: 12, bold: b }; c.alignment = { horizontal: "center" }; };
        addI("Event", event.aim || "Event", 7, true); addI("Date", d ? new Date(d).toLocaleDateString() : "N/A", 8);
        addI("Status", `Present: ${data.filter(s => s.status === "Present").length} / Registered: ${data.length}`, 9);

        const hr = ws.getRow(11); hr.values = ["Student Name", "PRN", "Department", "Class", "Status", "Attended Time"];
        hr.eachCell(c => { c.font = { bold: true, color: { argb: "FFFFFFFF" } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } }; });

        data.forEach((rec, idx) => {
          const row = ws.addRow([rec.studentName, rec.prn, rec.department, rec.className, rec.status, rec.attendanceDate]);
          const isEven = idx % 2 === 0;
          row.eachCell((c, col) => {
            if (col === 5) {
              const color = rec.status === "Present" ? "FF10b981" : (rec.status === "Absent" ? "FFef4444" : "FFf59e0b");
              c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } }; c.font = { color: { argb: "FFFFFFFF" } };
            } else { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: isEven ? "FFFFFFFF" : "FFF2F2F2" } }; }
            c.alignment = { horizontal: "center" };
          });
        });
        ws.columns = [{ width: 25 }, { width: 15 }, { width: 20 }, { width: 15 }, { width: 15 }, { width: 20 }];
      }

      if (!hasData) { alert("No data to export"); setIsExporting(false); return; }
      const filename = `attendance_${event.aim?.replace(/\s+/g, "_")}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      if (RNPlatform.OS === "web") {
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
      } else {
        const base64 = Buffer.from(buffer).toString("base64");
        await saveFile(filename, base64);
      }
      setIsExporting(false);
    } catch (e) { setIsExporting(false); alert(e.message); }
  };

  const tableFiltered = useMemo(() => {
    let filtered = tableStatusFilter === 'All' ? eventAttendanceList : eventAttendanceList.filter(r => r.status === tableStatusFilter);
    if (tableSearch.trim()) {
      filtered = filtered.filter(r => (r.studentName || '').toLowerCase().includes(tableSearch.toLowerCase()) || (r.prn || '').toLowerCase().includes(tableSearch.toLowerCase()));
    }
    return filtered;
  }, [eventAttendanceList, tableStatusFilter, tableSearch]);

  const STATUS_PILLS = [
    { label: 'All', color: colors.accent, count: eventAttendanceList.length },
    { label: 'Present', color: '#10b981', count: eventAttendanceList.filter(r => r.status === 'Present').length },
    { label: 'Absent', color: '#ef4444', count: eventAttendanceList.filter(r => r.status === 'Absent').length },
    { label: 'Registered', color: '#f59e0b', count: eventAttendanceList.filter(r => r.status === 'Registered').length },
  ];

  const renderConsolidatedGrid = () => {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ borderRadius: 16, overflow: 'hidden' }}>
        <View style={{ backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border }}>
          {/* Header Row */}
          <View style={{ flexDirection: 'row', backgroundColor: colors.accent }}>
            <View style={{ width: 160, padding: 12, borderRightWidth: 1, borderRightColor: '#ffffff30' }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>STUDENT NAME</Text>
            </View>
            {eventDates.map((d, i) => (
              <View key={d} style={{ width: 70, padding: 12, borderRightWidth: i < eventDates.length - 1 ? 1 : 0, borderRightColor: '#ffffff30', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 10, textAlign: 'center' }}>{formatDateLabel(d).replace(',', '\n')}</Text>
              </View>
            ))}
          </View>

          {/* Data Rows */}
          {tableFiltered.map((student, idx) => (
            <View key={student.prn + idx} style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: idx % 2 === 0 ? colors.cardBg : `${colors.accent}05` }}>
              <View style={{ width: 160, padding: 12, borderRightWidth: 1, borderRightColor: colors.border }}>
                <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 12 }} numberOfLines={1}>{student.studentName}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{student.prn}</Text>
              </View>
              {eventDates.map((d, i) => {
                const present = student.attendanceRecords.some(r => r.attendanceDate === d);
                const status = present ? "P" : (isDatePast(d) ? "A" : "R");
                const color = present ? "#10b981" : (isDatePast(d) ? "#ef4444" : "#f59e0b");
                
                return (
                  <View key={d} style={{ width: 70, padding: 12, borderRightWidth: i < eventDates.length - 1 ? 1 : 0, borderRightColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ backgroundColor: `${color}20`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: `${color}40` }}>
                      <Text style={{ color: color, fontWeight: '900', fontSize: 11 }}>{status}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.backgroundColors ? colors.backgroundColors[0] : "#F8F9FA", paddingTop: Math.max(insets.top, 20) }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingHorizontal: 20 }}>
        <TouchableOpacity 
          onPress={() => goBack()} 
          style={{ 
            width: 44, 
            height: 44, 
            borderRadius: 22, 
            backgroundColor: colors.cardBg, 
            alignItems: 'center', 
            justifyContent: 'center',
            marginRight: 16,
            borderWidth: 1,
            borderColor: colors.border,
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
          }}
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: '900', color: colors.header, lineHeight: 28, letterSpacing: -0.5 }} numberOfLines={1}>{event.aim}</Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>
            {new Date(event.startDate || event.eventDate).toLocaleDateString()}{event.endDate && event.endDate !== (event.startDate || event.eventDate) ? ` - ${new Date(event.endDate).toLocaleDateString()}` : ''}
          </Text>
        </View>
        <TouchableOpacity 
          onPress={exportEventAttendanceToExcel} 
          disabled={isExporting} 
          style={{ 
            backgroundColor: colors.accent, 
            paddingHorizontal: 16, 
            paddingVertical: 10, 
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 3,
          }}
        >
          <FileSpreadsheet size={16} color="#fff" style={{ marginRight: 6 }} />
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>{isExporting ? '...' : 'Export'}</Text>
        </TouchableOpacity>
      </View>

      {/* View Mode Toggle */}
      {isMultiDay && (
        <View style={{ flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, padding: 4, backgroundColor: colors.cardBg, borderRadius: 14, borderWidth: 1, borderColor: colors.border }}>
          <TouchableOpacity 
            onPress={() => setViewMode('detailed')}
            style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: viewMode === 'detailed' ? colors.accent : 'transparent', alignItems: 'center' }}
          >
            <Text style={{ fontSize: 12, fontWeight: '800', color: viewMode === 'detailed' ? '#fff' : colors.textSecondary }}>DETAILED VIEW</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setViewMode('summary')}
            style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: viewMode === 'summary' ? colors.accent : 'transparent', alignItems: 'center' }}
          >
            <Text style={{ fontSize: 12, fontWeight: '800', color: viewMode === 'summary' ? '#fff' : colors.textSecondary }}>CONSOLIDATED SUMMARY</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 16 + insets.bottom }}>
        {/* Multi-day date selector (Only in detailed view) */}
        {isMultiDay && viewMode === 'detailed' && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 8 }}>SELECT DATE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {eventDates.map(d => {
                const active = selectedDate === d;
                return (
                  <TouchableOpacity key={d} onPress={() => setSelectedDate(d)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: active ? colors.accent : colors.border, backgroundColor: active ? colors.accent : colors.cardBg }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#fff' : colors.textPrimary }}>{formatDateLabel(d)}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Stats & Filters */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {STATUS_PILLS.map(p => {
            const active = tableStatusFilter === p.label;
            return (
              <TouchableOpacity key={p.label} onPress={() => setTableStatusFilter(p.label)} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: p.color, backgroundColor: active ? p.color : 'transparent' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#fff' : p.color }}>{p.label} ({p.count})</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Search */}
        <View style={{ backgroundColor: colors.cardBg, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 18, color: colors.textSecondary, marginRight: 12 }}>⌕</Text>
          <TextInput 
            placeholder="Search students..." 
            placeholderTextColor={colors.textSecondary} 
            style={{ flex: 1, color: colors.textPrimary, fontSize: 14, fontWeight: '500' }} 
            value={tableSearch} 
            onChangeText={setTableSearch} 
          />
        </View>

        {/* Table/Grid View */}
        {loading ? (
          <View style={{ marginTop: 40 }}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={{ textAlign: 'center', color: colors.textSecondary, marginTop: 12, fontSize: 12 }}>Loading records...</Text>
          </View>
        ) : tableFiltered.length === 0 ? (
          <View style={{ marginTop: 40, alignItems: 'center' }}>
            <Text style={{ color: colors.textSecondary, fontSize: 16, fontWeight: '500' }}>No students found</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>Try adjusting your filters or search term</Text>
          </View>
        ) : viewMode === 'summary' ? (
          renderConsolidatedGrid()
        ) : (
          <View>
            {tableFiltered.map((item, index) => (
              <View key={item.prn + index} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: colors.cardBg, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>{item.studentName}</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{item.prn} · {item.className}</Text>
                </View>
                <View style={{ backgroundColor: item.status === 'Present' ? '#10b981' : item.status === 'Absent' ? '#ef4444' : '#f59e0b', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '900', color: '#fff', textTransform: 'uppercase' }}>{item.status}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

