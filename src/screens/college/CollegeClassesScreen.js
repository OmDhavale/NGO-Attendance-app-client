import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Platform as RNPlatform, ActivityIndicator, FlatList, Image, Modal } from 'react-native';
import { FileText } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AnimatedSearch from '../../components/AnimatedSearch';
import AppHeaderWithDrawer from '../../components/AppHeaderWithDrawer';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import ExcelJS from 'exceljs';
import { Buffer } from 'buffer';
import { NavigationContext } from '../../context/NavigationContext';
import { AttendanceContext } from '../../context/AttendanceContext';
import { useTheme } from '../../context/ThemeContext';
import { AuthContext } from "../../context/AuthContext";
import { college_host, getAllCollegeAPI } from "../../../apis/api";

// And ensure FileSystem/Sharing are required for mobile (as in your previous code)
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
// ─────────────────────────────────────────────────────────────────────────────

export default function CollegeClassesScreen({ college }) {
  const { route, navigate, goBack } = useContext(NavigationContext);
  const insets = useSafeAreaInsets();
  const { addClass } = useContext(AttendanceContext);
  const { darkMode, lightTheme, darkTheme } = useTheme();
  const {user} = useContext(AuthContext);
  const colors = darkMode ? darkTheme : lightTheme;
  const [newClass, setNewClass] = useState('');
  const [loading, setLoading] = useState(false);
  const { logout, accessToken } = useContext(AuthContext);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventSearch, setEventSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventsList, setEventsList] = useState([]);
  const [eventAttendanceList, setEventAttendanceList] = useState([]);
  const [showAttendanceTable, setShowAttendanceTable] = useState(false);
  const [eventLoading, setEventLoading] = useState(false);
  const [collegeData, setCollegeData] = useState(college); // local fresh copy
  const [dataLoading, setDataLoading] = useState(false);
  const [classSearch, setClassSearch] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [tableStatusFilter, setTableStatusFilter] = useState('All');
  const [selectedDate, setSelectedDate] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const eventDates = React.useMemo(() => {
    const start = selectedEvent?.startDate || selectedEvent?.eventDate;
    const end = selectedEvent?.endDate || start;
    if (!start) return [];
    return getEventDates(start, end);
  }, [selectedEvent]);

  const isMultiDay = eventDates.length > 1;

  // Default to today (or first day) when event dates are computed
  useEffect(() => {
    if (eventDates.length > 0 && selectedDate === null) {
      const today = toDateString(new Date());
      setSelectedDate(eventDates.includes(today) ? today : eventDates[0]);
    }
  }, [eventDates]);

  // Refetch when selectedDate changes and modal is open
  useEffect(() => {
    if (showAttendanceTable && selectedEvent && selectedDate) {
      handleEventSelect(selectedEvent, selectedDate);
    }
  }, [selectedDate, showAttendanceTable]);
  const classes = collegeData.classes || [];
  const filteredClasses = classes.filter(c =>
    c.className?.toLowerCase().includes(classSearch.toLowerCase())
  );

  // Helper to determine status based on attendance mark and date
  const getEventStatus = (eventObj, attendanceDateStr, checkingDate) => {
    // 1. If marked present, it's "Present"
    if (attendanceDateStr && attendanceDateStr !== "N/A") return "Present";

    // 2. If not marked, check if date is past
    const dateToCheck = checkingDate || eventObj?.eventDate;
    if (!dateToCheck) return "Registered";

    return isDatePast(dateToCheck) ? "Absent" : "Registered";
  };

  // Helper function to save file to local storage
  const saveFile = async (filename, base64Data) => {
    if (RNPlatform.OS === "web") return;

    try {
      if (RNPlatform.OS === "android") {
        // 1. Request permission to pick a folder
        const permissions = await RealFileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

        if (permissions.granted) {
          // 2. Create the file in the selected folder
          const uri = await RealFileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            filename,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          );

          // 3. Write the data
          await RealFileSystem.writeAsStringAsync(uri, base64Data, {
            encoding: 'base64',
          });

          alert("File saved successfully!");
        } else {
          alert("Export cancelled: No folder selected.");
        }
      } else {
        // iOS: Use share sheet which has "Save to Files"
        const filepath = `${RealFileSystem.documentDirectory}${filename}`;
        await RealFileSystem.writeAsStringAsync(filepath, base64Data, {
          encoding: 'base64',
        });

        await RealSharing.shareAsync(filepath, {
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

  // Fetch fresh college data on mount to avoid stale cached data after refresh
  useEffect(() => {
    const fetchFreshCollegeData = async () => {
      try {        

        
        setDataLoading(true);
        const response = await fetch(`${getAllCollegeAPI}/${user._id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) throw new Error('Failed to fetch college data');
        const data = await response.json();
        const colleges = data?.data?.colleges || [];
        // Match by _id to get THIS college's fresh fully-populated data
        const fresh = colleges.find(c => c._id?.toString() === college._id?.toString());
        if (fresh) setCollegeData(fresh);
      } catch (err) {
        console.warn('Could not refresh college data, using cached data:', err);
      } finally {
        setDataLoading(false);
      }
    };
    if (accessToken && college?._id) {
      fetchFreshCollegeData();
    }
  }, [college._id, accessToken]);

  // Re-extract events list whenever fresh college data loads
  useEffect(() => {
    const allEvents = new Map();
    collegeData.classes?.forEach((cls) => {
      cls.students?.forEach((student) => {
        student.attendedEvents?.forEach((event) => {
          const eventId = event.eventId?._id;
          if (eventId && !allEvents.has(eventId)) {
            allEvents.set(eventId, {
              _id: eventId,
              aim: event.eventId?.aim || "Unknown Event",
              createdBy: event.eventId?.createdBy?.name || "Unknown NGO",
              location: event.eventId?.location || "N/A",
              eventDate: event.eventId?.eventDate,
              startDate: event.eventId?.startDate,
              endDate: event.eventId?.endDate,
            });
          }
        });
      });
    });
    setEventsList(Array.from(allEvents.values()));
  }, [collegeData]);

  const handleLogout = async () => {
    await logout();
    navigate("Home");
  };

  const handleEventSelect = async (event, dateOverride = null) => {
    const dateToFetch = dateOverride || selectedDate;
    setSelectedEvent(event);
    setShowEventModal(false);
    setShowAttendanceTable(true);
    setEventLoading(true);

    try {
      const url = `${college_host}/event/${event._id}/attendance${dateToFetch ? `?date=${dateToFetch}` : ""}`;
      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch attendance");

      const data = await response.json();
      const students = data?.data?.attendance?.[0]?.students || [];

      const attendanceList = students.map((student) => {
        const attDate = student.attendanceMarkedAt
          ? new Date(student.attendanceMarkedAt).toDateString()
          : "N/A";
        return {
          studentName: student.name,
          prn: student.prn,
          department: student.department || "N/A",
          className: student.className || "N/A",
          attendanceDate: attDate,
          status: getEventStatus(event, attDate, dateToFetch),
        };
      });

      setEventAttendanceList(attendanceList);
    } catch (err) {
      console.error("Error fetching event attendance:", err);
      alert("Could not load attendance data: " + err.message);
    } finally {
      setEventLoading(false);
    }
  };

  const handleOutsideClick = () => {
    setShowAttendanceTable(false);
  };
  //Exports all events attendance data to excel file
  const exportAllEventsToExcel = async () => {
    console.log("Exporting all events to Excel...");

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

      // --- 1. PRE-LOAD LOGO IMAGE (ONCE) ---
      let logoImageId = null;
      if (logoUrl) {
        try {
          let base64Data = "";
          let extension = "png";

          if (logoUrl.toLowerCase().includes("jpg") || logoUrl.toLowerCase().includes("jpeg")) {
            extension = "jpeg";
          }

          if (RNPlatform.OS === "web") {
            // 🌍 WEB
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
            // 📱 MOBILE
            const fileUri = `${FileSystem.cacheDirectory}college_logo_temp.${extension}`;
            await FileSystem.downloadAsync(logoUrl, fileUri);
            base64Data = await FileSystem.readAsStringAsync(fileUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
          }

          if (base64Data) {
            logoImageId = workbook.addImage({
              base64: base64Data,
              extension: extension,
            });
          }
        } catch (err) {
          console.warn("Could not load logo for export:", err);
        }
      }

      let hasData = false;

      // --- 2. ITERATE AND CREATE SHEET FOR EACH EVENT (via API) ---
      for (const event of eventsList) {
        // A. Fetch fresh attendance data from API
        let eventAttendance = [];
        try {
          const res = await fetch(
            `${college_host}/event/${event._id}/attendance`,
            {
              method: "GET",
              credentials: "include",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );
          if (res.ok) {
            const apiData = await res.json();
            const students = apiData?.data?.attendance?.[0]?.students || [];
            eventAttendance = students.map((student) => {
              const attDate = student.attendanceMarkedAt
                ? new Date(student.attendanceMarkedAt).toLocaleDateString()
                : "N/A";
              return {
                studentName: student.name,
                prn: student.prn,
                department: student.department || "N/A",
                className: student.className || "N/A",
                attendanceDate: attDate,
                status: getEventStatus(event, attDate),
              };
            });
          }
        } catch (err) {
          console.warn(`Could not fetch attendance for event ${event._id}:`, err);
        }

        // Skip events with no registered students
        if (eventAttendance.length === 0) continue;
        hasData = true;

        // B. Setup Worksheet
        const eventName = event.aim || "Event";
        const safeSheetName = (eventName.replace(/[\\/?*[\]]/g, "")).slice(0, 30);
        const worksheet = workbook.addWorksheet(safeSheetName);

        // C. Insert Logo
        if (logoImageId !== null) {
          worksheet.addImage(logoImageId, {
            tl: { col: 0, row: 0 }, // A1
            br: { col: 1, row: 4 }, // B5
            editAs: "oneCell",
          });
        } else {
          worksheet.getCell("A2").value = "No Logo";
        }

        // D. Header Information
        // College Name
        worksheet.mergeCells("B2:E2");
        const nameCell = worksheet.getCell("B2");
        nameCell.value = collegeName;
        nameCell.font = { bold: true, size: 18 };
        nameCell.alignment = { vertical: "middle", horizontal: "center" };

        // College Address
        worksheet.mergeCells("B3:E3");
        const addrCell = worksheet.getCell("B3");
        addrCell.value = collegeAddress;
        addrCell.font = { color: { argb: "FF666666" }, size: 12 };
        addrCell.alignment = { vertical: "top", horizontal: "center" };

        // E. Event Details Section
        worksheet.mergeCells("A6:E6");
        const titleRow = worksheet.getCell("A6");
        titleRow.value = "EVENT DETAILS";
        titleRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
        titleRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4472C4" }, // Blue
        };
        titleRow.alignment = { horizontal: "center", vertical: "middle" };

        // Helper to add centered info rows
        const addInfoRow = (label, value, rowIndex, isBold = false) => {
          const row = worksheet.getRow(rowIndex);
          row.values = [`${label}: ${value}`];
          worksheet.mergeCells(`A${rowIndex}:E${rowIndex}`);
          const cell = row.getCell(1);
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.font = { size: 12, bold: isBold };
          if (isBold) cell.font.size = 14;
        };

        addInfoRow("Event", eventName, 7, true);
        addInfoRow("NGO", event.createdBy?.name || event.createdBy || "N/A", 8);
        addInfoRow("Location", event.location || "N/A", 9);
        addInfoRow("Date", new Date(event.eventDate).toLocaleDateString(), 10);
        addInfoRow("Total Registered", eventAttendance.length, 11);
        addInfoRow("Total Present", eventAttendance.filter(r => r.status === "Present").length, 12);

        // F. Table Headers
        const headerRow = worksheet.getRow(14);
        headerRow.values = ["Student Name", "PRN", "Department", "Class", "Status", "Attendance Date"];
        headerRow.height = 25;

        headerRow.eachCell((cell) => {
          cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF4472C4" },
          };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });

        // G. Data Rows
        eventAttendance.forEach((record, idx) => {
          const row = worksheet.addRow([
            record.studentName,
            record.prn,
            record.department,
            record.className,
            record.status,
            record.attendanceDate,
          ]);

          // Zebra Striping
          const isEven = idx % 2 === 0;
          row.eachCell((cell, colNumber) => {
            // Status Column Color Logic (Col 5)
            if (colNumber === 5) {
              const s = record.status;
              const color = s === "Present" ? "FF10b981" : (s === "Absent" ? "FFef4444" : "FFf59e0b");
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
              cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
            } else {
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: isEven ? "FFFFFFFF" : "FFF2F2F2" },
              };
            }
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
          });
        });

        // Set Column Widths
        worksheet.columns = [
          { width: 25 }, // Name
          { width: 15 }, // PRN
          { width: 20 }, // Dept
          { width: 20 }, // Class
          { width: 15 }, // Status
          { width: 20 }, // Date
        ];
      } // end for...of eventsList

      if (!hasData) {
        setLoading(false);
        alert("No attendance data found in any event.");
        return;
      }

      // --- 3. WRITE & SAVE ---
      const filename = `all_events_${collegeData.name?.replace(/\s+/g, "_")}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();

      if (RNPlatform.OS === "web") {
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        window.URL.revokeObjectURL(url);
        alert("Export successful!");
      } else {
        // Mobile: Use Storage Access Framework for Android, Share for iOS
        const base64 = Buffer.from(buffer).toString("base64");

        if (RNPlatform.OS === "android") {
          // Android: Let user choose where to save
          await saveFile(filename, base64);
        } else {
          // iOS: Use share sheet
          const fileUri = `${RealFileSystem.documentDirectory}${filename}`;
          await RealFileSystem.writeAsStringAsync(fileUri, base64, {
            encoding: RealFileSystem.EncodingType.Base64
          });
          await RealSharing.shareAsync(fileUri, {
            mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            dialogTitle: "Export All Events",
            UTI: "com.microsoft.excel.xlsx",
          });
        }
      }

      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error("Error exporting to Excel:", error);
      alert("Failed to export: " + error.message);
    }
  };
  //Exports specific event attendance data to excel file
  const exportEventAttendanceToExcel = async () => {
    try {
      if (!selectedEvent) {
        alert("No event selected to export");
        return;
      }

      setIsExporting(true);

      const workbook = new ExcelJS.Workbook();
      const collegeName = collegeData.name?.toUpperCase() || "College";
      const collegeAddress = collegeData.address || "Address not available";
      const logoUrl = collegeData.logoUrl || collegeData.profileImage;

      // --- 1. PRE-LOAD LOGO IMAGE ---
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

          if (base64Data) {
            logoImageId = workbook.addImage({ base64: base64Data, extension: extension });
          }
        } catch (err) {
          console.warn("Could not load logo:", err);
        }
      }

      // Helper to fetch attendance without updating state
      const fetchAttendanceForSheet = async (date) => {
        try {
          const url = `${college_host}/event/${selectedEvent._id}/attendance${date ? `?date=${date}` : ""}`;
          const res = await fetch(url, {
            method: "GET",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          });
          if (!res.ok) return [];
          const json = await res.json();
          const students = json?.data?.attendance?.[0]?.students || [];
          return students.map(s => ({
            studentName: s.name,
            prn: s.prn,
            department: s.department || "N/A",
            className: s.className || "N/A",
            attendanceDate: s.attendanceMarkedAt ? new Date(s.attendanceMarkedAt).toLocaleDateString() : "N/A",
            status: getEventStatus(selectedEvent, s.attendanceMarkedAt ? new Date(s.attendanceMarkedAt).toDateString() : null, date),
          }));
        } catch (e) { return []; }
      };

      // 2. Loop through all dates to create sheets
      const datesToExport = eventDates.length > 0 ? eventDates : [null];
      let hasData = false;

      for (const date of datesToExport) {
        const sheetData = await fetchAttendanceForSheet(date);
        if (sheetData.length === 0) continue;
        hasData = true;

        const sheetName = date ? formatDateLabel(date).replace(/,/g, "").replace(/\s+/g, "_") : "Attendance";
        const worksheet = workbook.addWorksheet(sheetName.slice(0, 31));

        // Insert Logo
        if (logoImageId !== null) {
          worksheet.addImage(logoImageId, { tl: { col: 0, row: 0 }, br: { col: 1, row: 4 }, editAs: "oneCell" });
        }

        // Header
        worksheet.mergeCells("B2:E2");
        const nc = worksheet.getCell("B2");
        nc.value = collegeName;
        nc.font = { bold: true, size: 18 };
        nc.alignment = { vertical: "middle", horizontal: "center" };

        worksheet.mergeCells("B3:E3");
        const ac = worksheet.getCell("B3");
        ac.value = collegeAddress;
        ac.font = { color: { argb: "FF666666" }, size: 12 };
        ac.alignment = { vertical: "top", horizontal: "center" };

        // Event Details Card
        worksheet.mergeCells("A6:E6");
        const tr = worksheet.getCell("A6");
        tr.value = "EVENT ATTENDANCE LOG";
        tr.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
        tr.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
        tr.alignment = { horizontal: "center", vertical: "middle" };

        const addInfo = (lbl, val, idx, isB = false) => {
          worksheet.mergeCells(`A${idx}:E${idx}`);
          const cell = worksheet.getCell(`A${idx}`);
          cell.value = `${lbl}: ${val}`;
          cell.alignment = { horizontal: "center" };
          cell.font = { size: 12, bold: isB };
        };

        addInfo("Event", selectedEvent.aim || "Event", 7, true);
        addInfo("Date", date ? new Date(date).toLocaleDateString() : "N/A", 8);
        addInfo("Status", `Present: ${sheetData.filter(s => s.status === "Present").length} / Registered: ${sheetData.length}`, 9);

        // Table Headers
        const hr = worksheet.getRow(11);
        hr.values = ["Student Name", "PRN", "Department", "Class", "Status", "Attended Time"];
        hr.eachCell(c => {
          c.font = { bold: true, color: { argb: "FFFFFFFF" } };
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
          c.alignment = { horizontal: "center" };
        });

        // Data Rows
        sheetData.forEach((rec, idx) => {
          const row = worksheet.addRow([rec.studentName, rec.prn, rec.department, rec.className, rec.status, rec.attendanceDate]);
          const isEven = idx % 2 === 0;
          row.eachCell((c, col) => {
            if (col === 5) {
              const color = rec.status === "Present" ? "FF10b981" : (rec.status === "Absent" ? "FFef4444" : "FFf59e0b");
              c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
              c.font = { color: { argb: "FFFFFFFF" }, bold: true };
            } else {
              c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: isEven ? "FFFFFFFF" : "FFF2F2F2" } };
            }
            c.alignment = { horizontal: "center" };
            c.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
          });
        });

        worksheet.columns = [{ width: 25 }, { width: 15 }, { width: 20 }, { width: 15 }, { width: 15 }, { width: 20 }];
      }

      if (!hasData) {
        alert("No attendance records found for any date.");
        setIsExporting(false);
        return;
      }

      const filename = `attendance_${selectedEvent.aim?.replace(/\s+/g, "_")}.xlsx`;
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
      setIsExporting(false);
    } catch (error) {
      setIsExporting(false);
      console.error("Export Error:", error);
      alert("Failed to export: " + error.message);
    }
  };

  const fetchStudentsByClass = async () => {
    try {
      const allStudents = [];

      for (const cls of classes) {
        const response = await fetch(`${college_host}/class/${cls._id}/students`, {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          allStudents.push({
            className: cls.className,
            students: data.data || [],
          });
        }
      }

      return allStudents;
    } catch (error) {
      console.error("Error fetching students:", error);
      throw error;
    }
  };
  //Exports class-wise attendance data to excel file
  const exportToExcel = async () => {
    try {
      setLoading(true);

      const workbook = new ExcelJS.Workbook();
      const collegeName = collegeData.name?.toUpperCase() || "College";
      const collegeAddress = collegeData.address || "Address not available";
      const logoUrl = collegeData.logoUrl;

      // --- 1. PRE-LOAD LOGO IMAGE ---
      let logoImageId = null;
      if (logoUrl) {
        try {
          let base64Data = "";
          let extension = "png";
          if (
            logoUrl.toLowerCase().includes("jpg") ||
            logoUrl.toLowerCase().includes("jpeg")
          ) {
            extension = "jpeg";
          }

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
            base64Data = await FileSystem.readAsStringAsync(fileUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
          }

          if (base64Data) {
            logoImageId = workbook.addImage({
              base64: base64Data,
              extension: extension,
            });
          }
        } catch (err) {
          console.warn("Could not load college logo:", err);
        }
      }

      // --- 2. FETCH ALL EVENTS' FULL REGISTRATION DATA ---
      // Build a map: studentId → [{ eventId, eventName, ngoName, eventDate, status, attendanceDate }]
      const studentEventMap = {}; // key: student._id, value: array of event records

      for (const event of eventsList) {
        try {
          const res = await fetch(
            `${college_host}/event/${event._id}/attendance`,
            {
              method: "GET",
              credentials: "include",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );
          if (!res.ok) continue;
          const apiData = await res.json();
          const students = apiData?.data?.attendance?.[0]?.students || [];

          students.forEach((student) => {
            const attDate = student.attendanceMarkedAt
              ? new Date(student.attendanceMarkedAt).toLocaleDateString()
              : "N/A";
            const status = getEventStatus(event, attDate);
            const record = {
              eventName: event.aim || "N/A",
              ngoName: event.createdBy || "N/A",
              eventDate: event.eventDate
                ? new Date(event.eventDate).toLocaleDateString()
                : "N/A",
              attendanceDate: attDate,
              status,
              studentId: student._id?.toString() || student.prn,
              prn: student.prn,
              name: student.name,
              department: student.department || "N/A",
              className: student.className || "N/A",
            };
            // Store under BOTH _id and prn so lookup always succeeds
            const idKey = student._id?.toString();
            const prnKey = student.prn?.toString();
            if (idKey) {
              if (!studentEventMap[idKey]) studentEventMap[idKey] = [];
              studentEventMap[idKey].push(record);
            }
            if (prnKey && prnKey !== idKey) {
              if (!studentEventMap[prnKey]) studentEventMap[prnKey] = [];
              studentEventMap[prnKey].push(record);
            }
          });
        } catch (err) {
          console.warn(`Could not fetch attendance for event ${event._id}:`, err);
        }
      }

      // --- 3. CREATE SHEETS PER CLASS ---
      collegeData.classes.forEach((classData) => {
        if (!classData.students || classData.students.length === 0) return;

        const safeSheetName = (classData.className || "Class")
          .replace(/[\\/?*[\]]/g, " ")
          .substring(0, 30);
        const worksheet = workbook.addWorksheet(safeSheetName);

        // --- A. INSERT IMAGE ---
        if (logoImageId !== null) {
          worksheet.addImage(logoImageId, {
            tl: { col: 0, row: 0 },
            br: { col: 1, row: 4 },
            editAs: "oneCell",
          });
        } else {
          worksheet.getCell("A2").value = "No Logo";
        }

        // --- B. HEADER INFORMATION ---
        worksheet.mergeCells("B2:H2");
        const nameCell = worksheet.getCell("B2");
        nameCell.value = collegeName;
        nameCell.font = { bold: true, size: 18 };
        nameCell.alignment = { vertical: "middle" };

        worksheet.mergeCells("B3:H3");
        const addrCell = worksheet.getCell("B3");
        addrCell.value = collegeAddress;
        addrCell.font = { color: { argb: "FF666666" }, size: 12 };
        addrCell.alignment = { vertical: "top" };

        worksheet.mergeCells("A5:H5");
        const classHeader = worksheet.getCell("A5");
        classHeader.value = `CLASS: ${classData.className}`;
        classHeader.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4472C4" },
        };
        classHeader.font = {
          color: { argb: "FFFFFFFF" },
          bold: true,
          size: 14,
        };
        classHeader.alignment = { horizontal: "center", vertical: "middle" };

        // --- C. TABLE HEADERS ---
        const headerRow = worksheet.getRow(7);
        headerRow.values = [
          "Student Name",
          "PRN",
          "Department",
          "Event Name",
          "NGO Name",
          "Status",
          "Event Date",
          "Attendance Date",
        ];

        headerRow.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF4472C4" },
          };
          cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
        headerRow.height = 25;

        // --- D. DATA ROWS WITH MERGING ---
        let currentRowIndex = 8;
        let blockIndex = 0;

        classData.students.forEach((student) => {
          // Look up by _id first, then by prn (dual-key for reliable matching)
          const idKey = student._id?.toString();
          const prnKey = student.prn?.toString();
          const events = studentEventMap[idKey] || studentEventMap[prnKey] || [];

          const rowCount = events.length > 0 ? events.length : 1;
          const startRow = currentRowIndex;
          const endRow = currentRowIndex + rowCount - 1;
          const isEvenBlock = blockIndex % 2 === 0;
          const bgColor = isEvenBlock ? "FFFFFFFF" : "FFF2F2F2";

          if (events.length > 0) {
            events.forEach((event, idx) => {
              const row = worksheet.getRow(currentRowIndex + idx);
              row.values = [
                student.name || "",
                student.prn || "N/A",
                student.department || event.department || "N/A",
                event.eventName,
                event.ngoName,
                event.status,
                event.eventDate,
                event.attendanceDate,
              ];
            });
          } else {
            const row = worksheet.getRow(currentRowIndex);
            row.values = [
              student.name || "",
              student.prn || "N/A",
              student.department || "",
              "No events registered",
              "-",
              "-",
              "-",
              "-",
            ];
          }

          // --- APPLY MERGING for student identity columns ---
          if (rowCount > 1) {
            worksheet.mergeCells(`A${startRow}:A${endRow}`);
            worksheet.mergeCells(`B${startRow}:B${endRow}`);
            worksheet.mergeCells(`C${startRow}:C${endRow}`);
          }

          // --- APPLY STYLING: background first, then override col 6 (Status) ---
          for (let r = startRow; r <= endRow; r++) {
            const row = worksheet.getRow(r);
            const eventIdx = r - startRow;
            const status = events[eventIdx]?.status;

            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
              if (colNumber === 6 && status && status !== "-") {
                // Status cell: colored badge
                const color =
                  status === "Present"
                    ? "FF10b981"
                    : status === "Absent"
                      ? "FFef4444"
                      : "FFf59e0b";
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
                cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
              } else {
                // All other cells: alternating row background
                cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: bgColor },
                };
              }
              cell.alignment = {
                horizontal: "center",
                vertical: "middle",
                wrapText: true,
              };
              cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
              };
            });
          }

          currentRowIndex += rowCount;
          blockIndex++;
        });

        // Set Column Widths
        worksheet.columns = [
          { width: 25 }, // Name
          { width: 15 }, // PRN
          { width: 20 }, // Dept
          { width: 30 }, // Event
          { width: 22 }, // NGO
          { width: 14 }, // Status
          { width: 15 }, // Event Date
          { width: 18 }, // Attendance Date
        ];
      });

      // --- 4. WRITE & SAVE FILE ---
      const filename = `college_data_${collegeData.name?.replace(
        /\s+/g,
        "_"
      )}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();

      if (RNPlatform.OS === "web") {
        const blob = new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        window.URL.revokeObjectURL(url);
        alert("College data exported successfully!");
      } else {
        const base64 = Buffer.from(buffer).toString("base64");

        if (RNPlatform.OS === "android") {
          await saveFile(filename, base64);
        } else {
          const fileUri = `${RealFileSystem.documentDirectory}${filename}`;
          await RealFileSystem.writeAsStringAsync(fileUri, base64, {
            encoding: RealFileSystem.EncodingType.Base64,
          });
          await RealSharing.shareAsync(fileUri, {
            mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            dialogTitle: "Export College Data",
            UTI: "com.microsoft.excel.xlsx",
          });
        }
      }

      setLoading(false);
    } catch (error) {
      console.error("Export Error:", error);
      setLoading(false);
      alert("Failed to export: " + error.message);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: colors.backgroundColors ? colors.backgroundColors[0] : '#fff' }}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text className="text-base mt-2.5" style={{ color: colors.textPrimary }}>Exporting data...</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={handleOutsideClick}
      className="flex-1"
      style={{
        backgroundColor: colors.backgroundColors
          ? colors.backgroundColors[0]
          : "#F8F9FA",
      }}
    >
      <AppHeaderWithDrawer
        logoUrl={collegeData.logoUrl}
        title={collegeData.name}
        subtitle={collegeData.address}
        fallbackInitial={collegeData.name?.[0] || 'C'}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 20,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 50)
        }}
      >


        {/* Event Attendance section moved to CollegeExport flow */}

        {/* --- 4. CLASS MANAGEMENT --- */}
        <View>
          {/* --- 4. CLASS MANAGEMENT HEADER --- */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text
              style={{ fontSize: 15, fontWeight: '700', color: colors.header }}
            >
              Classes
            </Text>

            {/* AnimatedSearch replaces the full-width bar */}
            <AnimatedSearch
              placeholder="Search classes..."
              value={classSearch}
              onChangeText={setClassSearch}
              colors={colors}
              containerStyle={{ marginBottom: 0 }}
            />
          </View>

          {/* Classes Grid — skeleton while loading */}
          {dataLoading ? (
            <View className="flex-row flex-wrap justify-between">
              {[1, 2, 3, 4].map(i => (
                <View
                  key={i}
                  className="py-4 px-3 rounded-lg border mb-3 w-[48%] items-center"
                  style={{ borderColor: colors.border, backgroundColor: colors.cardBg, opacity: 0.5 }}
                >
                  <View style={{ height: 14, width: 80, borderRadius: 6, backgroundColor: colors.border }} />
                </View>
              ))}
            </View>
          ) : (
            <View className="flex-row flex-wrap justify-between">
              {filteredClasses.length === 0 && classSearch.length > 0 ? (
                <Text style={{ color: colors.textSecondary, fontSize: 13, paddingVertical: 12 }}>
                  No classes match "{classSearch}"
                </Text>
              ) : filteredClasses.map((c) => (
                <TouchableOpacity
                  key={c._id || c.className}
                  className="py-4 px-3 rounded-lg border mb-3 w-[48%]"
                  style={{
                    borderColor: colors.border,
                    backgroundColor: colors.cardBg,
                  }}
                  onPress={() =>
                    navigate("ClassStudents", { college: collegeData, className: c.className })
                  }
                >
                  <Text
                    className="font-medium text-sm text-center"
                    style={{ color: colors.textPrimary }}
                  >
                    {c.className}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* "Add New" Button - Dashed Style */}
              <TouchableOpacity
                className="py-4 px-3 rounded-lg border border-dashed mb-3 w-[48%] justify-center items-center"
                style={{
                  borderColor: colors.accent,
                  backgroundColor: "transparent",
                }}
                onPress={() => navigate("AddClass", { college: collegeData })}
              >
                <Text
                  className="font-bold text-sm"
                  style={{ color: colors.accent }}
                >
                  + Add New Class
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* --- CONSOLIDATED EXPORT ACTION (Moved to bottom) --- */}
          <TouchableOpacity
            className="mt-8 mb-10 py-4 px-4 rounded-xl border flex-row items-center justify-between"
            style={{
              backgroundColor: colors.cardBg,
              borderColor: colors.border,
              borderStyle: 'dashed',
              opacity: 0.9
            }}
            onPress={() => navigate("CollegeExport", { college: collegeData, eventsList, accessToken })}
          >
            <View className="flex-row items-center gap-3">
              <View 
                style={{ 
                  width: 38, height: 38, borderRadius: 10, 
                  backgroundColor: colors.iconBg, 
                  alignItems: 'center', justifyContent: 'center' 
                }}
              >
                <FileText size={20} color={colors.accent} />
              </View>
              <View>
                <Text className="font-bold text-sm" style={{ color: colors.header }}>Export Attendance</Text>
                <Text className="text-[10px]" style={{ color: colors.textSecondary }}>View reports and data exports</Text>
              </View>
            </View>
            <Text className="text-xs" style={{ color: colors.accent, fontWeight: 'bold' }}>OPEN →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </TouchableOpacity>
  );
}