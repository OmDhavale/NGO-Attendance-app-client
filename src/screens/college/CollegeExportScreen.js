import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform as RNPlatform, ActivityIndicator, FlatList, TextInput, Modal } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import ExcelJS from 'exceljs';
import { Buffer } from 'buffer';
import { NavigationContext } from '../../context/NavigationContext';
import { useTheme } from '../../context/ThemeContext';
import { AuthContext } from "../../context/AuthContext";
import { college_host } from "../../../apis/api";
import { ArrowLeft, FileText, Layers, Search, ChevronRight } from 'lucide-react-native';
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

export default function CollegeExportScreen({ college, eventsList = [] }) {
  const { navigate, goBack } = useContext(NavigationContext);
  const insets = useSafeAreaInsets();
  const { darkMode, lightTheme, darkTheme } = useTheme();
  const colors = darkMode ? darkTheme : lightTheme;
  const { accessToken } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventSearch, setEventSearch] = useState('');

  const collegeData = college;

  const saveFile = async (filename, base64Data) => {
    if (RNPlatform.OS === "web") return;
    try {
      if (RNPlatform.OS === "android") {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const uri = await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            filename,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          );
          await FileSystem.writeAsStringAsync(uri, base64Data, { encoding: 'base64' });
          alert("File saved successfully!");
        } else {
          alert("Export cancelled: No folder selected.");
        }
      } else {
        const filepath = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(filepath, base64Data, { encoding: 'base64' });
        await Sharing.shareAsync(filepath, {
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          dialogTitle: "Export Data",
          UTI: "com.microsoft.excel.xlsx",
        });
      }
    } catch (error) {
      console.error("File save error:", error);
      alert("Error saving file: " + error.message);
    }
  };

  const exportAllEventsToExcel = async () => {
    try {
      if (!eventsList || eventsList.length === 0) {
        alert("No events to export");
        return;
      }
      setLoading(true);
      const workbook = new ExcelJS.Workbook();
      const collegeName = collegeData.name?.toUpperCase() || "College";
      const collegeAddress = collegeData.address || "Address not available";
      const logoUrl = collegeData.logoUrl || collegeData.profileImage;

      let logoImageId = null;
      if (logoUrl) {
        try {
          let base64Data = "";
          let extension = "png";
          if (logoUrl.toLowerCase().includes("jpg") || logoUrl.toLowerCase().includes("jpeg")) extension = "jpeg";

          if (RNPlatform.OS === "web") {
            const response = await fetch(logoUrl);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            await new Promise((resolve) => {
              reader.onloadend = () => {
                base64Data = reader.result.toString().split(",")[1];
                resolve();
              };
            });
          } else {
            const fileUri = `${FileSystem.cacheDirectory}college_logo_temp.${extension}`;
            await FileSystem.downloadAsync(logoUrl, fileUri);
            base64Data = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
          }
          if (base64Data) logoImageId = workbook.addImage({ base64: base64Data, extension: extension });
        } catch (err) { console.warn("Could not load logo:", err); }
      }

      let hasData = false;
      for (const event of eventsList) {
        const start = event?.startDate || event?.eventDate;
        const end = event?.endDate || start;
        const eventDates = start ? getEventDates(start, end) : [];
        const datesToExport = eventDates.length > 0 ? eventDates : [null];
        const eventName = event.aim || "Event";

        // ─── ADD SUMMARY SHEET FOR MULTI-DAY EVENT ───
        if (eventDates.length > 1) {
           let summaryAttendance = [];
           try {
             const url = `${college_host}/event/${event._id}/attendance`;
             const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } });
             if (res.ok) {
               const json = await res.json();
               summaryAttendance = json?.data?.attendance?.[0]?.students || [];
             }
           } catch (e) {}

           if (summaryAttendance.length > 0) {
             const ws = workbook.addWorksheet(`${eventName.slice(0,15)}_Summary`);
             if (logoImageId !== null) ws.addImage(logoImageId, { tl: { col: 0, row: 0 }, br: { col: 1, row: 4 }, editAs: "oneCell" });
             ws.mergeCells("B2:H2"); ws.getCell("B2").value = collegeName; ws.getCell("B2").font = { bold: true, size: 18 };
             ws.mergeCells("B3:H3"); ws.getCell("B3").value = collegeAddress; ws.getCell("B3").font = { size: 12 };
             ws.mergeCells("A6:H6"); const tr = ws.getCell("A6"); tr.value = `SUMMARY: ${eventName.toUpperCase()}`; tr.font = { bold: true, color: { argb: "FFFFFFFF" } };
             tr.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };

             const headerRow = ws.getRow(8);
             const hdrs = ["Student Name", "PRN", "Department", ...eventDates.map(d => formatDateLabel(d))];
             headerRow.values = hdrs;
             headerRow.eachCell(c => { c.font = { bold: true, color: { argb: "FFFFFFFF" } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } }; c.alignment = { horizontal: "center" }; });

             summaryAttendance.forEach((s, idx) => {
               const rowVals = [s.name, s.prn, s.department];
               eventDates.forEach(d => {
                 const present = s.attendanceRecords?.some(r => r.attendanceDate === d);
                 rowVals.push(present ? "P" : (isDatePast(d) ? "A" : "R"));
               });
               const row = ws.addRow(rowVals);
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
                 c.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
               });
             });
             ws.columns = [{ width: 25 }, { width: 15 }, { width: 20 }, ...eventDates.map(() => ({ width: 10 }))];
           }
        }

        for (const d of datesToExport) {
          let eventAttendance = [];
          try {
            const url = `${college_host}/event/${event._id}/attendance${d ? `?date=${d}` : ""}`;
            const res = await fetch(url, {
              method: "GET",
              headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
            });
            if (res.ok) {
              const apiData = await res.json();
              const students = apiData?.data?.attendance?.[0]?.students || [];
              eventAttendance = students.map((student) => {
                const attDate = student.attendanceMarkedAt ? new Date(student.attendanceMarkedAt).toLocaleDateString() : "N/A";
                return {
                  studentName: student.name,
                  prn: student.prn,
                  department: student.department || "N/A",
                  className: student.className || "N/A",
                  attendanceDate: attDate,
                  status: getEventStatus(event, student.attendanceMarkedAt ? "Present" : "N/A", d),
                };
              });
            }
          } catch (err) { console.warn(err); }

          if (eventAttendance.length === 0) continue;
          hasData = true;
          let safeSheetName = (eventName.replace(/[\\/?*[\]]/g, "")).slice(0, 20);
          if (d) {
             safeSheetName = `${safeSheetName}_${formatDateLabel(d).replace(/,/g,"").replace(/\s+/g,"_")}`;
          }
          safeSheetName = safeSheetName.slice(0, 31);
          const worksheet = workbook.addWorksheet(safeSheetName);

          if (logoImageId !== null) {
            worksheet.addImage(logoImageId, { tl: { col: 0, row: 0 }, br: { col: 1, row: 4 }, editAs: "oneCell" });
          }

        worksheet.mergeCells("B2:E2");
        const nameCell = worksheet.getCell("B2");
        nameCell.value = collegeName;
        nameCell.font = { bold: true, size: 18 };
        nameCell.alignment = { vertical: "middle", horizontal: "center" };

        worksheet.mergeCells("B3:E3");
        const addrCell = worksheet.getCell("B3");
        addrCell.value = collegeAddress;
        addrCell.font = { color: { argb: "FF666666" }, size: 12 };
        addrCell.alignment = { vertical: "top", horizontal: "center" };

        worksheet.mergeCells("A6:E6");
        const titleRow = worksheet.getCell("A6");
        titleRow.value = "EVENT DETAILS";
        titleRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
        titleRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
        titleRow.alignment = { horizontal: "center", vertical: "middle" };

        const addInfoRow = (label, value, rowIndex, isBold = false) => {
          worksheet.mergeCells(`A${rowIndex}:E${rowIndex}`);
          const cell = worksheet.getCell(`A${rowIndex}`);
          cell.value = `${label}: ${value}`;
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.font = { size: 12, bold: isBold };
        };

          addInfoRow("Event", eventName, 7, true);
          addInfoRow("NGO", event.createdBy?.name || event.createdBy || "N/A", 8);
          addInfoRow("Location", event.location || "N/A", 9);
          addInfoRow("Date", d ? new Date(d).toLocaleDateString() : new Date(event.eventDate).toLocaleDateString(), 10);
          addInfoRow("Total Registered", eventAttendance.length, 11);
          addInfoRow("Total Present", eventAttendance.filter(r => r.status === "Present").length, 12);

        const headerRow = worksheet.getRow(14);
        headerRow.values = ["Student Name", "PRN", "Department", "Class", "Status", "Attendance Date"];
        headerRow.eachCell(c => {
          c.font = { bold: true, color: { argb: "FFFFFFFF" } };
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
          c.alignment = { horizontal: "center" };
        });

        eventAttendance.forEach((record, idx) => {
          const row = worksheet.addRow([record.studentName, record.prn, record.department, record.className, record.status, record.attendanceDate]);
          const isEven = idx % 2 === 0;
          row.eachCell((cell, col) => {
            if (col === 5) {
              const color = record.status === "Present" ? "FF10b981" : (record.status === "Absent" ? "FFef4444" : "FFf59e0b");
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
              cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
            } else {
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: isEven ? "FFFFFFFF" : "FFF2F2F2" } };
            }
            cell.alignment = { horizontal: "center" };
            cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
          });
        });
            worksheet.columns = [{ width: 25 }, { width: 15 }, { width: 20 }, { width: 20 }, { width: 15 }, { width: 20 }];
        }
      }

      if (!hasData) { setLoading(false); alert("No attendance data found."); return; }
      const filename = `all_events_${collegeName.replace(/\s+/g, "_")}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();

      if (RNPlatform.OS === "web") {
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = filename; a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const base64 = Buffer.from(buffer).toString("base64");
        await saveFile(filename, base64);
      }
      setLoading(false);
    } catch (error) { setLoading(false); alert(error.message); }
  };

  const exportToExcel = async () => {
    try {
      setLoading(true);
      const workbook = new ExcelJS.Workbook();
      const collegeName = collegeData.name?.toUpperCase() || "College";
      const collegeAddress = collegeData.address || "Address not available";
      const logoUrl = collegeData.logoUrl;

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
        } catch (err) { console.warn(err); }
      }

      const studentEventMap = {};
      for (const event of eventsList) {
        const start = event?.startDate || event?.eventDate;
        const end = event?.endDate || start;
        const eventDates = start ? getEventDates(start, end) : [];
        const datesToExport = eventDates.length > 0 ? eventDates : [null];

        for (const d of datesToExport) {
          try {
            const url = `${college_host}/event/${event._id}/attendance${d ? `?date=${d}` : ""}`;
            const res = await fetch(url, {
              method: "GET",
              headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
            });
            if (!res.ok) continue;
            const apiData = await res.json();
            const students = apiData?.data?.attendance?.[0]?.students || [];
            students.forEach((student) => {
              const attDate = student.attendanceMarkedAt ? new Date(student.attendanceMarkedAt).toLocaleDateString() : "N/A";
              const status = getEventStatus(event, student.attendanceMarkedAt ? "Present" : "N/A", d);
              const record = {
                eventName: event.aim || "N/A",
                ngoName: event.createdBy?.name || event.createdBy || "N/A",
                eventDate: d ? new Date(d).toLocaleDateString() : (event.eventDate ? new Date(event.eventDate).toLocaleDateString() : "N/A"),
                attendanceDate: attDate,
                status,
                prn: student.prn,
                name: student.name,
                department: student.department || "N/A",
                className: student.className || "N/A",
              };
              const idKey = student._id?.toString();
              const prnKey = student.prn?.toString();
              if (idKey) { if (!studentEventMap[idKey]) studentEventMap[idKey] = []; studentEventMap[idKey].push(record); }
              if (prnKey && prnKey !== idKey) { if (!studentEventMap[prnKey]) studentEventMap[prnKey] = []; studentEventMap[prnKey].push(record); }
            });
          } catch (err) { }
        }
      }

      collegeData.classes.forEach((classData) => {
        if (!classData.students || classData.students.length === 0) return;
        const worksheet = workbook.addWorksheet(classData.className.slice(0, 30));
        if (logoImageId !== null) worksheet.addImage(logoImageId, { tl: { col: 0, row: 0 }, br: { col: 1, row: 4 }, editAs: "oneCell" });
        
        worksheet.mergeCells("B2:H2");
        const nc = worksheet.getCell("B2"); nc.value = collegeName; nc.font = { bold: true, size: 18 };
        worksheet.mergeCells("B3:H3");
        const ac = worksheet.getCell("B3"); ac.value = collegeAddress; ac.font = { size: 12 };

        worksheet.mergeCells("A5:H5");
        const clh = worksheet.getCell("A5"); clh.value = `CLASS: ${classData.className}`; 
        clh.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
        clh.font = { color: { argb: "FFFFFFFF" }, bold: true };

        const hr = worksheet.getRow(7);
        hr.values = ["Student Name", "PRN", "Department", "Event Name", "NGO Name", "Status", "Event Date", "Attendance Date"];
        hr.eachCell(c => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } }; c.font = { color: { argb: "FFFFFFFF" } }; });

        let curRow = 8;
        classData.students.forEach((student, sIdx) => {
          const events = studentEventMap[student._id] || studentEventMap[student.prn] || [];
          const rowCount = Math.max(events.length, 1);
          const startR = curRow;
          const endR = curRow + rowCount - 1;
          const bgColor = sIdx % 2 === 0 ? "FFFFFFFF" : "FFF2F2F2";

          if (events.length > 0) {
            events.forEach((e, i) => {
              worksheet.getRow(curRow + i).values = [student.name, student.prn, student.department || e.department, e.eventName, e.ngoName, e.status, e.eventDate, e.attendanceDate];
            });
          } else {
            worksheet.getRow(curRow).values = [student.name, student.prn, student.department || "", "No events registered", "-", "-", "-", "-"];
          }

          if (rowCount > 1) { 
            worksheet.mergeCells(`A${startR}:A${endR}`); 
            worksheet.mergeCells(`B${startR}:B${endR}`); 
            worksheet.mergeCells(`C${startR}:C${endR}`); 
          }

          for (let r = startR; r <= endR; r++) {
            worksheet.getRow(r).eachCell({ includeEmpty: true }, (c, col) => {
              if (col === 6 && events[r-startR]?.status && events[r-startR].status !== "-") {
                const s = events[r-startR].status;
                const color = s === "Present" ? "FF10b981" : (s === "Absent" ? "FFef4444" : "FFf59e0b");
                c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } }; c.font = { color: { argb: "FFFFFFFF" } };
              } else {
                c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
              }
              c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
              c.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
            });
          }
          curRow += rowCount;
        });
        worksheet.columns = [{width:25}, {width:15}, {width:20}, {width:30}, {width:22}, {width:14}, {width:15}, {width:18}];
      });

      const filename = `college_data_${collegeName.replace(/\s+/g, "_")}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      if (RNPlatform.OS === "web") {
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
      } else {
        const base64 = Buffer.from(buffer).toString("base64");
        await saveFile(filename, base64);
      }
      setLoading(false);
    } catch (error) { setLoading(false); alert(error.message); }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.cardBg }}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ marginTop: 10, color: colors.textPrimary }}>Exporting data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.backgroundColors ? colors.backgroundColors[0] : "#F8F9FA" }} contentContainerStyle={{ padding: 20, paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 28 }}>
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
        <View>
          <Text style={{ fontSize: 24, fontWeight: '900', color: colors.header, lineHeight: 30, letterSpacing: -0.5 }}>Export Attendance</Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>College Data & Reports</Text>
        </View>
      </View>

      {/* Options */}
      <View style={{ gap: 16 }}>
        {/* Option 1: Class Data */}
        <TouchableOpacity
          onPress={exportToExcel}
          activeOpacity={0.7}
          style={{
            backgroundColor: colors.cardBg,
            padding: 18,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.border,
            elevation: 1,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: `${colors.accent}10`, alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={24} color={colors.accent} strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.header }}>Export Class-wise Data</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 16 }}>Full Excel sheet with student details and cross-event records.</Text>
            </View>
            <ChevronRight size={18} color={colors.border} />
          </View>
        </TouchableOpacity>

        {/* Option 2: All Events */}
        <TouchableOpacity
          onPress={exportAllEventsToExcel}
          activeOpacity={0.7}
          style={{
            backgroundColor: colors.cardBg,
            padding: 18,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.border,
            elevation: 1,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: '#EBF2FF', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={24} color="#3b82f6" strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.header }}>Export All Events</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 16 }}>Generates a multi-sheet file for all assigned events at once.</Text>
            </View>
            <ChevronRight size={18} color={colors.border} />
          </View>
        </TouchableOpacity>

        {/* Option 3: Specific Event */}
        <TouchableOpacity
          onPress={() => setShowEventModal(true)}
          activeOpacity={0.7}
          style={{
            backgroundColor: colors.cardBg,
            padding: 18,
            borderRadius: 20,
            borderWidth: 1.5,
            borderColor: colors.accent,
            borderStyle: 'dashed',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: colors.iconBg, alignItems: 'center', justifyContent: 'center' }}>
              <Search size={24} color={colors.accent} strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.header }}>Specific Event Attendance</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 16 }}>Pick one specific event to analyze stats and download report.</Text>
            </View>
            <View style={{ backgroundColor: `${colors.accent}15`, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
              <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 10 }}>PICK ▼</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Event Picker Modal */}
      <Modal visible={showEventModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.header }}>Select Event</Text>
              <TouchableOpacity onPress={() => setShowEventModal(false)}>
                <Text style={{ color: colors.textSecondary, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              placeholder="Search event..."
              placeholderTextColor={colors.textSecondary}
              style={{ backgroundColor: colors.iconBg, borderRadius: 12, padding: 12, color: colors.textPrimary, marginBottom: 16 }}
              value={eventSearch}
              onChangeText={setEventSearch}
            />
            <FlatList
              data={eventsList.filter(e => e.aim?.toLowerCase().includes(eventSearch.toLowerCase()))}
              keyExtractor={item => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setShowEventModal(false);
                    navigate("CollegeEventAttendance", { event: item, college: collegeData, accessToken });
                  }}
                  style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary }}>{item.aim}</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                    📅 {new Date(item.startDate || item.eventDate).toLocaleDateString()}{item.endDate && item.endDate !== (item.startDate || item.eventDate) ? ` - ${new Date(item.endDate).toLocaleDateString()}` : ''} · {item.createdBy?.name || item.createdBy || 'NGO'}
                  </Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
