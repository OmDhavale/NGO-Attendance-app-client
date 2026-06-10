import React, { useContext, useEffect, useState, useMemo, createElement } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, TextInput, ActivityIndicator } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NavigationContext } from '../../context/NavigationContext';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { studentEventsAPI } from '../../../apis/api';
import AnimatedSearch from '../../components/AnimatedSearch';
import CollapsibleFilter from '../../components/CollapsibleFilter';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── Date helpers ──────────────────────────────────────────────────────────────
function toDateString(date) {
  if (!date) return null;
  // If it's already a ISO-like date string (YYYY-MM-DD), just return the date part
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
    return date.split('T')[0];
  }
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

export default function StudentEventsScreen({ college, studentId }) {
  const { goBack } = useContext(NavigationContext);
  const insets = useSafeAreaInsets();
  const { darkMode, lightTheme, darkTheme } = useTheme();
  const colors = darkMode ? darkTheme : lightTheme;

  const [allEvents, setAllEvents] = useState([]);
  const [student, setStudent] = useState({ name: 'Student', id: studentId, attendedEvents: [] });
  const [className, setClassName] = useState('');
  const [viewMode, setViewMode] = useState('card');
  const [loading, setLoading] = useState(false);
  const { accessToken } = useContext(AuthContext);

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Mobile Picker Visibility
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState(new Set());

  const toggleExpand = (eventId) => {
    const newSet = new Set(expandedEvents);
    if (newSet.has(eventId)) newSet.delete(eventId);
    else newSet.add(eventId);
    setExpandedEvents(newSet);
  };

  // 1. First define filtered events so other stats can depend on it
  const computedFilteredEvents = useMemo(() => {
    let filtered = allEvents;

    // Text search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ev =>
        ev.eventName?.toLowerCase().includes(query) ||
        ev.eventLocation?.toLowerCase().includes(query) ||
        ev.ngoName?.toLowerCase().includes(query)
      );
    }

    // Date range filter
    if (startDate || endDate) {
      const filterStart = startDate ? new Date(startDate) : null;
      if (filterStart) filterStart.setHours(0, 0, 0, 0);

      const filterEnd = endDate ? new Date(endDate) : null;
      if (filterEnd) filterEnd.setHours(0, 0, 0, 0);

      filtered = filtered.filter(ev => {
        const eventStart = ev.startDate ? new Date(ev.startDate) : ev.rawDate;
        const eventEnd = ev.endDate ? new Date(ev.endDate) : eventStart;

        if (!eventStart) return true;

        const es = new Date(eventStart); es.setHours(0, 0, 0, 0);
        const ee = eventEnd ? new Date(eventEnd) : es; ee.setHours(0, 0, 0, 0);

        if (filterStart && ee < filterStart) return false;
        if (filterEnd && es > filterEnd) return false;
        return true;
      });
    }

    return filtered;
  }, [searchQuery, startDate, endDate, allEvents]);

  const getGrade = (ratio) => {
    if (ratio === null) return { label: 'No Data', color: '#94a3b8', icon: '➖' };
    if (ratio >= 80) return { label: 'Excellent', color: '#10b981', icon: '🌟' };
    if (ratio >= 60) return { label: 'Good', color: '#3b82f6', icon: '✅' };
    if (ratio >= 40) return { label: 'Average', color: '#f59e0b', icon: '⚠️' };
    return { label: 'Poor', color: '#ef4444', icon: '❌' };
  };

  // Helper to determine Present / Absent / Registered status
  const getDailyStatus = (eventObj, attendanceRecords, checkingDate) => {
    const record = attendanceRecords?.find(r => r.attendanceDate === checkingDate);
    if (record) return 'Present';
    return isDatePast(checkingDate) ? 'Absent' : 'Registered';
  };

  // Attendance Stats Calculation (Strictly Day-Based)
  const attendanceStats = useMemo(() => {
     let totalDays = 0;
     let presentDays = 0;
     let absentDays = 0;
     let upcomingDays = 0;

     computedFilteredEvents.forEach(ev => {
         const days = getEventDates(ev.startDate, ev.endDate);
         
         days.forEach(day => {
             totalDays++;
             const wasPresent = ev.attendanceRecords?.some(r => r.attendanceDate === day);
             const isPast = isDatePast(day);

             if (wasPresent) {
                 presentDays++;
             } else if (isPast) {
                 absentDays++;
             } else {
                 upcomingDays++;
             }
         });

         // Legacy Fallback: Only for single-day events without an attendanceDate
         const hasAnyDatedRecord = ev.attendanceRecords?.some(r => !!r.attendanceDate);
         const hasUndatedRecord = ev.attendanceRecords?.some(r => !r.attendanceDate);
         
         if (hasUndatedRecord && !hasAnyDatedRecord && days.length === 1) {
             presentDays++;
             if (isDatePast(days[0])) {
                 absentDays = Math.max(0, absentDays - 1);
             } else {
                 upcomingDays = Math.max(0, upcomingDays - 1);
             }
         }
     });

     const pastDaysCount = presentDays + absentDays;
     const ratio = pastDaysCount > 0 ? (presentDays / pastDaysCount) * 100 : null;
     return { totalDays, presentDays, absentDays, upcomingDays, pastDaysCount, ratio };
  }, [computedFilteredEvents]);

  const grade = getGrade(attendanceStats.ratio);
  const scorePct = Math.round(attendanceStats.ratio || 0);

  const renderBreakdown = (event) => {
    const days = getEventDates(event.startDate, event.endDate);
    return (
      <View style={{ marginTop: 12, padding: 12, backgroundColor: colors.iconBg, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 }}>
          Attendance Breakdown
        </Text>
        {days.map((day, idx) => {
          const record = event.attendanceRecords?.find(r => r.attendanceDate === day);
          const isPast = isDatePast(day);
          const status = record ? "Present" : (isPast ? "Absent" : "Upcoming");
          const color = record ? "#10b981" : (isPast ? "#ef4444" : colors.textSecondary);
          
          return (
            <View key={day} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: idx > 0 ? 1 : 0, borderTopColor: colors.border + '50' }}>
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>{formatDateLabel(day)}</Text>
                {record && (
                  <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 1 }}>
                    🕒 {new Date(record.attendanceMarkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}
              </View>
              <View style={{ backgroundColor: color + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: color + '30' }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: color, textTransform: 'uppercase' }}>{status}</Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  useEffect(() => {
    const fetchStudentAndEvents = async () => {
      setLoading(true);
      try {
        // 1. Get student basic info from college prop
        const foundStudent = college.classes.flatMap(c => c.students).find(s => s._id.toString() === studentId) || { name: 'Student', id: studentId, attendedEvents: [] };
        setStudent(foundStudent);

        const foundClass = college.classes.find(c => c.students.some(s => s._id.toString() === studentId));
        setClassName(foundClass ? foundClass.className : '');

        // 2. Fetch ALL events from API (allows us to see registrations, not just attendance)
        const response = await fetch(studentEventsAPI, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          }
        });

        if (!response.ok) throw new Error("Failed to fetch events");
        const data = await response.json();
        const apiEvents = data?.data?.events || [];

        // 3. Filter events where this student is registered
        // Logic: event.colleges contains collegeId, and that college's students list contains studentId
        const studentRegistrations = apiEvents.filter(ev => {
          return ev.colleges?.some(c =>
            c.collegeId?.toString() === college._id?.toString() &&
            c.students?.some(sId => sId?.toString() === studentId)
          );
        });

        // 4. Map to display objects with status
        const processedEvents = studentRegistrations.map(ev => {
          // Find ALL attendance records for this event
          const myAttendance = foundStudent.attendedEvents?.filter(att => att.eventId?._id?.toString() === ev._id?.toString() || att.eventId?.toString() === ev._id?.toString());
          
          const eventDays = getEventDates(ev.startDate || ev.eventDate, ev.endDate || ev.startDate || ev.eventDate);
          const isAttendedAtAll = myAttendance && myAttendance.length > 0;
          
          // Overall status logic: if any day attended -> 'Present' (simplified label for card view)
          // For multi-day, users can click to see breakdown
          let overallStatus = 'Registered';
          if (isAttendedAtAll) {
              overallStatus = 'Present';
          } else {
              const lastDay = eventDays[eventDays.length - 1];
              if (isDatePast(lastDay)) overallStatus = 'Absent';
          }

          return {
            _id: ev._id,
            eventName: ev.aim || 'General Event',
            ngoName: ev.createdBy?.name || 'N/A',
            eventLocation: ev.location || 'Campus',
            rawDate: ev.startDate ? new Date(ev.startDate) : (ev.eventDate ? new Date(ev.eventDate) : null),
            startDate: ev.startDate || ev.eventDate,
            endDate: ev.endDate || ev.startDate || ev.eventDate,
            startTime: ev.startTime,
            endTime: ev.endTime,
            spocName: ev.spocName,
            spocContact: ev.spocContact,
            eventDate: ev.eventDate ? new Date(ev.eventDate).toDateString() : 'N/A',
            attendanceRecords: myAttendance || [],
            status: overallStatus,
          };
        });

        setAllEvents(processedEvents);
      } catch (err) {
        console.error("Error loading student events:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentAndEvents();
  }, [studentId, accessToken, college]);

  // NO useEffect here — using computedFilteredEvents directly prevents infinite loop


  const clearFilter = () => {
    setStartDate(null);
    setEndDate(null);
    setSearchQuery('');
  };

  const onDateChange = (event, selectedDate, type) => {
    if (type === 'start') {
      setShowStartPicker(Platform.OS === 'ios');
      if (selectedDate) setStartDate(selectedDate);
    } else {
      setShowEndPicker(Platform.OS === 'ios');
      if (selectedDate) setEndDate(selectedDate);
    }
  };

  // --- HYBRID DATE INPUT COMPONENT ---
  const DateInputBox = ({ label, dateValue, setShowPicker, showPicker, onChangeType }) => {

    // 1. WEB VERSION: Uses standard HTML <input type="date">
    if (Platform.OS === 'web') {
      const dateString = dateValue ? dateValue.toISOString().split('T')[0] : '';

      return (
        <View className="flex-1 mr-2">
          <Text className="text-[10px] uppercase font-bold mb-1" style={{ color: colors.textSecondary }}>{label}</Text>
          <View style={{
            borderBottomWidth: 1,
            borderColor: colors.border,
            paddingVertical: 4,
            height: 35,
            justifyContent: 'center'
          }}>
            {/* Using createElement to render a native HTML input in React Native Web */}
            {createElement('input', {
              type: 'date',
              value: dateString,
              onChange: (e) => {
                const newDate = e.target.value ? new Date(e.target.value) : null;
                if (onChangeType === 'start') setStartDate(newDate);
                else setEndDate(newDate);
              },
              style: {
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                color: colors.textPrimary,
                fontSize: '14px',
                fontFamily: 'System',
                width: '100%'
              }
            })}
          </View>
        </View>
      );
    }

    // 2. MOBILE VERSION: Uses TouchableOpacity + Native Modal
    const formattedDate = dateValue ? dateValue.toLocaleDateString() : 'Select Date';
    return (
      <View className="flex-1 mr-2">
        <Text className="text-[10px] uppercase font-bold mb-1" style={{ color: colors.textSecondary }}>{label}</Text>
        <TouchableOpacity
          onPress={() => setShowPicker(true)}
          style={{ borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 8 }}
        >
          <Text style={{ color: dateValue ? colors.textPrimary : '#999' }}>{formattedDate}</Text>
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            value={dateValue || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(e, d) => {
              if (Platform.OS === 'android') setShowPicker(false);
              onDateChange(e, d, onChangeType);
            }}
          />
        )}
      </View>
    );
  };

  // --- RENDERERS ---
  const renderHeader = () => (
    <View className="p-5 rounded-2xl mb-6 border shadow-sm" style={{ backgroundColor: colors.cardBg, borderColor: colors.border, elevation: 2 }}>
      <View className="flex-row items-center mb-4">
        <View className="w-12 h-12 rounded-full items-center justify-center mr-3" style={{ backgroundColor: colors.accent + '20' }}>
          <Ionicons name="person" size={24} color={colors.accent} />
        </View>
        <View className="flex-1">
          <Text className="text-xl font-bold" style={{ color: colors.header }}>{student.name}</Text>
          <Text className="text-sm font-medium" style={{ color: colors.accent }}>{student.prn || "PRN001"}</Text>
        </View>
      </View>
      <View className="h-[1px] w-full mb-4 opacity-20" style={{ backgroundColor: colors.textSecondary }} />
      <View className="flex-row justify-between mb-4">
        <View className="flex-1">
          <Text className="text-[10px] uppercase font-bold mb-1 opacity-60" style={{ color: colors.textSecondary }}>Department</Text>
          <Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>{student.department || "N/A"}</Text>
        </View>
        <View className="flex-1 items-end">
          <Text className="text-[10px] uppercase font-bold mb-1 opacity-60" style={{ color: colors.textSecondary }}>Class Batch</Text>
          <Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>{className || "N/A"}</Text>
        </View>
      </View>

      {/* Score Card */}
      {allEvents.length > 0 && (
        <View style={{ backgroundColor: grade.color + '12', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: grade.color + '40' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', color: colors.textSecondary }}>Attendance Records (Days)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: grade.color + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 }}>
              <Text style={{ fontSize: 11, marginRight: 3 }}>{grade.icon}</Text>
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: grade.color }}>{grade.label}</Text>
            </View>
          </View>

          {/* Quick Summary Row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            <View>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.textPrimary }}>{attendanceStats.totalDays}</Text>
                <Text style={{ fontSize: 8, uppercase: true, fontWeight: 'bold', color: colors.textSecondary, opacity: 0.6 }}>Total</Text>
            </View>
            <View>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#10b981' }}>{attendanceStats.presentDays}</Text>
                <Text style={{ fontSize: 8, uppercase: true, fontWeight: 'bold', color: colors.textSecondary, opacity: 0.6 }}>Attended</Text>
            </View>
            <View>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#ef4444' }}>{attendanceStats.absentDays}</Text>
                <Text style={{ fontSize: 8, uppercase: true, fontWeight: 'bold', color: colors.textSecondary, opacity: 0.6 }}>Absent</Text>
            </View>
            <View>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#f59e0b' }}>{attendanceStats.upcomingDays}</Text>
                <Text style={{ fontSize: 8, uppercase: true, fontWeight: 'bold', color: colors.textSecondary, opacity: 0.6 }}>Upcoming</Text>
            </View>
          </View>
          <View className="flex-row items-baseline mb-2">
            <Text style={{ fontSize: 28, fontWeight: '900', color: grade.color, lineHeight: 32 }}>{scorePct}%</Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary, marginLeft: 6 }}>({attendanceStats.presentDays} attended / {attendanceStats.pastDaysCount} past days)</Text>
          </View>
          {/* Progress bar */}
          <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${scorePct}%`, backgroundColor: grade.color, borderRadius: 3 }} />
          </View>
          <Text style={{ fontSize: 9, color: colors.textSecondary, marginTop: 4, opacity: 0.7 }}>Percentage based on present vs absent states for past days</Text>
        </View>
      )}
    </View>
  );

  const renderFilterSection = () => (
    <CollapsibleFilter colors={colors} title="Filter by Date" containerStyle={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <DateInputBox
          label="From Date"
          dateValue={startDate}
          showPicker={showStartPicker}
          setShowPicker={setShowStartPicker}
          onChangeType="start"
        />
        <DateInputBox
          label="To Date"
          dateValue={endDate}
          showPicker={showEndPicker}
          setShowPicker={setShowEndPicker}
          onChangeType="end"
        />
        {(startDate || endDate) && (
          <TouchableOpacity
            onPress={clearFilter}
            style={{
              alignSelf: 'flex-end',
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border,
              marginBottom: 4,
            }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600' }}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
    </CollapsibleFilter>
  );

  const renderViewToggle = () => (
    <View className="flex-row mb-6 p-1 rounded-xl" style={{ backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border }}>
      <TouchableOpacity onPress={() => setViewMode('card')} className="flex-1 flex-row items-center justify-center py-2 rounded-lg" style={{ backgroundColor: viewMode === 'card' ? colors.accent : 'transparent' }}>
        <Ionicons name="grid" size={16} color={viewMode === 'card' ? '#fff' : colors.textSecondary} />
        <Text className="ml-2 font-bold" style={{ color: viewMode === 'card' ? '#fff' : colors.textSecondary }}>Cards</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setViewMode('table')} className="flex-1 flex-row items-center justify-center py-2 rounded-lg" style={{ backgroundColor: viewMode === 'table' ? colors.accent : 'transparent' }}>
        <Ionicons name="list" size={16} color={viewMode === 'table' ? '#fff' : colors.textSecondary} />
        <Text className="ml-2 font-bold" style={{ color: viewMode === 'table' ? '#fff' : colors.textSecondary }}>Table</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTableHeader = () => (
    <View className="flex-row p-2 rounded-t-lg" style={{ backgroundColor: colors.accent }}>
      <Text className="font-bold text-white text-center text-[9px] px-0.5" style={{ flex: 1.1 }}>Event</Text>
      <Text className="font-bold text-white text-center text-[9px] px-0.5" style={{ flex: 1 }}>Venue</Text>
      <Text className="font-bold text-white text-center text-[9px] px-0.5" style={{ flex: 0.9 }}>NGO</Text>
      <Text className="font-bold text-white text-center text-[9px] px-0.5" style={{ flex: 1 }}>E-Date</Text>
      <Text className="font-bold text-white text-center text-[9px] px-0.5" style={{ flex: 1 }}>Status</Text>
    </View>
  );

  const renderTableRow = (item, index) => {
    const daysList = getEventDates(item.startDate || item.rawDate, item.endDate || item.startDate || item.rawDate);
    const isMultiDay = daysList.length > 1;
    const attendedCount = daysList.filter(d => item.attendanceRecords?.some(r => r.attendanceDate === d)).length;
    
    let statusLabel = item.status;
    let statusColor = item.status === 'Present' ? '#10b981' : (item.status === 'Absent' ? '#ef4444' : '#f59e0b');

    if (isMultiDay) {
        statusLabel = `${attendedCount}/${daysList.length} Days`;
        if (attendedCount === daysList.length) {
            statusColor = '#10b981';
        } else if (attendedCount > 0) {
            statusColor = '#f59e0b';
        } else if (isDatePast(daysList[0])) {
            statusColor = '#ef4444';
        } else {
            statusColor = colors.textSecondary;
        }
    }

    return (
      <View key={index} className="flex-row p-2 border-b border-l border-r" style={{
        backgroundColor: index % 2 === 0 ? colors.cardBg : (colors.backgroundColors?.[1] || '#f9f9f9'),
        borderColor: colors.border,
        alignItems: 'center'
      }}>
        <Text className="text-center text-[9px]" style={{ color: colors.textPrimary, flex: 1.1 }}>{item.eventName}</Text>
        <Text className="text-center text-[9px]" style={{ color: colors.textSecondary, flex: 1 }}>{item.eventLocation}</Text>
        <Text className="text-center text-[9px]" style={{ color: colors.textSecondary, flex: 0.9 }}>{item.ngoName}</Text>
        <Text className="text-center text-[9px]" style={{ color: colors.textSecondary, flex: 1 }}>{item.eventDate}</Text>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#fff', backgroundColor: statusColor, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' }}>
            {statusLabel}
          </Text>
        </View>
      </View>
    );
  };

  const renderEventCard = (item, index) => {
    const daysList = getEventDates(item.startDate, item.endDate);
    const isMultiDay = daysList.length > 1;
    
    // Calculate progress
    const attendedCount = daysList.filter(d => item.attendanceRecords?.some(r => r.attendanceDate === d)).length;
    
    // Status Logic
    let statusLabel = item.status;
    let statusColor = item.status === 'Present' ? '#10b981' : (item.status === 'Absent' ? '#ef4444' : '#f59e0b');

    if (isMultiDay) {
        statusLabel = `${attendedCount}/${daysList.length} Days`;
        if (attendedCount === daysList.length) {
            statusColor = '#10b981'; // Green
        } else if (attendedCount > 0) {
            statusColor = '#f59e0b'; // Orange
        } else if (isDatePast(daysList[0])) {
            statusColor = '#ef4444'; // Red (Started but 0 attendance)
        } else {
            statusColor = colors.textSecondary; // Grey (Upcoming)
        }
    }
    
    const isExpanded = expandedEvents.has(item._id);

    return (
      <TouchableOpacity 
        key={index} 
        activeOpacity={0.9}
        onPress={() => isMultiDay && toggleExpand(item._id)}
        className="mb-4 p-5 rounded-2xl border shadow-sm" 
        style={{ 
          backgroundColor: colors.cardBg, 
          // borderLeftColor: statusColor, 
          borderLeftWidth: 4,
          borderLeftColor: statusColor,
          borderColor: isExpanded ? colors.accent : colors.border, 
          elevation: isExpanded ? 4 : 2 
        }}
      >
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-1 mr-2">
            <Text className="text-lg font-bold" style={{ color: colors.textPrimary }}>{item.eventName}</Text>
            <Text className="text-sm font-medium mt-1" style={{ color: colors.textSecondary }}>{item.eventLocation}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View style={{ backgroundColor: statusColor + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
              <Text style={{ fontSize: 11, fontStyle: 'normal', fontWeight: 'bold', color: statusColor }}>{statusLabel}</Text>
            </View>
            {isMultiDay && (
              <View style={{ backgroundColor: colors.accent + '15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 }}>
                <Text style={{ fontSize: 8, fontWeight: '800', color: colors.accent }}>MULTI-DAY</Text>
              </View>
            )}
          </View>
        </View>

        <View className="h-[1px] w-full my-3 opacity-10" style={{ backgroundColor: colors.textSecondary }} />
        
        <View className="flex-row justify-between items-start">
          {/* Left Column: NGO & Manager Info */}
          <View className="flex-1 pr-3">
            <View className="mb-2">
              <Text className="text-[10px] uppercase font-bold opacity-50" style={{ color: colors.textSecondary }}>Project NGO</Text>
              <Text className="text-xs font-semibold" style={{ color: colors.textSecondary }}>{item.ngoName}</Text>
            </View>

            {item.spocName && (
              <View>
                <Text className="text-[10px] uppercase font-bold opacity-50" style={{ color: colors.textSecondary }}>Manager</Text>
                <Text className="text-xs font-semibold" style={{ color: colors.textSecondary }}>{item.spocName}</Text>
                {item.spocContact && (
                  <Text className="text-[11px] font-bold mt-0.5" style={{ color: colors.accent }}>📞 {item.spocContact}</Text>
                )}
              </View>
            )}
          </View>

          {/* Right Column: Date & Time Badge */}
          <View
            className="items-end px-3 py-2 rounded-xl"
            style={{ backgroundColor: colors.iconBg || colors.accent + '10', minWidth: 105 }}
          >
            <Text className="text-[10px] uppercase font-bold opacity-50 mb-1" style={{ color: colors.textSecondary }}>Schedule</Text>
            <Text className="text-[10px] font-bold text-right" style={{ color: colors.textPrimary }}>
              📅 {new Date(item.startDate || item.rawDate).toLocaleDateString()}{item.endDate && item.endDate !== item.startDate ? ` - ${new Date(item.endDate).toLocaleDateString()}` : ''}
            </Text>
            <Text className="text-[10px] font-semibold opacity-80 mt-1 text-right" style={{ color: colors.textPrimary }}>
              ⏰ Daily: {item.startTime || "N/A"} - {item.endTime || "N/A"}
            </Text>
          </View>
        </View>

        {isMultiDay && (
            <TouchableOpacity 
                onPress={() => toggleExpand(item._id)}
                style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: colors.accent + '08', 
                    paddingVertical: 10, 
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.accent + '20',
                    marginTop: 12
                }}
            >
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.accent, letterSpacing: 1 }}>
                    {isExpanded ? "HIDE DAILY ACTIVITY" : "VIEW DAILY ACTIVITY"}
                </Text>
                <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={12} color={colors.accent} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
        )}

        {isExpanded && isMultiDay && renderBreakdown(item)}
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.backgroundColors ? colors.backgroundColors[0] : '#F8FAFC' }}>
      {/* Fixed Header with Back Button + Search */}
      <View style={{
        paddingHorizontal: 20,
        paddingTop: Math.max(insets.top, 16),
        paddingBottom: 12,
        backgroundColor: colors.cardBg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <TouchableOpacity
          onPress={() => goBack()}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.backgroundColors?.[0] || '#fff',
            marginRight: 12,
          }}
        >
          <Ionicons name="arrow-back" size={16} color={colors.textPrimary} />
          <Text style={{ marginLeft: 6, fontWeight: '600', color: colors.textPrimary, fontSize: 13 }}>Back</Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        {/* Animated Search */}
        <AnimatedSearch
          placeholder="Search events..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          colors={colors}
          containerStyle={{ marginBottom: 0 }}
        />
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 + insets.bottom, paddingTop: 20 }} showsVerticalScrollIndicator={false}>
        {renderHeader()}
        {renderFilterSection()}

        {/* --- ATTENDANCE ANALYTICS REMOVED AS PER USER REQUEST --- */}

        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-lg font-bold" style={{ color: colors.textPrimary }}>Activity History</Text>
          <Text className="text-xs font-medium opacity-60" style={{ color: colors.textSecondary }}>{computedFilteredEvents.length} Events Found</Text>
        </View>
        {renderViewToggle()}

        {loading ? (
          <View className="py-20 items-center">
            <ActivityIndicator size="large" color={colors.accent} />
            <Text className="mt-4 text-xs" style={{ color: colors.textSecondary }}>Loading event history...</Text>
          </View>
        ) : computedFilteredEvents.length === 0 ? (
          <View className="items-center justify-center py-10 opacity-60">
            <Text className="text-lg font-medium" style={{ color: colors.textSecondary }}>No events found for this student.</Text>
          </View>
        ) : (
          <View>
            {viewMode === 'table' ? (
              <View className="w-full">
                {renderTableHeader()}
                {computedFilteredEvents.map((event, index) => renderTableRow(event, index))}
              </View>
            ) : (
              computedFilteredEvents.map((event, index) => renderEventCard(event, index))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}