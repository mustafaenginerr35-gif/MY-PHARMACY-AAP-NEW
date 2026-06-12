import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Calendar, 
  Clock, 
  DollarSign, 
  Search, 
  MoreVertical, 
  Trash2, 
  Edit, 
  ChevronRight, 
  FileText,
  Filter,
  BarChart3,
  Smartphone,
  Laptop
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { safeFormatDate, toValidDate } from '../lib/formatters';
import { ar } from 'date-fns/locale';
import { EmployeeForm } from './EmployeeForm';
import { AttendanceForm } from './AttendanceForm';
import type { Employee, EmployeeAttendance } from '../db';
import { motion, AnimatePresence } from 'framer-motion';

interface EmployeesPageProps {
  employees: Employee[];
  attendance: EmployeeAttendance[];
  appMode: 'laptop' | 'mobile';
  onAddEmployee: (data: Partial<Employee>) => void;
  onUpdateEmployee: (id: string, data: Partial<Employee>) => void;
  onDeleteEmployee: (id: string) => void;
  onAddAttendance: (data: Partial<EmployeeAttendance>) => void;
  onUpdateAttendance: (id: string, data: Partial<EmployeeAttendance>) => void;
  onDeleteAttendance: (id: string) => void;
}

export const EmployeesPage = ({
  employees,
  attendance,
  appMode,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onAddAttendance,
  onUpdateAttendance,
  onDeleteAttendance
}: EmployeesPageProps) => {
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'attendance' | 'summary'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(safeFormatDate(new Date(), 'yyyy-MM'));
  
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isAddAttendanceOpen, setIsAddAttendanceOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<EmployeeAttendance | null>(null);

  // Filters
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => 
      emp.name.includes(searchTerm) || 
      emp.jobTitle.includes(searchTerm) || 
      emp.phone.includes(searchTerm)
    );
  }, [employees, searchTerm]);

  const filteredAttendance = useMemo(() => {
    return attendance.filter(record => {
      const matchesEmployee = selectedEmployeeId === 'all' || record.employeeId === selectedEmployeeId;
      const recordMonth = record.month && record.year 
        ? `${record.year}-${record.month.toString().padStart(2, '0')}`
        : safeFormatDate(record.date, 'yyyy-MM');
      const matchesMonth = recordMonth === selectedMonth;
      return matchesEmployee && matchesMonth;
    }).sort((a, b) => toValidDate(b.date).getTime() - toValidDate(a.date).getTime());
  }, [attendance, selectedEmployeeId, selectedMonth]);

  // Summaries
  const monthlySummaries = useMemo(() => {
    const summaryMap = new Map<string, {
      id: string;
      name: string;
      jobTitle: string;
      totalHours: number;
      daysAttended: number;
      totalSalary: number;
      hourlyRate: number;
    }>();

    // Initialize with all employees
    employees.forEach(emp => {
      summaryMap.set(emp.id!, {
        id: emp.id!,
        name: emp.name,
        jobTitle: emp.jobTitle,
        totalHours: 0,
        daysAttended: 0,
        totalSalary: 0,
        hourlyRate: 0
      });
    });

    // Filter attendance for the selected month and aggregate
    attendance.filter(record => {
      if (record.month && record.year) {
        return `${record.year}-${record.month.toString().padStart(2, '0')}` === selectedMonth;
      }
      return safeFormatDate(record.date, 'yyyy-MM') === selectedMonth;
    }).forEach(record => {
      const summary = summaryMap.get(record.employeeId);
      if (summary) {
        summary.totalHours += record.hoursWork;
        summary.daysAttended += (record.attendanceDays || 0);
        summary.totalSalary += record.dailyWage; // This is hours * rate from form
        summary.hourlyRate = record.hourlyRate;
      }
    });

    return Array.from(summaryMap.values());
  }, [employees, attendance, selectedMonth]);

  const totalMonthlyPayout = monthlySummaries.reduce((sum, s) => sum + s.totalSalary, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tighter text-foreground flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            قسم الموظفين
          </h1>
          <p className="text-muted-foreground font-bold text-sm">إدارة شؤون الموظفين، الرواتب، وساعات العمل</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            className="rounded-xl font-black bg-primary text-primary-foreground h-12 px-6 gap-2 shadow-lg shadow-primary/20"
            onClick={() => setIsAddEmployeeOpen(true)}
          >
            <UserPlus className="h-5 w-5" />
            إضافة موظف
          </Button>
          <Button 
            variant="outline"
            className="rounded-xl font-black h-12 px-6 gap-2 border-border"
            onClick={() => setIsAddAttendanceOpen(true)}
          >
            <Calendar className="h-5 w-5 text-blue-500" />
            تسجيل حضور
          </Button>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className={`grid gap-6 ${appMode === 'laptop' ? 'grid-cols-4' : 'grid-cols-2'}`}>
        <Card className="bg-card border-border rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-primary/10 text-primary">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">إجمالي الموظفين</div>
              <div className="text-2xl font-black font-mono tracking-tighter">{employees.length}</div>
            </div>
          </div>
        </Card>
        <Card className="bg-card border-border rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-600">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">رواتب الشهر (المقدرة)</div>
              <div className="text-2xl font-black font-mono tracking-tighter text-emerald-600">
                {totalMonthlyPayout.toLocaleString()} <span className="text-xs font-sans">د.ع</span>
              </div>
            </div>
          </div>
        </Card>
        <Card className="bg-card border-border rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">إجمالي الساعات (للشهر)</div>
              <div className="text-2xl font-black font-mono tracking-tighter text-blue-600">
                {monthlySummaries.reduce((sum, s) => sum + s.totalHours, 0)} <span className="text-xs font-sans">ساعة</span>
              </div>
            </div>
          </div>
        </Card>
        <Card className="bg-card border-border rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-600">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">أيام الحضور الكلية</div>
              <div className="text-2xl font-black font-mono tracking-tighter text-amber-600">
                {monthlySummaries.reduce((sum, s) => sum + s.daysAttended, 0)} <span className="text-xs font-sans">يوم</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Action Area & Content */}
      <Tabs defaultValue="list" onValueChange={(v) => setActiveSubTab(v as any)} className="w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
          <TabsList className="bg-muted p-1 rounded-2xl border border-border h-12 w-fit">
            <TabsTrigger value="list" className="rounded-xl px-6 font-black gap-2 transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="h-4 w-4" />
              قائمة الموظفين
            </TabsTrigger>
            <TabsTrigger value="attendance" className="rounded-xl px-6 font-black gap-2 transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Calendar className="h-4 w-4" />
              سجل الحضور
            </TabsTrigger>
            <TabsTrigger value="summary" className="rounded-xl px-6 font-black gap-2 transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="h-4 w-4" />
              ملخص الرواتب
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3">
             {activeSubTab === 'attendance' && (
                <div className="flex items-center bg-muted border border-border rounded-xl px-3 h-12 gap-3 min-w-[200px]">
                   <Filter className="h-4 w-4 text-muted-foreground" />
                   <select 
                    value={selectedEmployeeId} 
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 text-xs font-black w-full"
                   >
                     <option value="all">كل الموظفين</option>
                     {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                   </select>
                </div>
             )}
             {(activeSubTab === 'attendance' || activeSubTab === 'summary') && (
               <div className="flex items-center bg-muted border border-border rounded-xl px-3 h-12 gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <input 
                    type="month" 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 text-xs font-black outline-none"
                  />
               </div>
             )}
             {activeSubTab === 'list' && (
                <div className="relative group">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input 
                    placeholder="ابحث عن موظف..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10 h-12 rounded-xl bg-muted/50 border-border font-bold w-[250px]"
                  />
                </div>
             )}
          </div>
        </div>

        {/* Tab Contents */}
        <TabsContent value="list" className="mt-0 space-y-6">
          <Card className="bg-card border-border rounded-3xl overflow-hidden shadow-sm">
             <CardContent className="p-0">
               {appMode === 'laptop' ? (
                 <div className="overflow-x-auto">
                    <table className="w-full text-right">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase">الموظف</th>
                          <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase">رقم الهاتف</th>
                          <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase">الوظيفة</th>
                          <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase">تاريخ الإضافة</th>
                          <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEmployees.map((emp) => (
                          <tr key={emp.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black">
                                  {emp.name.charAt(0)}
                                </div>
                                <div className="font-black text-foreground">{emp.name}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-mono font-bold text-muted-foreground">{emp.phone}</td>
                            <td className="px-6 py-4">
                              <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 text-[10px] font-black">
                                {emp.jobTitle}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs font-bold text-muted-foreground">
                              {safeFormatDate(emp.createdAt || new Date(), 'yyyy/MM/dd')}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted" onClick={() => {
                                  setEditingEmployee(emp);
                                  setIsAddEmployeeOpen(true);
                                }}>
                                  <Edit className="h-4 w-4 text-blue-500" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted" onClick={() => onDeleteEmployee(emp.id!)}>
                                  <Trash2 className="h-4 w-4 text-rose-500" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
               ) : (
                 <div className="p-4 space-y-4">
                   {filteredEmployees.map((emp) => (
                     <div key={emp.id} className="p-4 bg-muted/20 border border-border rounded-2xl space-y-3">
                       <div className="flex justify-between items-start">
                         <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg">
                              {emp.name.charAt(0)}
                            </div>
                            <div>
                               <div className="font-black text-foreground">{emp.name}</div>
                               <div className="text-[10px] text-muted-foreground font-mono italic">{emp.phone}</div>
                            </div>
                         </div>
                         <DropdownMenu>
                            <DropdownMenuTrigger className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-muted/50 outline-none transition-colors">
                              <MoreVertical className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border-border">
                              <DropdownMenuItem className="gap-2 font-bold text-blue-500" onClick={() => {
                                setEditingEmployee(emp);
                                setIsAddEmployeeOpen(true);
                              }}>
                                <Edit className="h-4 w-4" />
                                تعديل
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 font-bold text-rose-500" onClick={() => onDeleteEmployee(emp.id!)}>
                                <Trash2 className="h-4 w-4" />
                                حذف الموظف
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                         </DropdownMenu>
                       </div>
                       <div className="flex justify-between items-center pt-2">
                          <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 text-[10px] font-black">
                            {emp.jobTitle}
                          </span>
                          <span className="text-[10px] font-bold text-muted-foreground">تاريخ الإضافة: {safeFormatDate(emp.createdAt || new Date(), 'yyyy/MM/dd')}</span>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="mt-0 space-y-6">
          <Card className="bg-card border-border rounded-3xl overflow-hidden shadow-sm">
             <CardContent className="p-0">
               {appMode === 'laptop' ? (
                 <div className="overflow-x-auto">
                    <table className="w-full text-right">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase text-right">الشهر / السنة</th>
                          <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase text-right">الموظف</th>
                          <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase text-center">أيام الحضور</th>
                          <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase text-center">ساعات عمل يومية</th>
                          <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase text-center">إجمالي الساعات</th>
                          <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase text-right">أجر الساعة</th>
                          <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase text-right">أجر الشهر</th>
                          <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAttendance.map((record) => (
                          <tr key={record.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-muted-foreground text-right">
                              {record.month && record.year ? `${record.month}/${record.year}` : safeFormatDate(record.date, 'MM/yyyy')}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="font-black text-foreground">{record.employeeName}</div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600 text-[10px] font-black font-mono">
                                {record.attendanceDays || 0} يوم
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-600 text-[10px] font-black font-mono">
                                {record.dailyWorkHours || 8} ساعة
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 text-[10px] font-black font-mono">
                                {record.hoursWork} ساعة
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono font-black text-muted-foreground text-right text-xs">
                              {record.hourlyRate.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="font-black text-emerald-600 font-mono tracking-tighter text-sm">
                                {record.dailyWage.toLocaleString()} <span className="text-[9px] font-sans">د.ع</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted" onClick={() => {
                                  setEditingAttendance(record);
                                  setIsAddAttendanceOpen(true);
                                }}>
                                  <Edit className="h-4 w-4 text-blue-500" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted" onClick={() => onDeleteAttendance(record.id!)}>
                                  <Trash2 className="h-4 w-4 text-rose-500" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
               ) : (
                 <div className="p-4 space-y-4">
                   {filteredAttendance.map((record) => (
                     <div key={record.id} className="p-4 bg-muted/30 border border-border rounded-2xl space-y-3">
                       <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase">
                         <span className="font-mono">{safeFormatDate(record.date, 'yyyy/MM/dd')}</span>
                         <span className="text-primary">{record.employeeName}</span>
                       </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="bg-muted px-2 py-1 rounded text-center border border-border/50">
                            <span className="text-muted-foreground block text-[7px] font-bold uppercase">الحضور</span>
                            <span className="font-black text-amber-600">{record.attendanceDays || 0} يوم</span>
                          </div>
                          <div className="bg-muted px-2 py-1 rounded text-center border border-border/50">
                            <span className="text-muted-foreground block text-[7px] font-bold uppercase">ساعة/يوم</span>
                            <span className="font-black text-blue-600">{record.dailyWorkHours || 8}</span>
                          </div>
                          <div className="bg-muted px-2 py-1 rounded text-center border border-border/50">
                            <span className="text-muted-foreground block text-[7px] font-bold uppercase">إجمالي</span>
                            <span className="font-black text-indigo-600">{record.hoursWork}</span>
                          </div>
                        </div>
                        <div className="text-xl font-black text-emerald-600 font-mono tracking-tighter">
                           {record.dailyWage.toLocaleString()} <span className="text-[10px] font-sans">د.ع</span>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                          <Button variant="ghost" size="sm" className="h-8 gap-2 font-bold text-blue-500" onClick={() => {
                            setEditingAttendance(record);
                            setIsAddAttendanceOpen(true);
                          }}>
                            <Edit className="h-3 w-3" />
                            تعديل
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 gap-2 font-bold text-rose-500" onClick={() => onDeleteAttendance(record.id!)}>
                            <Trash2 className="h-3 w-3" />
                            حذف
                          </Button>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="mt-0 space-y-6">
           <div className={`grid gap-6 ${appMode === 'laptop' ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
              {monthlySummaries.map((summary) => (
                <Card key={summary.id} className="bg-card border-border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all group">
                   <CardHeader className="bg-muted/30 border-b border-border pb-4">
                      <div className="flex items-center gap-4">
                         <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl">
                            {summary.name.charAt(0)}
                         </div>
                         <div className="flex-1">
                            <CardTitle className="text-lg font-black">{summary.name}</CardTitle>
                            <CardDescription className="text-xs font-bold text-primary">{summary.jobTitle}</CardDescription>
                         </div>
                      </div>
                   </CardHeader>
                   <CardContent className="p-6 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                         <div className="p-4 bg-muted/50 border border-border rounded-2xl text-center">
                            <div className="text-[10px] font-black text-muted-foreground mb-1 uppercase tracking-wider">ساعات العمل</div>
                            <div className="text-xl font-black font-mono text-blue-600">{summary.totalHours}</div>
                         </div>
                         <div className="p-4 bg-muted/50 border border-border rounded-2xl text-center">
                            <div className="text-[10px] font-black text-muted-foreground mb-1 uppercase tracking-wider">أيام الحضور</div>
                            <div className="text-xl font-black font-mono text-amber-600">{summary.daysAttended}</div>
                         </div>
                      </div>
                      
                      <div className="space-y-3">
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground font-bold">أجر الساعة الحالي:</span>
                            <span className="font-mono font-black">{summary.hourlyRate.toLocaleString()} د.ع</span>
                         </div>
                         <div className="pt-4 border-t border-border/50 flex justify-between items-end">
                            <div className="space-y-1">
                               <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">صافي راتب الشهر</div>
                               <div className="text-3xl font-black text-emerald-600 font-mono tracking-tighter leading-none">
                                  {summary.totalSalary.toLocaleString()}
                               </div>
                            </div>
                            <div className="text-xs font-black text-primary font-sans">د.ع</div>
                         </div>
                      </div>
                   </CardContent>
                </Card>
              ))}
           </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <Dialog 
        open={isAddEmployeeOpen} 
        onOpenChange={(open) => {
          setIsAddEmployeeOpen(open);
          if (!open) setEditingEmployee(null);
        }}
      >
        <DialogContent className="sm:max-w-[500px] bg-card border-border rounded-3xl p-8" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <UserPlus className="h-6 w-6 text-primary" />
              {editingEmployee ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
            </DialogTitle>
            <p className="text-muted-foreground text-sm font-bold mt-2">
              يرجى ملء البيانات بدقة لضمان إدارة صحيحة
            </p>
          </DialogHeader>
          <div className="mt-6">
            <EmployeeForm 
              initialData={editingEmployee || undefined}
              onClose={() => {
                setIsAddEmployeeOpen(false);
                setEditingEmployee(null);
              }}
              onSubmit={(data) => {
                if (editingEmployee) {
                  onUpdateEmployee(editingEmployee.id!, data);
                } else {
                  onAddEmployee(data);
                }
                setIsAddEmployeeOpen(false);
                setEditingEmployee(null);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog 
        open={isAddAttendanceOpen} 
        onOpenChange={(open) => {
          setIsAddAttendanceOpen(open);
          if (!open) setEditingAttendance(null);
        }}
      >
        <DialogContent className="sm:max-w-[500px] bg-card border-border rounded-3xl p-8" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <Calendar className="h-6 w-6 text-blue-500" />
              {editingAttendance ? 'تعديل سجل الحضور' : 'تسجيل ساعات حضور'}
            </DialogTitle>
            <p className="text-muted-foreground text-sm font-bold mt-2">
              حساب الأجر اليومي بناءً على ساعات العمل والسعر
            </p>
          </DialogHeader>
          <div className="mt-6 font-sans">
             <AttendanceForm 
               employees={employees}
               initialData={editingAttendance || undefined}
               onClose={() => {
                 setIsAddAttendanceOpen(false);
                 setEditingAttendance(null);
               }}
               onSubmit={(data) => {
                 if (editingAttendance) {
                   onUpdateAttendance(editingAttendance.id!, data);
                 } else {
                   onAddAttendance(data);
                 }
                 setIsAddAttendanceOpen(false);
                 setEditingAttendance(null);
               }}
             />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
