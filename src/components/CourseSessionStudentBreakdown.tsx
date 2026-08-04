import React, { useState, useMemo } from 'react';
import { 
  Users, 
  GraduationCap, 
  CalendarRange, 
  Table, 
  BarChart3, 
  Download, 
  Layers, 
  Search, 
  FileSpreadsheet,
  Sparkles,
  ChevronRight,
  TrendingUp,
  PieChart as PieIcon,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell,
  PieChart,
  Pie
} from 'recharts';

interface StudentData {
  id?: number | string;
  name?: string;
  roll_no?: string;
  branch_name?: string;
  session_name?: string;
  plan_name?: string;
  semester_name?: string;
  total_paid?: number;
  plan_total?: number;
  [key: string]: any;
}

interface CourseSessionStudentBreakdownProps {
  students: StudentData[];
  title?: string;
  subtitle?: string;
  className?: string;
}

export default function CourseSessionStudentBreakdown({
  students = [],
  title = "Program-wise & Session-wise Active Students Breakdown",
  subtitle = "Distribution of total active enrolled students across academic programs, courses, and sessions",
  className = ""
}: CourseSessionStudentBreakdownProps) {
  const [activeTab, setActiveTab] = useState<'matrix' | 'course' | 'session'>('matrix');
  const [searchQuery, setSearchQuery] = useState('');

  const cleanVal = (val: any) => {
    if (!val) return '';
    return val.toString().replace(/^\[Auto\]\s*/, '').trim();
  };

  // Process data for program/course-wise, session-wise, and matrix calculations
  const breakdownData = useMemo(() => {
    const totalStudents = students.length;

    const courseMap: Record<string, { count: number; totalPaid: number; studentsList: StudentData[] }> = {};
    const sessionMap: Record<string, { count: number; studentsList: StudentData[] }> = {};
    const matrixMap: Record<string, Record<string, number>> = {};

    const coursesSet = new Set<string>();
    const sessionsSet = new Set<string>();

    students.forEach((s) => {
      const course = cleanVal(s.branch_name) || cleanVal(s.course) || cleanVal(s.plan_name) || 'General Program';
      const session = cleanVal(s.session_name) || cleanVal(s.academic_term) || 'Unassigned Session';

      coursesSet.add(course);
      sessionsSet.add(session);

      // Program / Course Aggregation
      if (!courseMap[course]) {
        courseMap[course] = { count: 0, totalPaid: 0, studentsList: [] };
      }
      courseMap[course].count += 1;
      courseMap[course].totalPaid += Number(s.total_paid || 0);
      courseMap[course].studentsList.push(s);

      // Session Aggregation
      if (!sessionMap[session]) {
        sessionMap[session] = { count: 0, studentsList: [] };
      }
      sessionMap[session].count += 1;
      sessionMap[session].studentsList.push(s);

      // Matrix Mapping
      if (!matrixMap[course]) {
        matrixMap[course] = {};
      }
      matrixMap[course][session] = (matrixMap[course][session] || 0) + 1;
    });

    const coursesList = Array.from(coursesSet).sort();
    const sessionsList = Array.from(sessionsSet).sort();

    // Program wise list
    const courseWise = coursesList.map(course => ({
      course,
      studentCount: courseMap[course]?.count || 0,
      totalPaid: courseMap[course]?.totalPaid || 0,
      percentage: totalStudents > 0 ? Math.round(((courseMap[course]?.count || 0) / totalStudents) * 100) : 0
    })).sort((a, b) => b.studentCount - a.studentCount);

    // Session wise list
    const sessionWise = sessionsList.map(session => ({
      session,
      studentCount: sessionMap[session]?.count || 0,
      percentage: totalStudents > 0 ? Math.round(((sessionMap[session]?.count || 0) / totalStudents) * 100) : 0
    })).sort((a, b) => b.studentCount - a.studentCount);

    return {
      totalStudents,
      coursesList,
      sessionsList,
      courseWise,
      sessionWise,
      matrixMap,
      courseMap,
      sessionMap
    };
  }, [students]);

  // Filtered lists of course and session names with cross-dimensional matching
  const { filteredCoursesList, filteredSessionsList } = useMemo(() => {
    if (!searchQuery.trim()) {
      return {
        filteredCoursesList: breakdownData.coursesList,
        filteredSessionsList: breakdownData.sessionsList
      };
    }

    const q = searchQuery.toLowerCase().trim();

    let courses = breakdownData.coursesList.filter(course => {
      if (course.toLowerCase().includes(q)) return true;
      const studentsInCourse = breakdownData.courseMap[course]?.studentsList || [];
      return studentsInCourse.some(s => 
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.roll_no && s.roll_no.toString().toLowerCase().includes(q)) ||
        (s.session_name && s.session_name.toLowerCase().includes(q)) ||
        (s.academic_term && s.academic_term.toLowerCase().includes(q))
      );
    });

    let sessions = breakdownData.sessionsList.filter(session => {
      if (session.toLowerCase().includes(q)) return true;
      const studentsInSession = breakdownData.sessionMap[session]?.studentsList || [];
      return studentsInSession.some(s => 
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.roll_no && s.roll_no.toString().toLowerCase().includes(q)) ||
        (s.branch_name && s.branch_name.toLowerCase().includes(q)) ||
        (s.course && s.course.toLowerCase().includes(q)) ||
        (s.plan_name && s.plan_name.toLowerCase().includes(q))
      );
    });

    // Cross-link: If query matched specific sessions (e.g., "2024-25"), ensure programs active in those sessions are included
    if (sessions.length > 0 && courses.length === 0) {
      courses = breakdownData.coursesList.filter(course => 
        sessions.some(sess => (breakdownData.matrixMap[course]?.[sess] || 0) > 0)
      );
    }

    // Cross-link: If query matched specific programs (e.g., "B.Tech"), ensure sessions active in those programs are included
    if (courses.length > 0 && sessions.length === 0) {
      sessions = breakdownData.sessionsList.filter(session => 
        courses.some(crs => (breakdownData.matrixMap[crs]?.[session] || 0) > 0)
      );
    }

    return {
      filteredCoursesList: courses,
      filteredSessionsList: sessions
    };
  }, [breakdownData, searchQuery]);

  // Filtered program cards and session cards based on search query
  const filteredCourses = useMemo(() => {
    return breakdownData.courseWise.filter(c => filteredCoursesList.includes(c.course));
  }, [breakdownData.courseWise, filteredCoursesList]);

  const filteredSessions = useMemo(() => {
    return breakdownData.sessionWise.filter(s => filteredSessionsList.includes(s.session));
  }, [breakdownData.sessionWise, filteredSessionsList]);

  // Export Matrix to Excel (respects current filter)
  const exportMatrixExcel = () => {
    const excelRows: any[] = [];
    const activeCourses = filteredCoursesList.length > 0 ? filteredCoursesList : breakdownData.coursesList;
    const activeSessions = filteredSessionsList.length > 0 ? filteredSessionsList : breakdownData.sessionsList;

    activeCourses.forEach(course => {
      const row: Record<string, any> = { 'Program / Course': course };
      let rowTotal = 0;
      activeSessions.forEach(session => {
        const count = breakdownData.matrixMap[course]?.[session] || 0;
        row[session] = count;
        rowTotal += count;
      });
      row['Total Active Students'] = rowTotal;
      excelRows.push(row);
    });

    // Column Totals Row
    const totalRow: Record<string, any> = { 'Program / Course': 'TOTAL ACTIVE STUDENTS' };
    let grandTotal = 0;
    activeSessions.forEach(session => {
      let colTotal = 0;
      activeCourses.forEach(course => {
        colTotal += breakdownData.matrixMap[course]?.[session] || 0;
      });
      totalRow[session] = colTotal;
      grandTotal += colTotal;
    });
    totalRow['Total Active Students'] = grandTotal;
    excelRows.push(totalRow);

    const ws = XLSX.utils.json_to_sheet(excelRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Program_Session_Breakdown');
    XLSX.writeFile(wb, `Program_Session_Active_Students_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const BAR_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#6366F1'];

  return (
    <div className={cn("bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6", className)}>
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <GraduationCap size={20} />
            </span>
            <h3 className="font-bold text-slate-900 text-lg">{title}</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        </div>

        {/* Action Controls & View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Filter */}
          <div className="relative min-w-[180px]">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <input 
              type="text"
              placeholder="Filter program / session..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                title="Clear filter"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Export Button */}
          <button
            onClick={exportMatrixExcel}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            title="Export Program & Session Active Student Counts to Excel"
          >
            <FileSpreadsheet size={14} />
            <span>Export Excel</span>
          </button>

          {/* Tab Controls */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('matrix')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
                activeTab === 'matrix'
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Table size={13} />
              <span>Matrix View</span>
            </button>
            <button
              onClick={() => setActiveTab('course')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
                activeTab === 'course'
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <GraduationCap size={13} />
              <span>Program-wise ({filteredCourses.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('session')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
                activeTab === 'session'
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <CalendarRange size={13} />
              <span>Session-wise ({filteredSessions.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-200">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">Total Active Students</p>
            <p className="text-xl font-bold text-slate-900">{breakdownData.totalStudents}</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-200">
            <GraduationCap size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">Programs / Courses</p>
            <p className="text-xl font-bold text-slate-900">
              {filteredCoursesList.length} {searchQuery ? <span className="text-xs font-normal text-slate-500">(of {breakdownData.coursesList.length})</span> : null}
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center font-bold shadow-md shadow-violet-200">
            <CalendarRange size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-violet-900 uppercase tracking-wider">Academic Sessions</p>
            <p className="text-xl font-bold text-slate-900">
              {filteredSessionsList.length} {searchQuery ? <span className="text-xs font-normal text-slate-500">(of {breakdownData.sessionsList.length})</span> : null}
            </p>
          </div>
        </div>
      </div>

      {/* VIEW 1: MATRIX VIEW (Cross-tabulation Program x Session) */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          {filteredCoursesList.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6">
              <Search className="mx-auto text-slate-300 mb-2" size={28} />
              <p className="text-sm font-bold text-slate-700">No matching programs or sessions found</p>
              <p className="text-xs text-slate-400 mt-1">No results matching "{searchQuery}". Try a different filter keyword.</p>
              <button 
                onClick={() => setSearchQuery('')}
                className="mt-3 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold transition-all"
              >
                Clear Search Filter
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-900 text-white text-xs">
                    <th className="py-3 px-4 font-bold border-r border-slate-800">Program / Course</th>
                    {filteredSessionsList.map(session => (
                      <th key={session} className="py-3 px-4 font-bold text-center border-r border-slate-800 bg-slate-800/80">
                        Session {session}
                      </th>
                    ))}
                    <th className="py-3 px-4 font-bold text-right bg-indigo-900/80">Active Students</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredCoursesList.map((course, idx) => {
                    let rowStudentCount = 0;
                    return (
                      <tr key={course} className={cn("hover:bg-indigo-50/40 transition-colors", idx % 2 === 0 ? "bg-white" : "bg-slate-50/50")}>
                        <td className="py-3 px-4 font-bold text-slate-900 border-r border-slate-100 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block shrink-0" />
                          <span>{course}</span>
                        </td>
                        {filteredSessionsList.map(session => {
                          const count = breakdownData.matrixMap[course]?.[session] || 0;
                          rowStudentCount += count;
                          return (
                            <td key={session} className="py-3 px-4 text-center font-semibold border-r border-slate-100">
                              {count > 0 ? (
                                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-100">
                                  {count}
                                </span>
                              ) : (
                                <span className="text-slate-300 font-normal">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-3 px-4 text-right font-extrabold text-indigo-900 bg-indigo-50/30">
                          {rowStudentCount}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Column Totals Footer */}
                  <tr className="bg-slate-900 text-white font-bold text-xs">
                    <td className="py-3 px-4 border-r border-slate-800 uppercase tracking-wider">
                      TOTAL ACTIVE STUDENTS
                    </td>
                    {filteredSessionsList.map(session => {
                      let colTotal = 0;
                      filteredCoursesList.forEach(course => {
                        colTotal += breakdownData.matrixMap[course]?.[session] || 0;
                      });
                      return (
                        <td key={session} className="py-3 px-4 text-center font-extrabold text-emerald-400 border-r border-slate-800">
                          {colTotal}
                        </td>
                      );
                    })}
                    <td className="py-3 px-4 text-right font-black text-amber-400 bg-slate-950">
                      {filteredCoursesList.reduce((acc, course) => {
                        return acc + filteredSessionsList.reduce((sAcc, session) => sAcc + (breakdownData.matrixMap[course]?.[session] || 0), 0);
                      }, 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[11px] text-slate-400 text-right">
            * Complete breakdown matrix mapping each active student to their academic program and session.
          </p>
        </div>
      )}

      {/* VIEW 2: PROGRAM-WISE VIEW */}
      {activeTab === 'course' && (
        <div className="space-y-6">
          {filteredCourses.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6">
              <Search className="mx-auto text-slate-300 mb-2" size={28} />
              <p className="text-sm font-bold text-slate-700">No matching programs found</p>
              <p className="text-xs text-slate-400 mt-1">No program or course matches "{searchQuery}".</p>
              <button 
                onClick={() => setSearchQuery('')}
                className="mt-3 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold transition-all"
              >
                Clear Search Filter
              </button>
            </div>
          ) : (
            <>
              {/* Program Chart */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                  <BarChart3 size={15} className="text-indigo-600" />
                  No. of Active Students by Program / Course
                </h4>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredCourses} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis 
                        dataKey="course" 
                        tick={{ fontSize: 10, fill: '#475569' }} 
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                      />
                      <YAxis tick={{ fontSize: 10, fill: '#475569' }} allowDecimals={false} />
                      <Tooltip 
                        formatter={(val: any) => [`${val} Active Students`, 'Count']}
                        contentStyle={{ backgroundColor: '#0F172A', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                      />
                      <Bar dataKey="studentCount" radius={[6, 6, 0, 0]}>
                        {filteredCourses.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Program Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCourses.map((item, idx) => (
                  <div 
                    key={item.course}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {item.course.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">{item.course}</h4>
                          <p className="text-[11px] text-slate-400 font-medium">Academic Program / Course</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full border border-indigo-100">
                        {item.percentage}% Share
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">No. of Active Students</span>
                        <span className="font-extrabold text-slate-900 text-sm">{item.studentCount} Active</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.max(item.percentage, 5)}%` }}
                        />
                      </div>
                    </div>

                    {item.totalPaid > 0 && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span>Total Paid Collections</span>
                        <span className="font-bold text-emerald-600">₹{item.totalPaid.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* VIEW 3: SESSION-WISE VIEW */}
      {activeTab === 'session' && (
        <div className="space-y-6">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6">
              <Search className="mx-auto text-slate-300 mb-2" size={28} />
              <p className="text-sm font-bold text-slate-700">No matching academic sessions found</p>
              <p className="text-xs text-slate-400 mt-1">No session matches "{searchQuery}".</p>
              <button 
                onClick={() => setSearchQuery('')}
                className="mt-3 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold transition-all"
              >
                Clear Search Filter
              </button>
            </div>
          ) : (
            <>
              {/* Session Chart */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                  <CalendarRange size={15} className="text-violet-600" />
                  No. of Active Students by Session
                </h4>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredSessions} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="session" tick={{ fontSize: 11, fill: '#475569' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#475569' }} allowDecimals={false} />
                      <Tooltip 
                        formatter={(val: any) => [`${val} Active Students`, 'Count']}
                        contentStyle={{ backgroundColor: '#0F172A', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                      />
                      <Bar dataKey="studentCount" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Session Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSessions.map((item) => (
                  <div 
                    key={item.session}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-violet-200 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-violet-100 text-violet-700 font-bold size-14 flex items-center justify-center shrink-0">
                          <CalendarRange size={18} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">Session {item.session}</h4>
                          <p className="text-[11px] text-slate-400 font-medium">Academic Session</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-violet-50 text-violet-700 font-bold text-xs rounded-full border border-violet-100">
                        {item.percentage}% Share
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">No. of Active Students</span>
                        <span className="font-extrabold text-slate-900 text-sm">{item.studentCount} Active</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-violet-600 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.max(item.percentage, 5)}%` }}
                        />
                      </div>
                    </div>

                    {/* Programs in this session */}
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-[11px] font-bold text-slate-500 mb-1.5">Programs in Session:</p>
                      <div className="flex flex-wrap gap-1">
                        {breakdownData.coursesList.map(course => {
                          const count = breakdownData.matrixMap[course]?.[item.session] || 0;
                          if (count === 0) return null;
                          return (
                            <span key={course} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold">
                              {course}: <strong>{count}</strong>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
