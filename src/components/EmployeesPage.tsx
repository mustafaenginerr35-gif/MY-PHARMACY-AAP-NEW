import React, { useState, useMemo, useEffect } from 'react';
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
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { RefreshCw, Clipboard } from 'lucide-react';

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
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'attendance' | 'summary' | 'live-checkins'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(safeFormatDate(new Date(), 'yyyy-MM'));
  
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isAddAttendanceOpen, setIsAddAttendanceOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<EmployeeAttendance | null>(null);

  // Live employee mobile checkins
  const [liveCheckIns, setLiveCheckIns] = useState<any[]>([]);
  const [loadingLiveLogs, setLoadingLiveLogs] = useState(true);

  useEffect(() => {
    const authUserStr = localStorage.getItem('pharma-auth-user') || '{}';
    let activePharmacyId = '';
    try {
      activePharmacyId = JSON.parse(authUserStr).userId;
    } catch (e) {}
    if (!activePharmacyId && employees.length > 0) {
      activePharmacyId = employees[0].ownerId;
    }

    if (!activePharmacyId) {
      setLoadingLiveLogs(false);
      return;
    }

    const q = query(
      collection(db, 'employeeCheckIns'),
      where('pharmacyId', '==', activePharmacyId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      logs.sort((a: any, b: any) => {
        const dateA = a.dateStr || '';
        const dateB = b.dateStr || '';
        return dateB.localeCompare(dateA);
      });
      setLiveCheckIns(logs);
      setLoadingLiveLogs(false);
    }, (error) => {
      console.error("Error with live check-ins subscription:", error);
      setLoadingLiveLogs(false);
    });

    return () => unsubscribe();
  }, [employees]);

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
      salaryType?: 'hourly' | 'daily' | 'lumped';
      fixedMonthlySalary?: number;
      amountPaid?: number;
      amountRemaining?: number;
      paymentStatus?: 'paid' | 'unpaid' | 'partial';
      attendanceRecordId?: string;
    }>();

    // Initialize with all employees
    employees.forEach(emp => {
      summaryMap.set(emp.id!, {
        id: emp.id!,
        name: emp.name,
        jobTitle: emp.jobTitle,
        totalHours: 0,
        daysAttended: 0,
        totalSalary: emp.salaryType === 'lumped' ? (emp.fixedMonthlySalary || 0) : 0,
        hourlyRate: 0,
        salaryType: emp.salaryType || 'hourly',
        fixedMonthlySalary: emp.fixedMonthlySalary || 0,
        amountPaid: 0,
        amountRemaining: emp.salaryType === 'lumped' ? (emp.fixedMonthlySalary || 0) : 0,
        paymentStatus: 'unpaid',
        attendanceRecordId: undefined
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
        summary.attendanceRecordId = record.id;
        summary.totalHours += record.hoursWork;
        summary.daysAttended += (record.attendanceDays || 0);
        summary.salaryType = record.salaryType || summary.salaryType;
        
        if (record.salaryType === 'lumped') {
          summary.totalSalary = record.dailyWage;
          summary.amountPaid = record.amountPaid || 0;
          summary.amountRemaining = record.amountRemaining ?? (record.dailyWage - (record.amountPaid || 0));
          summary.paymentStatus = record.paymentStatus || 'unpaid';
        } else {
          summary.totalSalary += record.dailyWage;
          summary.amountPaid = (summary.amountPaid || 0) + record.dailyWage;
          summary.amountRemaining = 0;
          summary.paymentStatus = 'paid';
        }
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
            <TabsTrigger value="live-checkins" className="rounded-xl px-6 font-black gap-2 transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Smartphone className="h-4 w-4 text-emerald-550" />
              بوابة الموبايل المباشرة
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
                          <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase">نوع الراتب</th>
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
                                <div className="text-right">
                                  <div className="font-black text-foreground">{emp.name}</div>
                                  <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 mt-0.5 select-all hover:text-primary transition-colors cursor-pointer" onClick={() => {
                                    navigator.clipboard.writeText(emp.id!);
                                    toast.success(`تم نسخ رمز الموظف ${emp.name} بنجاح!`);
                                  }}>
                                    <span>رمز الموظف: {emp.id}</span>
                                    <Clipboard className="h-3 w-3 opacity-60 text-emerald-500 inline" />
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                                emp.salaryType === 'lumped' ? 'bg-indigo-500/10 text-indigo-600' :
                                emp.salaryType === 'daily' ? 'bg-amber-500/10 text-amber-600' : 'bg-slate-500/10 text-slate-600'
                              }`}>
                                {emp.salaryType === 'lumped' ? 'مقطوعة شهرياً' :
                                 emp.salaryType === 'daily' ? 'باليوم' : 'بالساعة'}
                              </span>
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
                               <div className="font-black text-foreground flex items-center gap-2">
                                 {emp.name}
                                 <span className="text-[9px] bg-indigo-500/10 text-indigo-600 px-1.5 rounded font-black">
                                   {emp.salaryType === 'lumped' ? 'مقطوعة' :
                                    emp.salaryType === 'daily' ? 'يومي' : 'ساعة'}
                                 </span>
                               </div>
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
                          <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase text-right">الموظف (نوع الراتب)</th>
                          <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase text-right">الشهر / السنة</th>
                          <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase text-center">أيام الحضور</th>
                          <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase text-right">الراتب المستحق</th>
                          <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase text-right">المدفوع (المصروف)</th>
                          <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase text-right">المتبقي</th>
                          <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase text-center">حالة الراتب</th>
                          <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAttendance.map((record) => (
                          <tr key={record.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="px-6 py-4 text-right">
                              <div className="font-black text-foreground flex items-center gap-2">
                                {record.employeeName}
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                                  record.salaryType === 'lumped' ? 'bg-indigo-500/10 text-indigo-600' :
                                  record.salaryType === 'daily' ? 'bg-amber-500/10 text-amber-600' : 'bg-slate-500/10 text-slate-600'
                                }`}>
                                  {record.salaryType === 'lumped' ? 'مقطوعة' :
                                   record.salaryType === 'daily' ? 'يومي' : 'بالساعة'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-mono font-bold text-muted-foreground text-right">
                              {record.month && record.year ? `${record.month}/${record.year}` : safeFormatDate(record.date, 'MM/yyyy')}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600 text-[10px] font-black font-mono">
                                {record.attendanceDays || 0} يوم
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="font-black text-slate-800 font-mono tracking-tighter text-sm">
                                {record.dailyWage.toLocaleString()} <span className="text-[9px] font-sans text-muted-foreground">د.ع</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="font-black text-emerald-600 font-mono tracking-tighter text-sm">
                                {record.salaryType === 'lumped' ? (record.amountPaid || 0).toLocaleString() : record.dailyWage.toLocaleString()} <span className="text-[9px] font-sans text-muted-foreground">د.ع</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="font-black text-rose-500 font-mono tracking-tighter text-sm">
                                {record.salaryType === 'lumped' ? (record.amountRemaining || 0).toLocaleString() : '0'} <span className="text-[9px] font-sans text-muted-foreground">د.ع</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {record.salaryType === 'lumped' ? (
                                <span className={`px-2 py-1 rounded-full text-[10px] font-black ${
                                  record.paymentStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/15' :
                                  record.paymentStatus === 'partial' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/15' : 'bg-rose-500/10 text-rose-600 border border-rose-500/15'
                                }`}>
                                  {record.paymentStatus === 'paid' ? 'مسدد بالكامل' :
                                   record.paymentStatus === 'partial' ? 'مسدد جزئياً' : 'غير مسدد'}
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-black border border-emerald-500/15">
                                  مسدد بالكامل
                                </span>
                              )}
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
                     <div key={record.id} className="p-4 bg-muted/30 border border-border rounded-2xl space-y-3 text-right">
                       <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase">
                         <span className="font-mono">{safeFormatDate(record.date, 'yyyy/MM/dd')}</span>
                         <span className="text-primary font-black flex items-center gap-2">
                           {record.employeeName}
                           <span className="text-[8px] px-1 bg-indigo-500/10 text-indigo-600 rounded">
                             {record.salaryType === 'lumped' ? 'مقطوعة' : 'ساعة/يومي'}
                           </span>
                         </span>
                       </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-muted px-2 py-1 rounded border border-border/50 text-center">
                            <span className="text-muted-foreground block text-[8px] font-black uppercase">أيام الحضور</span>
                            <span className="font-black text-amber-600">{record.attendanceDays || 0} يوم</span>
                          </div>
                          <div className="bg-muted px-2 py-1 rounded border border-border/50 text-center">
                            <span className="text-muted-foreground block text-[8px] font-black uppercase">الراتب المستحق</span>
                            <span className="font-mono font-black text-slate-800">{record.dailyWage.toLocaleString()} د.ع</span>
                          </div>
                        </div>

                        {record.salaryType === 'lumped' && (
                          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                            <div className="bg-muted px-2 py-1 rounded border border-border/50 text-center">
                              <span className="text-muted-foreground block text-[8px] font-black uppercase">المصروف فعلياً</span>
                              <span className="font-mono font-black text-emerald-600">{(record.amountPaid || 0).toLocaleString()} د.ع</span>
                            </div>
                            <div className="bg-muted px-2 py-1 rounded border border-border/50 text-center">
                              <span className="text-muted-foreground block text-[8px] font-black uppercase">المتبقي للحساب</span>
                              <span className="font-mono font-black text-rose-600">{(record.amountRemaining || 0).toLocaleString()} د.ع</span>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-2 border-t border-border/50">
                          <div>
                            {record.salaryType === 'lumped' ? (
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                                record.paymentStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-600' :
                                record.paymentStatus === 'partial' ? 'bg-amber-500/10 text-amber-600' : 'bg-rose-500/10 text-rose-600'
                              }`}>
                                {record.paymentStatus === 'paid' ? 'مسدد' :
                                 record.paymentStatus === 'partial' ? 'مسدد جزئي' : 'غير مسدد'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[9px] font-black">
                                مسدد
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="h-8 gap-1.5 font-bold text-blue-500 hover:bg-muted" onClick={() => {
                              setEditingAttendance(record);
                              setIsAddAttendanceOpen(true);
                            }}>
                              <Edit className="h-3.5 w-3.5" />
                              تعديل
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 gap-1.5 font-bold text-rose-500 hover:bg-muted" onClick={() => onDeleteAttendance(record.id!)}>
                              <Trash2 className="h-3.5 w-3.5" />
                              حذف
                            </Button>
                          </div>
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
                <Card key={summary.id} className="bg-card border-border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all group text-right">
                   <CardHeader className="bg-muted/30 border-b border-border pb-4">
                      <div className="flex items-center gap-4">
                         <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl">
                            {summary.name.charAt(0)}
                         </div>
                         <div className="flex-1 text-right">
                            <CardTitle className="text-lg font-black">{summary.name}</CardTitle>
                            <CardDescription className="text-xs font-bold text-primary">{summary.jobTitle}</CardDescription>
                         </div>
                      </div>
                   </CardHeader>
                   <CardContent className="p-6 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                         <div className="p-4 bg-muted/50 border border-border rounded-2xl text-center">
                            <div className="text-[10px] font-black text-muted-foreground mb-1 uppercase tracking-wider">ساعات العمل</div>
                            <div className="text-xl font-black font-mono text-blue-600">
                              {summary.salaryType === 'lumped' ? '—' : summary.totalHours}
                            </div>
                         </div>
                         <div className="p-4 bg-muted/50 border border-border rounded-2xl text-center">
                            <div className="text-[10px] font-black text-muted-foreground mb-1 uppercase tracking-wider">أيام الحضور</div>
                            <div className="text-xl font-black font-mono text-amber-600">{summary.daysAttended}</div>
                         </div>
                      </div>
                      
                      <div className="space-y-3 text-right">
                         {summary.salaryType === 'lumped' ? (
                           <>
                             <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground font-bold">نوع الراتب:</span>
                                <span className="font-black bg-indigo-500/10 text-indigo-600 px-2.5 py-0.5 rounded text-xs">مقطوعة شهرياً</span>
                             </div>
                             <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground font-bold">المبلغ المصروف:</span>
                                <span className="font-mono font-black text-emerald-600">{(summary.amountPaid || 0).toLocaleString()} د.ع</span>
                             </div>
                             <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground font-bold">المبلغ المتبقي:</span>
                                <span className="font-mono font-black text-rose-500">{(summary.amountRemaining || 0).toLocaleString()} د.ع</span>
                             </div>
                             <div className="flex justify-between items-center text-sm pt-2 border-t border-border/40">
                                <span className="text-muted-foreground font-bold">حالة الراتب:</span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                  summary.paymentStatus === 'paid' ? 'bg-emerald-500/12 text-emerald-600' :
                                  summary.paymentStatus === 'partial' ? 'bg-amber-500/12 text-amber-600' : 'bg-rose-500/12 text-rose-600'
                                }`}>
                                  {summary.paymentStatus === 'paid' ? 'مسدد بالكامل' :
                                   summary.paymentStatus === 'partial' ? 'مسدد جزئياً' : 'غير مسدد'}
                                </span>
                             </div>
                           </>
                         ) : (
                           <>
                             <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground font-bold">أجر الساعة الحالي:</span>
                                <span className="font-mono font-black">{summary.hourlyRate.toLocaleString()} د.ع</span>
                             </div>
                             <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground font-bold">نوع نظام العمل:</span>
                                <span className="font-black bg-slate-500/10 text-slate-600 px-2 py-0.5 rounded text-xs">
                                  {summary.salaryType === 'daily' ? 'يومي' : 'بالساعة'}
                                </span>
                             </div>
                           </>
                         )}

                         <div className="pt-4 border-t border-border/50 flex justify-between items-end">
                            <div className="space-y-1 text-right">
                               <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">إجمالي مستحقات الشهر</div>
                               <div className="text-3xl font-black text-emerald-600 font-mono tracking-tighter leading-none">
                                  {summary.totalSalary.toLocaleString()}
                               </div>
                            </div>
                            <div className="text-xs font-black text-primary font-sans">د.ع</div>
                         </div>

                         <div className="pt-4">
                           <Button 
                             className="w-full h-11 rounded-xl font-black text-xs gap-2 transition-all bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm hover:shadow"
                             onClick={() => {
                               if (summary.attendanceRecordId) {
                                 const rec = attendance.find(r => r.id === summary.attendanceRecordId);
                                 if (rec) {
                                   setEditingAttendance(rec);
                                   setIsAddAttendanceOpen(true);
                                 }
                               } else {
                                 const [yearStr, monthStr] = selectedMonth.split('-');
                                 setEditingAttendance({
                                   employeeId: summary.id,
                                   employeeName: summary.name,
                                   month: Number(monthStr),
                                   year: Number(yearStr),
                                   attendanceDays: 30,
                                   dailyWorkHours: 0,
                                   hoursWork: 0,
                                   hourlyRate: 0,
                                   dailyWage: summary.fixedMonthlySalary || 0,
                                   date: new Date(Number(yearStr), Number(monthStr) - 1, 1),
                                   notes: '',
                                   salaryType: 'lumped',
                                   fixedMonthlySalary: summary.fixedMonthlySalary || 0,
                                   amountPaid: summary.fixedMonthlySalary || 0,
                                   amountRemaining: 0,
                                   paymentDate: new Date(),
                                   paymentStatus: 'paid',
                                   paymentNotes: ''
                                 } as any);
                                 setIsAddAttendanceOpen(true);
                               }
                             }}
                           >
                             <DollarSign className="h-4 w-4" />
                             {summary.salaryType === 'lumped'
                               ? (summary.attendanceRecordId ? 'تعديل الصرف والسجل' : 'صرف الراتب المقطوع')
                               : 'تسجيل الحضور والصرف'}
                           </Button>
                         </div>
                      </div>
                   </CardContent>
                </Card>
              ))}
           </div>
        </TabsContent>

        <TabsContent value="live-checkins" className="mt-0 space-y-6">
          {/* Credentials and Instruction banner */}
          <Card className="bg-emerald-550/5 border border-emerald-500/20 rounded-3xl overflow-hidden shadow-sm text-right relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl" />
            <CardContent className="p-6 relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="space-y-2">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-emerald-400" />
                  بوابة حضور وانصراف الموظفين للموبايل السحابية
                </h3>
                <p className="text-xs text-muted-foreground font-bold leading-relaxed max-w-xl">
                  من هاتف الموظف المحمول، يرجى مشاركة البيانات أدناه معه ليسجل الحضور والانصراف تلقائياً برقم هوية الموظف الفريد والربط الفوري.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-right w-full sm:w-auto">
                  <span className="text-[10px] text-slate-400 font-black block">رابط البوابة للموبايل</span>
                  <span className="text-xs font-mono font-bold text-white bg-slate-800 px-2 py-1 rounded select-all block mt-1 hover:text-emerald-400 transition-colors cursor-pointer" onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/?portal=employee`);
                    toast.success('تم نسخ رابط بوابة الموظف السريعة!');
                  }}>
                    {window.location.origin}/?portal=employee
                  </span>
                </div>
                
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-right w-full sm:w-auto">
                  <span className="text-[10px] text-slate-400 font-black block">معرف صيدليتك المشترك (Pharmacy ID)</span>
                  <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-950/45 px-2.5 py-1 rounded select-all block mt-1 hover:text-emerald-300 transition-colors cursor-pointer" onClick={() => {
                    const authUserStr = localStorage.getItem('pharma-auth-user') || '{}';
                    const pId = JSON.parse(authUserStr).userId || employees[0]?.ownerId || '';
                    navigator.clipboard.writeText(pId);
                    toast.success('تم نسخ معرف الصيدلية!');
                  }}>
                    {JSON.parse(localStorage.getItem('pharma-auth-user') || '{}').userId || employees[0]?.ownerId || 'جاري التحميل...'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Check Ins List */}
          <Card className="bg-card border-border rounded-3xl overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border bg-muted/20 pb-4">
               <div className="flex justify-between items-center">
                  <div className="text-right">
                     <CardTitle className="text-lg font-black flex items-center gap-2">
                        <Clock className="h-5 w-5 text-emerald-500 animate-pulse" />
                        سجل الحركات اليومية السحابي للموبايل
                     </CardTitle>
                     <CardDescription className="text-xs font-bold text-muted-foreground mt-1">
                        حركات تسجيل حضور وانصراف الموظفين الصادرة من الهواتف الذكية للربط في الوقت الفعلي
                     </CardDescription>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-mono font-black">
                    {liveCheckIns.length}
                  </div>
               </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingLiveLogs ? (
                <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-3">
                   <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                   <span className="text-xs font-bold font-sans">جاري تحميل حركات الموبايل الذكية...</span>
                </div>
              ) : liveCheckIns.length === 0 ? (
                <div className="text-center p-12 text-muted-foreground space-y-2">
                   <Smartphone className="h-8 w-8 mx-auto text-slate-400" />
                   <p className="text-xs font-black">لا توجد حركات حضور سحابية مسجلة بعد</p>
                   <p className="text-[10px] text-slate-400">عندما يقوم الموظف بتسجيل الحضور من موبايله ستظهر الحركات هنا فوراً تلقائياً.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                   <table className="w-full text-right text-xs">
                     <thead>
                       <tr className="bg-muted/50 border-b border-border">
                         <th className="px-6 py-4 font-black text-muted-foreground text-right w-36">التاريخ اليومي</th>
                         <th className="px-6 py-4 font-black text-muted-foreground text-right">اسم الموظف</th>
                         <th className="px-6 py-4 font-black text-muted-foreground text-center w-24">وقت الحضور</th>
                         <th className="px-6 py-4 font-black text-muted-foreground text-center w-24">وقت الانصراف</th>
                         <th className="px-6 py-4 font-black text-muted-foreground text-center w-28">ساعات العمل</th>
                         <th className="px-6 py-4 font-black text-muted-foreground text-right w-32">الجهاز والمنصة</th>
                         <th className="px-6 py-4 font-black text-muted-foreground text-center">الحالة والخيارات</th>
                       </tr>
                     </thead>
                     <tbody>
                       {liveCheckIns.map((log: any) => (
                         <tr key={log.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                           <td className="px-6 py-4 font-mono font-bold text-slate-500 text-right">
                             {log.dateStr}
                           </td>
                           <td className="px-6 py-4 text-right">
                             <div className="text-right">
                               <span className="font-black text-foreground">{log.employeeName}</span>
                               <span className="block text-[10px] text-slate-400 font-mono">ID: {log.employeeId}</span>
                             </div>
                           </td>
                           <td className="px-6 py-4 font-mono font-black text-emerald-600 text-center">
                             {log.checkInTime || '—'}
                           </td>
                           <td className="px-6 py-4 font-mono font-black text-amber-600 text-center">
                             {log.checkOutTime || '—'}
                           </td>
                           <td className="px-6 py-4 font-mono font-black text-blue-600 text-center">
                             {log.totalHours !== undefined ? `${log.totalHours} ساعة` : 'قيد العمل...'}
                           </td>
                           <td className="px-6 py-4 text-muted-foreground text-[10px] font-bold text-right">
                             {log.deviceInfo || 'مجهول'}
                           </td>
                           <td className="px-6 py-4 text-center">
                             <div className="flex items-center justify-center gap-2">
                               {log.status === 'checked_in' ? (
                                 <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[10px] font-black animate-pulse">
                                   حاضر للعمل
                                 </span>
                               ) : (
                                 <span className="px-2 py-0.5 rounded bg-slate-500/10 text-slate-600 text-[10px] font-black">
                                   انصرف بأمان
                                 </span>
                               )}

                               <Button 
                                 variant="ghost" 
                                 size="sm"
                                 className="h-7 text-[10px] hover:bg-rose-50 hover:text-rose-600 text-rose-500 cursor-pointer"
                                 onClick={async () => {
                                   if (confirm(`هل أنت متأكد من حذف حركة حضور الموظف ${log.employeeName}؟ (يتيح له تسجيل حضور من جديد)`)) {
                                     try {
                                       await deleteDoc(doc(db, 'employeeCheckIns', log.id));
                                       toast.success('تم حذف السجل وإتاحته للموظف مجدداً');
                                     } catch (e) {
                                       toast.error('فشل الحذف');
                                     }
                                   }
                                 }}
                               >
                                 حذف وإتاحة
                               </Button>
                             </div>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                </div>
              )}
            </CardContent>
          </Card>
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
