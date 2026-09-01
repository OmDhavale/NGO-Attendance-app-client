import React, { useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform as RNPlatform,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Pressable,
} from 'react-native';
import {
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileText,
  FolderArchive,
  GraduationCap,
  Layers,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Users,
  X,
  Sparkles,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeaderWithDrawer from '../../components/AppHeaderWithDrawer';
import { NavigationContext } from '../../context/NavigationContext';
import { useTheme } from '../../context/ThemeContext';
import { AuthContext } from '../../context/AuthContext';
import { getAllCollegeAPI } from '../../../apis/api';

// ── Helpers for Academic Year and Class Parsing ──────────────────────────────
function parseAcademicYear(className) {
  if (!className) return 'Uncategorized';
  const match = className.match(/(\d{4})\s*[-–—]\s*(\d{4})/);
  if (match) {
    return `${match[1]}–${match[2]}`;
  }
  const singleYear = className.match(/\b(20\d{2})\b/);
  if (singleYear) {
    const yr = parseInt(singleYear[1], 10);
    return `${yr}–${yr + 1}`;
  }
  return 'Other Academic Years';
}

function parseClassLevel(className) {
  if (!className) return 'General';
  const upper = className.toUpperCase();
  if (upper.includes('BE') || upper.includes('FINAL') || upper.includes('B.Tech') || upper.includes('BTech') || upper.includes('LY') || upper.includes('4TH')) return 'Final Year (BE/B.Tech)';
  if (upper.includes('TE') || upper.includes('TY') || upper.includes('3RD')) return 'Third Year (TE/TY)';
  if (upper.includes('SE') || upper.includes('SY') || upper.includes('2ND')) return 'Second Year (SE/SY)';
  if (upper.includes('FE') || upper.includes('FY') || upper.includes('1ST')) return 'First Year (FE/FY)';
  if (upper.includes('MCA')) return 'MCA';
  if (upper.includes('MBA')) return 'MBA';
  if (upper.includes('BCA')) return 'BCA';
  if (upper.includes('BSC')) return 'B.Sc';
  if (upper.includes('BTECH')) return 'B.Tech';
  if (upper.includes('MTECH')) return 'M.Tech';
  return 'General';
}

function parseClassIdentifier(className, academicYear) {
  if (!className) return '';
  let clean = className;
  if (academicYear && academicYear !== 'Uncategorized' && academicYear !== 'Other Academic Years') {
    const parts = academicYear.split('–');
    if (parts.length === 2) {
      clean = clean.replace(new RegExp(`${parts[0]}\\s*[-–—]\\s*${parts[1]}`, 'gi'), '');
    }
  }
  clean = clean.trim().replace(/^[-–—:\s]+/, '');
  return clean || className;
}

export default function CollegeClassesScreen({ college }) {
  const { navigate } = useContext(NavigationContext);
  const insets = useSafeAreaInsets();
  const { darkMode, lightTheme, darkTheme } = useTheme();
  const { user, accessToken } = useContext(AuthContext);
  const colors = darkMode ? darkTheme : lightTheme;

  // State
  const [collegeData, setCollegeData] = useState(college);
  const [dataLoading, setDataLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [eventsList, setEventsList] = useState([]);

  // Search & Tab State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'archived' | 'all'
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);

  // Accordion expanded state for Academic Years
  const [expandedYears, setExpandedYears] = useState({});

  // Fetch fresh college data from API
  const fetchFreshCollegeData = useCallback(async (isManualRefresh = false) => {
    if (!accessToken || !user?._id) return;
    try {
      if (isManualRefresh) setRefreshing(true);
      else setDataLoading(true);

      const response = await fetch(`${getAllCollegeAPI}/${user._id}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch college data');
      const data = await response.json();
      const colleges = data?.data?.colleges || [];
      const fresh = colleges.find(
        (c) => c._id?.toString() === college._id?.toString() || c._id?.toString() === user._id?.toString()
      );
      if (fresh) setCollegeData(fresh);
    } catch (err) {
      console.warn('Could not refresh college data, using cached:', err);
    } finally {
      setDataLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, user?._id, college._id]);

  useEffect(() => {
    fetchFreshCollegeData();
  }, [fetchFreshCollegeData]);

  // Extract events list for CollegeExport flow
  useEffect(() => {
    const allEvents = new Map();
    collegeData.classes?.forEach((cls) => {
      cls.students?.forEach((student) => {
        student.attendedEvents?.forEach((event) => {
          const eventId = event.eventId?._id;
          if (eventId && !allEvents.has(eventId)) {
            allEvents.set(eventId, {
              _id: eventId,
              aim: event.eventId?.aim || 'Unknown Event',
              createdBy: event.eventId?.createdBy?.name || 'Unknown NGO',
              location: event.eventId?.location || 'N/A',
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

  // Process and Enrich Classes Data
  const rawClasses = useMemo(() => collegeData?.classes || [], [collegeData?.classes]);

  const enrichedClasses = useMemo(() => {
    return rawClasses.map((cls) => {
      const year = parseAcademicYear(cls.className);
      const level = parseClassLevel(cls.className);
      const shortIdentifier = parseClassIdentifier(cls.className, year);
      const studentCount = cls.students?.length || 0;

      const departments = new Set();
      cls.students?.forEach((s) => {
        if (s.department && s.department.trim() && s.department !== 'N/A') {
          departments.add(s.department.trim());
        }
      });
      const deptList = Array.from(departments);
      const primaryDept = deptList.length > 0 ? deptList[0] : null;

      return {
        ...cls,
        academicYear: year,
        level,
        shortIdentifier,
        studentCount,
        departments: deptList,
        primaryDept,
      };
    });
  }, [rawClasses]);

  // Unique Academic Years
  const uniqueAcademicYears = useMemo(() => {
    const set = new Set();
    enrichedClasses.forEach((c) => {
      if (c.academicYear) set.add(c.academicYear);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [enrichedClasses]);

  const currentAcademicYear = useMemo(() => {
    if (uniqueAcademicYears.length === 0) return null;
    return uniqueAcademicYears[0];
  }, [uniqueAcademicYears]);

  // Default expanded state
  useEffect(() => {
    if (currentAcademicYear) {
      setExpandedYears((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        const initial = {};
        uniqueAcademicYears.forEach((yr, idx) => {
          initial[yr] = idx === 0;
        });
        return initial;
      });
    }
  }, [uniqueAcademicYears, currentAcademicYear]);

  const toggleYearExpansion = (year) => {
    setExpandedYears((prev) => ({
      ...prev,
      [year]: !prev[year],
    }));
  };

  const expandAllYears = () => {
    const all = {};
    uniqueAcademicYears.forEach((yr) => {
      all[yr] = true;
    });
    setExpandedYears(all);
  };

  const collapseAllYears = () => {
    const all = {};
    uniqueAcademicYears.forEach((yr) => {
      all[yr] = false;
    });
    setExpandedYears(all);
  };

  // Filter Logic (Search + Tab)
  const filteredClasses = useMemo(() => {
    return enrichedClasses.filter((cls) => {
      // 1. Search Query Match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = cls.className?.toLowerCase().includes(query);
        const matchYear = cls.academicYear?.toLowerCase().includes(query);
        const matchLevel = cls.level?.toLowerCase().includes(query);
        const matchDept = cls.departments?.some((d) => d.toLowerCase().includes(query));
        const matchStudent = cls.students?.some(
          (s) => s.name?.toLowerCase().includes(query) || s.prn?.toLowerCase().includes(query)
        );

        if (!matchName && !matchYear && !matchLevel && !matchDept && !matchStudent) {
          return false;
        }
      }

      // 2. Active vs Archived Tab Filter
      if (activeTab === 'active') {
        if (currentAcademicYear && cls.academicYear !== currentAcademicYear) {
          return false;
        }
      } else if (activeTab === 'archived') {
        if (currentAcademicYear && cls.academicYear === currentAcademicYear) {
          return false;
        }
      }

      return true;
    });
  }, [enrichedClasses, searchQuery, activeTab, currentAcademicYear]);

  // Group Filtered Classes by Academic Year
  const classesByYear = useMemo(() => {
    const map = new Map();

    uniqueAcademicYears.forEach((yr) => {
      map.set(yr, []);
    });

    filteredClasses.forEach((cls) => {
      const yr = cls.academicYear || 'Other Academic Years';
      if (!map.has(yr)) map.set(yr, []);
      map.get(yr).push(cls);
    });

    const result = [];
    map.forEach((items, year) => {
      if (items.length > 0) {
        result.push({
          year,
          isCurrentYear: year === currentAcademicYear,
          classes: items,
          count: items.length,
        });
      }
    });

    return result;
  }, [filteredClasses, uniqueAcademicYears, currentAcademicYear]);

  // Total counts for badges
  const activeCount = useMemo(() => {
    if (!currentAcademicYear) return enrichedClasses.length;
    return enrichedClasses.filter((c) => c.academicYear === currentAcademicYear).length;
  }, [enrichedClasses, currentAcademicYear]);

  const archivedCount = useMemo(() => {
    if (!currentAcademicYear) return 0;
    return enrichedClasses.filter((c) => c.academicYear !== currentAcademicYear).length;
  }, [enrichedClasses, currentAcademicYear]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.backgroundColors ? colors.backgroundColors[0] : '#091828',
      }}
    >
      {/* ── 1. INSTITUTION HEADER ── */}
      <AppHeaderWithDrawer
        logoUrl={collegeData.logoUrl}
        title={collegeData.name}
        subtitle={collegeData.address}
        fallbackInitial={collegeData.name?.[0] || 'C'}
      />

      {/* ── 2. MAIN SCROLL CONTAINER ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom + 90, 110),
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── TOP SECTION: TITLE & GLOBAL ACTIONS ── */}
        <View style={styles.topSectionRow}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.sectionTitle, { color: colors.header }]}>Classes</Text>
              <View style={[styles.totalBadge, { backgroundColor: `${colors.accent}18` }]}>
                <Text style={[styles.totalBadgeText, { color: colors.accent }]}>
                  {enrichedClasses.length} Total
                </Text>
              </View>
            </View>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Organized by academic year
            </Text>
          </View>

          {/* Global Action Icons */}
          <View style={styles.globalActionsRow}>
            {/* Quick Export Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                navigate('CollegeExport', {
                  college: collegeData,
                  eventsList,
                  accessToken,
                })
              }
              style={[
                styles.iconActionButton,
                {
                  backgroundColor: colors.cardBg,
                  borderColor: colors.border,
                },
              ]}
              accessibilityLabel="Export Attendance"
            >
              <FileText size={18} color={colors.accent} />
            </TouchableOpacity>

            {/* Refresh Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => fetchFreshCollegeData(true)}
              style={[
                styles.iconActionButton,
                {
                  backgroundColor: colors.cardBg,
                  borderColor: colors.border,
                },
              ]}
              accessibilityLabel="Refresh Data"
            >
              <RefreshCw
                size={17}
                color={colors.textSecondary}
                style={refreshing ? { transform: [{ rotate: '45deg' }] } : {}}
              />
            </TouchableOpacity>

            {/* Three-dot Overflow Menu Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowOverflowMenu(true)}
              style={[
                styles.iconActionButton,
                {
                  backgroundColor: colors.cardBg,
                  borderColor: colors.border,
                },
              ]}
              accessibilityLabel="More Options"
            >
              <MoreVertical size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 3. ACTIVE / ARCHIVED / ALL SEGMENTED CONTROL ── */}
        <View
          style={[
            styles.segmentedContainer,
            {
              backgroundColor: darkMode ? '#0c2236' : '#eef3f8',
              borderColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setActiveTab('active')}
            style={[
              styles.segmentTab,
              activeTab === 'active' && [
                styles.segmentTabActive,
                {
                  backgroundColor: colors.cardBg,
                  borderColor: colors.accent + '40',
                },
              ],
            ]}
          >
            <Sparkles
              size={13}
              color={activeTab === 'active' ? colors.accent : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.segmentTabText,
                {
                  color: activeTab === 'active' ? colors.header : colors.textSecondary,
                  fontWeight: activeTab === 'active' ? '700' : '500',
                },
              ]}
            >
              Active Classes
            </Text>
            <View
              style={[
                styles.segmentCountPill,
                {
                  backgroundColor: activeTab === 'active' ? `${colors.accent}25` : `${colors.border}40`,
                },
              ]}
            >
              <Text
                style={[
                  styles.segmentCountText,
                  { color: activeTab === 'active' ? colors.accent : colors.textSecondary },
                ]}
              >
                {activeCount}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setActiveTab('archived')}
            style={[
              styles.segmentTab,
              activeTab === 'archived' && [
                styles.segmentTabActive,
                {
                  backgroundColor: colors.cardBg,
                  borderColor: colors.accent + '40',
                },
              ],
            ]}
          >
            <FolderArchive
              size={13}
              color={activeTab === 'archived' ? colors.accent : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.segmentTabText,
                {
                  color: activeTab === 'archived' ? colors.header : colors.textSecondary,
                  fontWeight: activeTab === 'archived' ? '700' : '500',
                },
              ]}
            >
              Archived
            </Text>
            <View
              style={[
                styles.segmentCountPill,
                {
                  backgroundColor: activeTab === 'archived' ? `${colors.accent}25` : `${colors.border}40`,
                },
              ]}
            >
              <Text
                style={[
                  styles.segmentCountText,
                  { color: activeTab === 'archived' ? colors.accent : colors.textSecondary },
                ]}
              >
                {archivedCount}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setActiveTab('all')}
            style={[
              styles.segmentTab,
              activeTab === 'all' && [
                styles.segmentTabActive,
                {
                  backgroundColor: colors.cardBg,
                  borderColor: colors.accent + '40',
                },
              ],
            ]}
          >
            <Layers
              size={13}
              color={activeTab === 'all' ? colors.accent : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.segmentTabText,
                {
                  color: activeTab === 'all' ? colors.header : colors.textSecondary,
                  fontWeight: activeTab === 'all' ? '700' : '500',
                },
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── 4. CLEAN FULL-WIDTH SEARCH BAR ── */}
        <View
          style={[
            styles.searchBarContainer,
            {
              backgroundColor: colors.cardBg,
              borderColor: searchQuery.length > 0 ? colors.accent : colors.border,
            },
          ]}
        >
          <Search size={17} color={searchQuery.length > 0 ? colors.accent : colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search classes (e.g. BE12, FE, CS)..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── EXPAND / COLLAPSE ALL BAR ── */}
        {classesByYear.length > 1 && (
          <View style={styles.expandControlsRow}>
            <Text style={[styles.matchSummaryText, { color: colors.textSecondary }]}>
              {filteredClasses.length} {filteredClasses.length === 1 ? 'class' : 'classes'} in{' '}
              {classesByYear.length} {classesByYear.length === 1 ? 'academic year' : 'academic years'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={expandAllYears} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Text style={[styles.expandToggleLink, { color: colors.accent }]}>Expand All</Text>
              </TouchableOpacity>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>•</Text>
              <TouchableOpacity onPress={collapseAllYears} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Text style={[styles.expandToggleLink, { color: colors.textSecondary }]}>Collapse All</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── 5. ACADEMIC YEAR SECTIONS & CLASS LIST ── */}
        {dataLoading ? (
          /* Skeleton Loader */
          <View style={{ marginTop: 12 }}>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.skeletonCard,
                  {
                    backgroundColor: colors.cardBg,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={[styles.skeletonLine, { width: 140, backgroundColor: colors.border }]} />
                <View style={[styles.skeletonLine, { width: 80, backgroundColor: colors.border, marginTop: 8 }]} />
              </View>
            ))}
          </View>
        ) : classesByYear.length === 0 ? (
          /* Empty State */
          <View
            style={[
              styles.emptyStateContainer,
              {
                backgroundColor: colors.cardBg,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.emptyStateIconContainer,
                { backgroundColor: `${colors.accent}15` },
              ]}
            >
              <BookOpen size={30} color={colors.accent} />
            </View>
            <Text style={[styles.emptyStateTitle, { color: colors.header }]}>
              {searchQuery ? 'No Matching Classes' : 'No Classes Found'}
            </Text>
            <Text style={[styles.emptyStateSubtitle, { color: colors.textSecondary }]}>
              {searchQuery
                ? `No classes found matching "${searchQuery}".`
                : 'Get started by creating your first academic class.'}
            </Text>
            {searchQuery ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSearchQuery('')}
                style={[styles.emptyStateActionButton, { backgroundColor: colors.accent }]}
              >
                <Text style={styles.emptyStateActionText}>Clear Search</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigate('AddClass', { college: collegeData })}
                style={[styles.emptyStateActionButton, { backgroundColor: colors.accent }]}
              >
                <Plus size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.emptyStateActionText}>Add First Class</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          /* List of Academic Year Accordion Cards */
          <View style={{ marginTop: 4 }}>
            {classesByYear.map((yearGroup) => {
              const isExpanded = !!expandedYears[yearGroup.year];

              return (
                <View key={yearGroup.year} style={styles.yearSectionContainer}>
                  {/* Academic Year Accordion Header */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => toggleYearExpansion(yearGroup.year)}
                    style={[
                      styles.yearHeaderCard,
                      {
                        backgroundColor: colors.cardBg,
                        borderColor: yearGroup.isCurrentYear ? colors.accent + '70' : colors.border,
                        borderLeftColor: yearGroup.isCurrentYear ? colors.accent : colors.border,
                        borderLeftWidth: yearGroup.isCurrentYear ? 3.5 : 1,
                      },
                    ]}
                  >
                    <View style={styles.yearHeaderLeft}>
                      <View
                        style={[
                          styles.yearIconContainer,
                          {
                            backgroundColor: yearGroup.isCurrentYear
                              ? `${colors.accent}20`
                              : `${colors.border}35`,
                          },
                        ]}
                      >
                        <Calendar
                          size={15}
                          color={yearGroup.isCurrentYear ? colors.accent : colors.textSecondary}
                        />
                      </View>
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.yearHeaderText, { color: colors.textPrimary }]}>
                            {yearGroup.year}
                          </Text>
                          {yearGroup.isCurrentYear && (
                            <View
                              style={[
                                styles.currentYearTag,
                                { backgroundColor: `${colors.accent}25` },
                              ]}
                            >
                              <Text style={[styles.currentYearTagText, { color: colors.accent }]}>
                                CURRENT YEAR
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.yearSubtext, { color: colors.textSecondary }]}>
                          Academic Session
                        </Text>
                      </View>
                    </View>

                    <View style={styles.yearHeaderRight}>
                      <View
                        style={[
                          styles.classCountBadge,
                          {
                            backgroundColor: darkMode ? '#0e263c' : '#eaf2f9',
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <Text style={[styles.classCountBadgeText, { color: colors.textPrimary }]}>
                          {yearGroup.count} {yearGroup.count === 1 ? 'Class' : 'Classes'}
                        </Text>
                      </View>
                      {isExpanded ? (
                        <ChevronUp size={18} color={colors.accent} />
                      ) : (
                        <ChevronDown size={18} color={colors.textSecondary} />
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Expanded Classes Single-Column List */}
                  {isExpanded && (
                    <View style={styles.classListContainer}>
                      {yearGroup.classes.map((cls) => (
                        <TouchableOpacity
                          key={cls._id || cls.className}
                          activeOpacity={0.7}
                          onPress={() =>
                            navigate('ClassStudents', {
                              college: collegeData,
                              className: cls.className,
                            })
                          }
                          style={[
                            styles.classCard,
                            {
                              backgroundColor: darkMode ? '#18334c' : '#ffffff',
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <View style={styles.classCardContent}>
                            {/* Class Icon Pill */}
                            <View
                              style={[
                                styles.classIconContainer,
                                { backgroundColor: `${colors.accent}15` },
                              ]}
                            >
                              <GraduationCap size={18} color={colors.accent} />
                            </View>

                            {/* Class Details Column */}
                            <View style={styles.classDetailsColumn}>
                              <View style={styles.classTitleRow}>
                                <Text
                                  style={[styles.classNameText, { color: colors.textPrimary }]}
                                  numberOfLines={1}
                                >
                                  {cls.className}
                                </Text>
                              </View>

                              {/* Secondary Metadata Chips */}
                              <View style={styles.metadataChipsRow}>
                                <View
                                  style={[
                                    styles.metadataPill,
                                    {
                                      backgroundColor: darkMode ? '#0e2438' : '#eef4fa',
                                      borderColor: colors.border,
                                    },
                                  ]}
                                >
                                  <Users size={11} color={colors.textSecondary} style={{ marginRight: 4 }} />
                                  <Text style={[styles.metadataPillText, { color: colors.textSecondary }]}>
                                    {cls.studentCount} {cls.studentCount === 1 ? 'Student' : 'Students'}
                                  </Text>
                                </View>

                                {cls.level !== 'General' && (
                                  <View
                                    style={[
                                      styles.metadataPill,
                                      {
                                        backgroundColor: `${colors.accent}15`,
                                        borderColor: `${colors.accent}30`,
                                      },
                                    ]}
                                  >
                                    <Text style={[styles.metadataPillText, { color: colors.accent }]}>
                                      {cls.level}
                                    </Text>
                                  </View>
                                )}

                                {cls.primaryDept && (
                                  <View
                                    style={[
                                      styles.metadataPill,
                                      {
                                        backgroundColor: darkMode ? '#0e2438' : '#eef4fa',
                                        borderColor: colors.border,
                                      },
                                    ]}
                                  >
                                    <Text
                                      style={[styles.metadataPillText, { color: colors.textSecondary }]}
                                      numberOfLines={1}
                                    >
                                      {cls.primaryDept}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>

                            {/* Right Arrow Indicator */}
                            <View style={styles.chevronWrapper}>
                              <ChevronRight size={16} color={colors.textSecondary} />
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── 6. FIXED FLOATING ACTION BUTTON (FAB) ── */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigate('AddClass', { college: collegeData })}
        style={[
          styles.floatingAddButton,
          {
            backgroundColor: colors.accent,
            bottom: Math.max(insets.bottom + 16, 24),
          },
        ]}
        accessibilityLabel="Add New Class"
      >
        <Plus size={18} color="#ffffff" strokeWidth={2.5} style={{ marginRight: 6 }} />
        <Text style={styles.floatingAddButtonText}>Add Class</Text>
      </TouchableOpacity>

      {/* ── 7. OVERFLOW MODAL MENU ── */}
      <Modal
        visible={showOverflowMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOverflowMenu(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowOverflowMenu(false)}>
          <View
            style={[
              styles.overflowMenuCard,
              {
                backgroundColor: colors.cardBg,
                borderColor: colors.border,
                top: Math.max(insets.top + 70, 80),
              },
            ]}
          >
            <TouchableOpacity
              style={styles.overflowMenuItem}
              onPress={() => {
                setShowOverflowMenu(false);
                navigate('CollegeExport', {
                  college: collegeData,
                  eventsList,
                  accessToken,
                });
              }}
            >
              <FileText size={18} color={colors.accent} style={{ marginRight: 12 }} />
              <View>
                <Text style={[styles.overflowMenuText, { color: colors.textPrimary }]}>
                  Export Attendance
                </Text>
                <Text style={[styles.overflowMenuSubtext, { color: colors.textSecondary }]}>
                  Download Excel reports & logs
                </Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={styles.overflowMenuItem}
              onPress={() => {
                setShowOverflowMenu(false);
                setActiveTab('archived');
              }}
            >
              <FolderArchive size={18} color={colors.textSecondary} style={{ marginRight: 12 }} />
              <View>
                <Text style={[styles.overflowMenuText, { color: colors.textPrimary }]}>
                  View Archived Classes
                </Text>
                <Text style={[styles.overflowMenuSubtext, { color: colors.textSecondary }]}>
                  Inspect past academic years
                </Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={styles.overflowMenuItem}
              onPress={() => {
                setShowOverflowMenu(false);
                fetchFreshCollegeData(true);
              }}
            >
              <RefreshCw size={18} color={colors.textSecondary} style={{ marginRight: 12 }} />
              <View>
                <Text style={[styles.overflowMenuText, { color: colors.textPrimary }]}>
                  Refresh Classes
                </Text>
                <Text style={[styles.overflowMenuSubtext, { color: colors.textSecondary }]}>
                  Sync latest roster with server
                </Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={styles.overflowMenuItem}
              onPress={() => {
                setShowOverflowMenu(false);
                navigate('AddClass', { college: collegeData });
              }}
            >
              <Plus size={18} color={colors.accent} style={{ marginRight: 12 }} />
              <View>
                <Text style={[styles.overflowMenuText, { color: colors.accent, fontWeight: '700' }]}>
                  Create New Class
                </Text>
                <Text style={[styles.overflowMenuSubtext, { color: colors.textSecondary }]}>
                  Add class division or batch
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── Stylesheet ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  topSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  totalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  totalBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  globalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconActionButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Segmented Control
  segmentedContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    marginBottom: 12,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
  },
  segmentTabActive: {
    borderWidth: 1,
    ...RNPlatform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  segmentTabText: {
    fontSize: 12,
  },
  segmentCountPill: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  segmentCountText: {
    fontSize: 10,
    fontWeight: '700',
  },
  // Full-width Search Bar
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
    padding: 0,
  },
  // Expand controls
  expandControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  matchSummaryText: {
    fontSize: 11,
    flex: 1,
  },
  expandToggleLink: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Year Sections
  yearSectionContainer: {
    marginBottom: 12,
  },
  yearHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    ...RNPlatform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  yearHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  yearIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearHeaderText: {
    fontSize: 15,
    fontWeight: '700',
  },
  yearSubtext: {
    fontSize: 11,
    marginTop: 1,
  },
  currentYearTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  currentYearTagText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  yearHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  classCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  classCountBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Class List
  classListContainer: {
    paddingTop: 8,
    paddingLeft: 6,
    gap: 8,
  },
  classCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  classCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  classIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classDetailsColumn: {
    flex: 1,
  },
  classTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  classNameText: {
    fontSize: 14,
    fontWeight: '700',
  },
  metadataChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  metadataPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  metadataPillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  chevronWrapper: {
    paddingLeft: 4,
  },
  // Floating Action Button
  floatingAddButton: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 28,
    zIndex: 999,
    ...RNPlatform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  floatingAddButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  // Skeletons
  skeletonCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    opacity: 0.6,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 6,
  },
  // Empty State
  emptyStateContainer: {
    padding: 28,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyStateIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyStateSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  emptyStateActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyStateActionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  // Overflow Modal Menu
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingRight: 16,
  },
  overflowMenuCard: {
    width: 240,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 6,
    ...RNPlatform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  overflowMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  overflowMenuText: {
    fontSize: 13,
    fontWeight: '600',
  },
  overflowMenuSubtext: {
    fontSize: 10,
    marginTop: 1,
  },
  menuDivider: {
    height: 1,
    marginHorizontal: 12,
    marginVertical: 2,
    opacity: 0.5,
  },
});