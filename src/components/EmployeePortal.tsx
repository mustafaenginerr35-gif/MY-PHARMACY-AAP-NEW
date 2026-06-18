import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  LogIn, 
  LogOut, 
  CheckCircle2, 
  AlertCircle, 
  CalendarRange, 
  User, 
  Building2, 
  Smartphone,
  ChevronLeft,
  Calendar,
  RefreshCw,
  Clock3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { toast } from 'sonner';
import { safeFormatDate } from '../lib/formatters';
import { motion, AnimatePresence } from 'motion/react';

interface EmployeePortalProps {
  onBackToAdmin: () => void;
}

interface EmployeeSession {
  pharmacyId: string;
  employeeId: string;
  employeeName: string;
  branchId: string;
  pharmacyName: string;
}

export const EmployeePortal = ({ onBackToAdmin }: EmployeePortalProps) => {
  // Session tracking
  const [session, setSession] = useState<EmployeeSession | null>(null);
  
  // Login form inputs
  const [pharmacyIdInput, setPharmacyIdInput] = useState('');
  const [employeeIdInput, setEmployeeIdInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Daily Log Status for State
  const [todayLog, setTodayLog] = useState<any | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Aggregate stats
  const [monthlyStats, setMonthlyStats] = useState({
    attendedDays: 0,
    totalHours: 0,
    absentDays: 0
  });

  // Load session from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('pharma-employee-session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.pharmacyId && parsed.employeeId) {
          setSession(parsed);
        }
      } catch (e) {
        console.error("Failed to parse employee session", e);
      }
    }
  }, []);

  // Fetch today's log & monthly stats whenever session changes
  useEffect(() => {
    if (session) {
      fetchLogsAndStats();
    }
  }, [session]);

  const fetchLogsAndStats = async () => {
    if (!session) return;
    setIsSyncing(true);
    const todayStr = safeFormatDate(new Date(), 'yyyy-MM-dd');
    
    try {
      // 1. Fetch Today's log
      const logRef = doc(db, 'employeeCheckIns', `${session.employeeId}_${todayStr}`);
      const logSnap = await getDoc(logRef);
      if (logSnap.exists()) {
        setTodayLog(logSnap.data());
      } else {
        setTodayLog(null);
      }

      // 2. Fetch all logs for current month to compute stats
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1; // 1-12
      const monthPrefix = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;
      
      const q = query(
        collection(db, 'employeeCheckIns'),
        where('employeeId', '==', session.employeeId),
        where('pharmacyId', '==', session.pharmacyId)
      );
      
      const querySnap = await getDocs(q);
      const allLogs = querySnap.docs.map(doc => doc.data());
      
      // Filter current month logs
      const thisMonthLogs = allLogs.filter((log: any) => log.dateStr?.startsWith(monthPrefix));
      
      const attended = thisMonthLogs.length;
      const hours = thisMonthLogs.reduce((acc: number, log: any) => acc + (log.totalHours || 0), 0);
      
      // Calculate absent days (days passed in current month minus attended days)
      const currentDay = new Date().getDate();
      const absent = Math.max(0, currentDay - attended);

      setMonthlyStats({
        attendedDays: attended,
        totalHours: parseFloat(hours.toFixed(2)),
        absentDays: absent
      });
    } catch (error) {
      console.error("Error fetching employee check-in logs:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pharmacyIdInput.trim() || !employeeIdInput.trim()) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setIsLoading(true);
    try {
      const cleanPharmacyId = pharmacyIdInput.trim();
      const cleanEmployeeId = employeeIdInput.trim();

      // 1. Verify Pharmacy existence
      const pharmacyRef = doc(db, 'appUsers', cleanPharmacyId);
      const pharmacySnap = await getDoc(pharmacyRef);
      if (!pharmacySnap.exists()) {
        toast.error('معرف الصيدلية المدخل غير صحيح أو غير مفعل سحابياً');
        setIsLoading(false);
        return;
      }

      const pharmacyData = pharmacySnap.data();
      const pharmacyName = pharmacyData.pharmacyName || pharmacyData.displayName || 'صيدلية شريكة';

      // 2. Verify Employee existence
      const employeeRef = doc(db, 'employees', cleanEmployeeId);
      const employeeSnap = await getDoc(employeeRef);
      if (!employeeSnap.exists()) {
        toast.error('معرف الموظف غير صحيح. يرجى مراجعته مع المدير');
        setIsLoading(false);
        return;
      }

      const employeeData = employeeSnap.data();
      if (employeeData.ownerId !== cleanPharmacyId) {
        toast.error('اسم هذا الموظف غير مسجل تحت هذه الصيدلية');
        setIsLoading(false);
        return;
      }

      // Successful login
      const newSession: EmployeeSession = {
        pharmacyId: cleanPharmacyId,
        employeeId: cleanEmployeeId,
        employeeName: employeeData.name,
        branchId: employeeData.branchId || 'main',
        pharmacyName
      };

      localStorage.setItem('pharma-employee-session', JSON.stringify(newSession));
      setSession(newSession);
      toast.success(`أهلاً بك يا ${employeeData.name}`);
    } catch (error) {
      console.error("Failed to authenticate employee portal:", error);
      toast.error('فشل الدخول. يرجى التحقق من اتصال الإنترنت والمحاولة مجدداً');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('pharma-employee-session');
    setSession(null);
    setTodayLog(null);
    setMonthlyStats({ attendedDays: 0, totalHours: 0, absentDays: 0 });
    toast.success('تم تسجيل الخروج بنجاح');
  };

  const getUserAgentInfo = () => {
    try {
      const ua = navigator.userAgent;
      if (/android/i.test(ua)) return "موبايل أندرويد";
      if (/iPhone|iPad|iPod/i.test(ua)) return "موبايل iOS (آيفون)";
      return "متصفح الويب";
    } catch (e) {
      return "جهاز ذكي مجهول";
    }
  };

  const handleCheckIn = async () => {
    if (!session) return;
    setIsLoading(true);

    const now = new Date();
    const todayStr = safeFormatDate(now, 'yyyy-MM-dd');
    const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: false });
    const logDocId = `${session.employeeId}_${todayStr}`;

    try {
      // Get fresh employee doc to check allowDoubleCheckIn or block status
      const empSnap = await getDoc(doc(db, 'employees', session.employeeId));
      const empData = empSnap.exists() ? empSnap.data() : null;

      // Rule: Prevent double check in on the same day unless manager resets or configures it
      const logRef = doc(db, 'employeeCheckIns', logDocId);
      const existingSnap = await getDoc(logRef);

      if (existingSnap.exists()) {
        const existingData = existingSnap.data() as any;
        
        if (existingData.status === 'checked_in') {
          toast.error('أنت مسجل حضور بالفعل اليوم! اضغط على انصراف عند انتهاء العمل.');
          setIsLoading(false);
          return;
        }

        if (existingData.status === 'checked_out') {
          // Double check-in restriction
          const allowedByManager = empData?.allowDoubleCheckIn === true || existingData.forceAllowed === true;
          if (!allowedByManager) {
            toast.error('عذراً، لا يمكن تسجيل حضور مرتين في نفس اليوم إلا بإذن المدير وتفعيل الصلاحية.');
            setIsLoading(false);
            return;
          }
        }
      }

      // Check-In Payload
      const payload = {
        id: logDocId,
        employeeId: session.employeeId,
        employeeName: session.employeeName,
        pharmacyId: session.pharmacyId,
        ownerId: session.pharmacyId, // Ensure it aligns with queries matching ownerId
        branchId: session.branchId,
        checkInTime: timeStr,
        checkInDate: now,
        date: now,
        dateStr: todayStr,
        deviceInfo: getUserAgentInfo(),
        status: 'checked_in',
        createdAt: now,
        updatedAt: now
      };

      await setDoc(logRef, payload);
      toast.success('تم تسجيل الحضور اليومي بنجاح! طاب يومك عملك.');
      await fetchLogsAndStats();
    } catch (e) {
      console.error("Error on check in:", e);
      toast.error('فشل في تسجيل الحضور السحابي');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!session) return;
    if (!todayLog || todayLog.status !== 'checked_in') {
      toast.error('يجب تسجيل حضور أولاً قبل تسجيل الانصراف!');
      return;
    }

    setIsLoading(true);
    const now = new Date();
    const todayStr = safeFormatDate(now, 'yyyy-MM-dd');
    const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: false });
    const logDocId = `${session.employeeId}_${todayStr}`;

    try {
      const checkInDateTime = todayLog.checkInDate ? todayLog.checkInDate.toDate() : todayLog.createdAt.toDate();
      const diffMs = now.getTime() - checkInDateTime.getTime();
      const totalHoursCalculated = Math.max(0.1, diffMs / (1000 * 60 * 60)); // rounded minimum to 0.1 hour
      
      const logRef = doc(db, 'employeeCheckIns', logDocId);
      await updateDoc(logRef, {
        checkOutTime: timeStr,
        checkOutDate: now,
        totalHours: parseFloat(totalHoursCalculated.toFixed(2)),
        status: 'checked_out',
        updatedAt: now
      });

      toast.success(`تم تسجيل الانصراف بنجاح! إجمالي ساعات العمل اليوم: ${totalHoursCalculated.toFixed(2)} ساعة.`);
      await fetchLogsAndStats();
    } catch (e) {
      console.error("Error on check out:", e);
      toast.error('فشل في تسجيل الانصراف السحابي');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between" dir="rtl">
      
      {/* Top Header */}
      <header className="bg-slate-800 border-b border-slate-700/50 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <Clock className="h-6 w-6 text-emerald-400 animate-pulse" />
          <div>
            <h1 className="text-base font-black tracking-tight text-white">بوابة الموظف الذكية</h1>
            <p className="text-[10px] text-slate-400 font-bold">تسجيل الحضور والانصراف السحابي</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onBackToAdmin}
            className="text-xs text-slate-300 hover:text-white hover:bg-slate-700 h-9 rounded-xl font-bold px-3 gap-1 cursor-pointer border border-slate-700"
          >
            <ChevronLeft className="h-4 w-4" />
            النظام الرئيسي
          </Button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-md w-full mx-auto p-6 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {!session ? (
            /* Login Form */
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="space-y-2 text-center">
                <div className="bg-slate-800 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-slate-700/50">
                  <Smartphone className="h-8 w-8 text-emerald-400" />
                </div>
                <h2 className="text-xl font-black text-white">تسجيل دخول بوابة موظف</h2>
                <p className="text-xs text-slate-400 leading-relaxed px-4">
                  أدخل الرموز التي شاركها معك المدير لدخول لوحة الحضور والانصراف المخصصة لك.
                </p>
              </div>

              <Card className="bg-slate-800/80 border-slate-700 rounded-3xl p-6 shadow-xl relative overflow-hidden backdrop-blur-sm">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -mr-16 -mt-16" />
                <CardContent className="p-0">
                  <form onSubmit={handleLogin} className="space-y-4">
                    
                    <div className="space-y-1.5 text-right">
                      <Label className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-emerald-400" />
                        معرف الصيدلية (Pharmacy ID)
                      </Label>
                      <Input 
                        placeholder="أدخل معرف الصيدلية الخاص بالمدير"
                        value={pharmacyIdInput}
                        onChange={e => setPharmacyIdInput(e.target.value)}
                        className="bg-slate-900 border-slate-700 text-white rounded-xl h-11 text-xs font-mono tracking-tight text-center"
                        required
                      />
                    </div>

                    <div className="space-y-1.5 text-right">
                      <Label className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-emerald-400" />
                        معرف الموظف (Employee ID)
                      </Label>
                      <Input 
                        placeholder="أدخل معرف الموظف الخاص بك"
                        value={employeeIdInput}
                        onChange={e => setEmployeeIdInput(e.target.value)}
                        className="bg-slate-900 border-slate-700 text-white rounded-xl h-11 text-xs font-mono tracking-tight text-center"
                        required
                      />
                    </div>

                    <Button 
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black h-11 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 mt-2 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                      دخول البوابة
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            /* Portal Dashboard */
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              {/* Employee & Pharmacy Banner */}
              <div className="bg-slate-800 rounded-3xl p-5 border border-slate-700/50 relative overflow-hidden flex items-center justify-between shadow-lg">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-2xl -mr-12 -mt-12" />
                <div className="space-y-1 relative z-10 text-right">
                  <div className="text-[10px] bg-slate-700 text-slate-300 rounded px-1.5 py-0.5 w-fit font-bold mb-1.5">
                    {session.pharmacyName}
                  </div>
                  <h3 className="text-lg font-black text-white flex items-center gap-1.5">
                    <User className="h-5 w-5 text-emerald-400" />
                    {session.employeeName}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono tracking-wider">
                    ID: {session.employeeId}
                  </p>
                </div>

                <Button 
                  onClick={handleLogout}
                  variant="ghost" 
                  size="icon" 
                  title="تسجيل الخروج"
                  className="bg-slate-700 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 h-10 w-10 rounded-2xl cursor-pointer shadow-sm"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>

              {/* Today's Status Card */}
              <Card className="bg-slate-800 border-slate-700 rounded-3xl shadow-xl overflow-hidden text-center relative">
                <div className="p-6 space-y-5">
                  <div className="flex flex-col items-center">
                    <div className="text-slate-400 text-xs font-bold flex items-center gap-2 mb-1">
                      <Calendar className="h-4 w-4 text-emerald-400" />
                      سجل اليوم: {safeFormatDate(new Date(), 'eeee، d MMMM yyyy')}
                    </div>
                    
                    <div className="mt-2">
                      {todayLog ? (
                        todayLog.status === 'checked_in' ? (
                          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-black">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            حالة اليوم: حاضر حالياً بانتظار الانصراف
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-xs font-black">
                            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                            حالة اليوم: تم تسجيل الانصراف بأمان
                          </div>
                        )
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-slate-700 text-slate-300 rounded-full text-xs font-bold">
                          <AlertCircle className="w-4 h-4 text-slate-400" />
                          لم تسجل حضور بعد اليوم
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Twin Big Punch-in / Punch-out Buttons */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Punch In */}
                    <button
                      onClick={handleCheckIn}
                      disabled={isLoading || isSyncing || (todayLog && todayLog.status === 'checked_in')}
                      className={`h-24 rounded-2xl flex flex-col justify-center items-center gap-2 font-black transition-all border outline-none cursor-pointer ${
                        todayLog && todayLog.status === 'checked_in'
                          ? 'bg-slate-700/30 border-slate-700 text-slate-500 cursor-not-allowed opacity-50'
                          : 'bg-emerald-500 text-emerald-950 border-emerald-400 hover:bg-emerald-400 active:scale-95 shadow-lg shadow-emerald-500/15'
                      }`}
                    >
                      <LogIn className="h-6 w-6" />
                      <span className="text-sm">تسجيل حضور</span>
                    </button>

                    {/* Punch Out */}
                    <button
                      onClick={handleCheckOut}
                      disabled={isLoading || isSyncing || !todayLog || todayLog.status !== 'checked_in'}
                      className={`h-24 rounded-2xl flex flex-col justify-center items-center gap-2 font-black transition-all border outline-none cursor-pointer ${
                        !todayLog || todayLog.status !== 'checked_in'
                          ? 'bg-slate-700/30 border-slate-700 text-slate-500 cursor-not-allowed opacity-50'
                          : 'bg-amber-500 text-amber-950 border-amber-400 hover:bg-amber-400 active:scale-95 shadow-lg shadow-amber-500/15'
                      }`}
                    >
                      <LogOut className="h-6 w-6" />
                      <span className="text-sm">تسجيل انصراف</span>
                    </button>
                  </div>

                  {/* Log Details Display */}
                  {(todayLog) && (
                    <div className="bg-slate-900/50 p-4 border border-slate-700/40 rounded-2xl space-y-2.5 text-right text-xs">
                      {todayLog.checkInTime && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">وقت الحضور:</span>
                          <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-white font-bold">{todayLog.checkInTime}</span>
                        </div>
                      )}
                      {todayLog.checkOutTime && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">وقت الانصراف:</span>
                          <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-white font-bold">{todayLog.checkOutTime}</span>
                        </div>
                      )}
                      {todayLog.totalHours !== undefined && (
                        <div className="flex justify-between items-center border-t border-slate-800/60 pt-2 mt-2">
                          <span className="text-slate-400 font-bold">إجمالي ساعات العمل لليوم:</span>
                          <span className="font-mono text-emerald-400 font-black text-sm">{todayLog.totalHours} ساعة</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              {/* Monthly stats for employee */}
              <Card className="bg-slate-800 border-slate-700 rounded-3xl shadow-xl overflow-hidden p-5">
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider mb-4 border-b border-slate-700 pb-2 flex items-center gap-2">
                  <CalendarRange className="h-4 w-4 text-emerald-400" />
                  ملخص أدائك لشهر {new Date().getMonth() + 1}
                </h4>

                {isSyncing ? (
                  <div className="flex items-center justify-center p-4">
                    <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-900/40 border border-slate-700/30 rounded-2xl p-3 text-center">
                      <div className="text-[10px] font-bold text-slate-400 mb-1">الأيام الحاضرة</div>
                      <div className="text-lg font-black font-mono text-emerald-400">{monthlyStats.attendedDays}</div>
                    </div>
                    <div className="bg-slate-900/40 border border-slate-700/30 rounded-2xl p-3 text-center">
                      <div className="text-[10px] font-bold text-slate-400 mb-1">الغياب</div>
                      <div className="text-lg font-black font-mono text-rose-400">{monthlyStats.absentDays}</div>
                    </div>
                    <div className="bg-slate-900/40 border border-slate-700/30 rounded-2xl p-3 text-center">
                      <div className="text-[10px] font-bold text-slate-400 mb-1">ساعات الشهر</div>
                      <div className="text-lg font-black font-mono text-blue-400">{monthlyStats.totalHours}</div>
                    </div>
                  </div>
                )}
              </Card>

              {/* Status footer with device platform */}
              <div className="text-center text-[10px] text-slate-500 font-bold">
                متصل سحابياً من {getUserAgentInfo()} • بوابة موظف مستقلة بموجب pharmacyId
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer info (no financial links) */}
      <footer className="py-4 text-center border-t border-slate-800 bg-slate-850 text-[10px] text-slate-500 font-bold">
        الحقوق محفوظة © صيدليتي الذكية للربط السحابي {new Date().getFullYear()}
      </footer>
    </div>
  );
};
