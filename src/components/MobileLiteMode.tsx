import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Bell, 
  Phone, 
  Plus, 
  ArrowLeftRight, 
  Coins, 
  TrendingUp, 
  Search, 
  ChevronRight, 
  Monitor,
  AlertTriangle,
  UserCheck,
  Building,
  CheckCircle,
  Clock,
  DollarSign,
  ArrowDownCircle
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardHeader, CardContent, CardTitle } from './ui/card';
import { Input } from './ui/input';

interface Entity {
  id?: string;
  name: string;
  type: string;
  phone?: string;
  balance?: number;
  [key: string]: any;
}

interface LedgerEntry {
  id?: string;
  operationType: string;
  invoiceNumber?: string;
  accountId?: string;
  entityName?: string;
  netAmount?: number;
  amount: number;
  paidAmount?: number;
  remainingAmount?: number;
  paymentStatus?: string;
  date: any;
  createdAt?: any;
  isDeleted?: boolean;
  [key: string]: any;
}

interface Notification {
  id?: string;
  title: string;
  body: string;
  createdAt: any;
  isRead?: boolean;
  type?: string;
  [key: string]: any;
}

interface MobileLiteModeProps {
  entities: Entity[];
  allLedgerEntries: LedgerEntry[];
  notifications: Notification[];
  appUser: any;
  stats: any;
  onOpenFullDesktopMode: () => void;
  setViewingEntityDetail: (entity: Entity | null) => void;
  setViewingInvoice: (invoice: LedgerEntry | null) => void;
  setActiveTab: (tab: string) => void;
  setIsAddEntityOpen: (open: boolean) => void;
  setIsAddInvoiceOpen: (open: boolean) => void;
  setIsAddPaymentOpen: (open: boolean) => void;
  setSelectedEntity: (entity: Entity | null) => void;
  setPaymentMode: (mode: 'normal' | 'invoice') => void;
  setIsAddRevenueOpen?: (open: boolean) => void;
  setIsAddExpenseOpen?: (open: boolean) => void;
}

const safeFormatDate = (dateVal: any): string => {
  if (!dateVal) return '';
  try {
    const d = typeof dateVal.toDate === 'function' ? dateVal.toDate() : new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('ar-IQ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '';
  }
};

const formatCurrency = (val: number | undefined): string => {
  if (val === undefined || val === null) return '0 د.ع';
  return Math.abs(val).toLocaleString('ar-IQ') + ' د.ع';
};

export const MobileLiteMode: React.FC<MobileLiteModeProps> = ({
  entities,
  allLedgerEntries,
  notifications,
  appUser,
  stats,
  onOpenFullDesktopMode,
  setViewingEntityDetail,
  setViewingInvoice,
  setActiveTab,
  setIsAddEntityOpen,
  setIsAddInvoiceOpen,
  setIsAddPaymentOpen,
  setSelectedEntity,
  setPaymentMode,
  setIsAddRevenueOpen,
  setIsAddExpenseOpen,
}) => {
  const [mobileTab, setMobileTab] = useState<'dashboard' | 'suppliers' | 'invoices' | 'notifications'>('dashboard');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'unpaid' | 'paid'>('all');

  // Filter dynamic entities (only suppliers & warehouses)
  const filteredSuppliers = useMemo(() => {
    return entities.filter(ent => {
      const matchSearch = ent.name.toLowerCase().includes(supplierSearch.toLowerCase()) || 
                          (ent.phone && ent.phone.includes(supplierSearch));
      return matchSearch;
    });
  }, [entities, supplierSearch]);

  // Extract actual invoices from list
  const invoicesList = useMemo(() => {
    return allLedgerEntries.filter(entry => entry.operationType === 'invoice' && !entry.isDeleted);
  }, [allLedgerEntries]);

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return invoicesList.filter(inv => {
      const entityName = inv.entityName || entities.find(e => e.id === inv.accountId)?.name || 'غير معروف';
      const matchSearch = (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(invoiceSearch.toLowerCase())) ||
                          entityName.toLowerCase().includes(invoiceSearch.toLowerCase());
      
      if (!matchSearch) return false;
      
      const isPaid = inv.paymentStatus === 'paid' || (inv.remainingAmount !== undefined && inv.remainingAmount <= 0);
      if (invoiceFilter === 'unpaid') return !isPaid;
      if (invoiceFilter === 'paid') return isPaid;
      return true;
    });
  }, [invoicesList, entities, invoiceSearch, invoiceFilter]);

  const activeNotificationsCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  // Supplier & Debt metrics calculated from entities
  const supplierMetrics = useMemo(() => {
    const activeSuppliers = entities.filter(e => e.type === 'company' || e.type === 'supplier');
    const totalCount = activeSuppliers.length || entities.length;
    
    const debts = entities.map(e => e.balance || 0).filter(b => b > 0);
    const maxDebt = debts.length > 0 ? Math.max(...debts) : 0;
    const minDebt = debts.length > 0 ? Math.min(...debts) : 0;

    return {
      totalCount,
      maxDebt,
      minDebt
    };
  }, [entities]);

  // Last 10 invoices
  const last10Invoices = useMemo(() => {
    return invoicesList.slice(0, 10);
  }, [invoicesList]);

  // Generate dynamic alerts based on live data
  const dynamicAlerts = useMemo(() => {
    const alerts: Array<{ id: string; type: 'debt' | 'stock' | 'overdue'; title: string; desc: string; severity: 'critical' | 'warning' }> = [];

    // 1. Debts due (ديون مستحقة)
    const highDebtSuppliers = entities.filter(e => (e.balance || 0) > 0);
    if (highDebtSuppliers.length > 0) {
      const topSupplier = highDebtSuppliers.reduce((prev, current) => ((prev.balance || 0) > (current.balance || 0)) ? prev : current);
      alerts.push({
        id: 'debt_alert',
        type: 'debt',
        title: 'ديون مستحقة على الصيدلية',
        desc: `المورد ${topSupplier.name} لديه مديونية مستحقة بقيمة ${formatCurrency(topSupplier.balance)}`,
        severity: 'critical'
      });
    }

    // 2. Out of stock / deficiency notifications (نقص مخزون)
    const stockNotifications = notifications.filter(n => n.title.includes('مخزون') || n.body.includes('مخزون') || n.title.includes('نقص') || n.body.includes('نقص'));
    if (stockNotifications.length > 0) {
      alerts.push({
        id: 'stock_alert_1',
        type: 'stock',
        title: stockNotifications[0].title,
        desc: stockNotifications[0].body,
        severity: 'warning'
      });
    } else {
      alerts.push({
        id: 'stock_alert_none',
        type: 'stock',
        title: 'تنبيه مستويات المخزون',
        desc: 'لا توجد أدوية نفدت بالكامل اليوم؛ كافة الأصناف ضمن حدود كفاءة المخزون الأمنية.',
        severity: 'warning'
      });
    }

    // 3. Overdue invoices (فواتير متأخرة)
    const overdueInvoicesCount = invoicesList.filter(inv => {
      const isPaid = inv.paymentStatus === 'paid' || (inv.remainingAmount !== undefined && inv.remainingAmount <= 0);
      return !isPaid;
    }).length;

    if (overdueInvoicesCount > 0) {
      alerts.push({
        id: 'overdue_alert',
        type: 'overdue',
        title: 'فواتير متأخرة الدفع',
        desc: `يوجد عدد ${overdueInvoicesCount} فواتير شراء مستحقة للموردين لم يتم تسديدها بالكامل.`,
        severity: 'critical'
      });
    }

    return alerts;
  }, [entities, notifications, invoicesList]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans select-none" dir="rtl">
      
      {/* Sleek Premium Mobile Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-lg border-b border-slate-800/60 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary/20 text-primary p-2 rounded-xl">
            <LayoutDashboard className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">واجهة الجوال المبسطة</span>
            <h1 className="text-sm font-black text-slate-100">صيدليتي الذكية</h1>
          </div>
        </div>

        {/* Dynamic Launch Full Mode Button */}
        <Button 
          variant="outline"
          size="sm"
          onClick={onOpenFullDesktopMode}
          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs font-black rounded-lg gap-1.5 h-9"
        >
          <Monitor className="h-3.5 w-3.5 animate-pulse" />
          فتح النسخة الكاملة
        </Button>
      </header>

      {/* Main Container */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-4">
        
        {/* TAB 1: QUICK DASHBOARD */}
        {mobileTab === 'dashboard' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            {/* User Greeting Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-900/30 to-emerald-950/30 border border-slate-800 p-5">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full" />
              <div className="relative z-10 space-y-2">
                <span className="text-xs text-emerald-400 font-bold">مرحباً بك دكتور</span>
                <h2 className="text-lg font-black text-white">{appUser?.fullName || 'مسؤول الصيدلية'}</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  هذا هو وضع الإدارة السريع للجوال. يمكنك تصفح الموردين وتتبع الفواتير والاطلاع على التنبيهات بسهولة.
                </p>
              <div className="pt-2 flex flex-wrap gap-2">
                <div className="inline-flex items-center rounded-full bg-slate-800 text-slate-300 font-bold text-[10px] px-2.5 py-0.5 border border-slate-750">
                  الفرع: {appUser?.branchName || 'الفرع الرئيسي'}
                </div>
                <div className="inline-flex items-center rounded-full bg-emerald-500/10 text-emerald-400 font-black text-[10px] px-2.5 py-0.5 border border-emerald-500/20">
                  نشط ومتصل بالخادم سحابياً
                </div>
              </div>
              </div>
            </div>

            {/* Quick Actions Bento */}
            <h3 className="text-xs uppercase font-black tracking-wider text-slate-400 mt-6 mr-1">الإجراءات السريعة</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={() => {
                  setSelectedEntity(null);
                  setIsAddInvoiceOpen(true);
                }} 
                className="h-16 bg-slate-900 border border-slate-850 hover:bg-slate-850/80 rounded-2xl flex flex-col justify-center items-center gap-1.5 transition-all text-emerald-400 shadow-md active:scale-95"
              >
                <Plus className="h-5 w-5" />
                <span className="text-xs font-black text-slate-200">إضافة فاتورة شراء</span>
              </Button>

              <Button 
                onClick={() => {
                  setSelectedEntity(null);
                  setPaymentMode('normal');
                  setIsAddPaymentOpen(true);
                }} 
                className="h-16 bg-slate-900 border border-slate-850 hover:bg-slate-850/80 rounded-2xl flex flex-col justify-center items-center gap-1.5 transition-all text-blue-400 shadow-md active:scale-95"
              >
                <Coins className="h-5 w-5" />
                <span className="text-xs font-black text-slate-200">تسجيل سداد مالي</span>
              </Button>

              <Button 
                onClick={() => setIsAddRevenueOpen?.(true)} 
                className="h-16 bg-slate-900 border border-slate-850 hover:bg-slate-850/80 rounded-2xl flex flex-col justify-center items-center gap-1.5 transition-all text-teal-400 shadow-md active:scale-95"
              >
                <DollarSign className="h-5 w-5 text-teal-400" />
                <span className="text-xs font-black text-slate-200">إضافة وارد يومي</span>
              </Button>

              <Button 
                onClick={() => setIsAddExpenseOpen?.(true)} 
                className="h-16 bg-slate-900 border border-slate-850 hover:bg-slate-850/80 rounded-2xl flex flex-col justify-center items-center gap-1.5 transition-all text-rose-400 shadow-md active:scale-95"
              >
                <ArrowDownCircle className="h-5 w-5 text-rose-400" />
                <span className="text-xs font-black text-slate-200">إضافة مصروف عام</span>
              </Button>

              <Button 
                onClick={() => setIsAddEntityOpen(true)} 
                className="h-16 bg-slate-900 border border-slate-850 hover:bg-slate-850/80 rounded-2xl col-span-2 flex justify-center items-center gap-2.5 transition-all text-amber-400 shadow-md active:scale-95"
              >
                <Users className="h-5 w-5" />
                <span className="text-xs font-black text-slate-200">إضافة مورد أو شركة جديدة</span>
              </Button>
            </div>

            {/* 1. لوحة مؤشرات سريعة */}
            <h3 className="text-xs uppercase font-black tracking-wider text-slate-400 mt-6 mr-1">لوحة الحسابات والمؤشرات السريعة اليومية</h3>
            <div className="grid grid-cols-2 gap-3">
              
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between h-24">
                <span className="text-[11px] text-slate-400 font-bold">إجمالي المبيعات اليوم</span>
                <div className="space-y-0.5">
                  <div className="text-sm font-black text-emerald-400 font-mono tracking-wide">
                    {formatCurrency(stats?.dailyRevenue || 0)}
                  </div>
                  <span className="text-[9px] text-slate-500 font-bold">متحصلات فواتير وسداد اليوم</span>
                </div>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between h-24">
                <span className="text-[11px] text-slate-400 font-bold">إجمالي المصروفات اليوم</span>
                <div className="space-y-0.5">
                  <div className="text-sm font-black text-rose-400 font-mono tracking-wide">
                    {formatCurrency(stats?.dailyExpenses || 0)}
                  </div>
                  <span className="text-[9px] text-slate-500 font-bold">مصاريف ورواتب وتلفيات اليوم</span>
                </div>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between h-24">
                <span className="text-[11px] text-slate-400 font-bold">صافي ربح اليوم</span>
                <div className="space-y-0.5">
                  <div className={`text-sm font-black font-mono tracking-wide ${(stats?.dailyNetProfit || 0) >= 0 ? 'text-teal-400' : 'text-rose-400'}`}>
                    {formatCurrency(stats?.dailyNetProfit || 0)}
                  </div>
                  <span className="text-[9px] text-slate-500 font-bold">صافي نتيجة مبيعات اليوم</span>
                </div>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between h-24">
                <span className="text-[11px] text-slate-400 font-bold">الكاش الحالي في الصندوق</span>
                <div className="space-y-0.5">
                  <div className="text-sm font-black text-amber-400 font-mono tracking-wide">
                    {formatCurrency(stats?.cashBalance || 0)}
                  </div>
                  <span className="text-[9px] text-slate-500 font-bold">رصيد خزانة الصيدلية الكلي</span>
                </div>
              </div>

            </div>

            {/* 2. الموردين والمذاخر */}
            <h3 className="text-xs uppercase font-black tracking-wider text-slate-400 mt-6 mr-1">الموردين والمذاخر المجهزة</h3>
            <div className="grid grid-cols-3 gap-2.5">
              
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-center items-center text-center gap-1.5">
                <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                  <Building className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block">عدد الموردين</span>
                  <span className="text-sm font-black text-white font-mono">{supplierMetrics.totalCount}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-center items-center text-center gap-1.5">
                <div className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block">أعلى دين</span>
                  <span className="text-xs font-black text-rose-400 font-mono">{formatCurrency(supplierMetrics.maxDebt).split(' ')[0]}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-center items-center text-center gap-1.5">
                <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <TrendingUp className="h-4 w-4 rotate-180" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block">أقل دين</span>
                  <span className="text-xs font-black text-emerald-400 font-mono">{formatCurrency(supplierMetrics.minDebt).split(' ')[0]}</span>
                </div>
              </div>

            </div>

            {/* 3. التنبيهات المهمة (ديون مستحقة، نقص مخزون، فواتير متأخرة) */}
            <h3 className="text-xs uppercase font-black tracking-wider text-slate-400 mt-6 mr-1">التنبيهات المهمة المكتشفة بالخادم</h3>
            <div className="space-y-2.5">
              {dynamicAlerts.map((alert) => {
                const isCritical = alert.severity === 'critical';
                const IconComp = alert.type === 'debt' ? Coins : alert.type === 'stock' ? AlertTriangle : Clock;
                return (
                  <div 
                    key={alert.id}
                    className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-colors ${
                      isCritical 
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' 
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${isCritical ? 'bg-rose-500/15' : 'bg-amber-500/15'}`}>
                      <IconComp className="h-4.5 w-4.5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-white">{alert.title}</h4>
                      <p className="text-[11px] leading-relaxed font-bold text-slate-400">{alert.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 4. الفواتير المختصرة (آخر 10 فواتير) */}
            <div className="pt-2 flex items-center justify-between mt-4">
              <h3 className="text-xs uppercase font-black tracking-wider text-slate-400 mr-1">آخر فواتير الشراء المختصرة (الـ 10 الأخيرة)</h3>
              <div className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/10 shrink-0">
                مبيعات اليوم: {formatCurrency(stats?.dailyRevenue || 0)}
              </div>
            </div>

            <div className="space-y-3">
              {last10Invoices.map((inv) => {
                const entityName = inv.entityName || entities.find(e => e.id === inv.accountId)?.name || 'غير معروف';
                const total = inv.netAmount || inv.amount || 0;
                const paid = inv.paidAmount || 0;
                const remaining = inv.remainingAmount !== undefined ? inv.remainingAmount : (total - paid);
                const isPaid = inv.paymentStatus === 'paid' || remaining <= 0;
                
                return (
                  <Card key={inv.id} className="bg-slate-900 border-slate-850 rounded-2xl overflow-hidden shadow-sm hover:border-slate-800 transition-all">
                    <div className="p-3 flex items-center justify-between gap-3 border-b border-slate-850/60">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-black text-white">رقم: {inv.invoiceNumber || 'عامة'}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 font-bold rounded-md ${isPaid ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' : 'bg-rose-500/10 text-rose-400 border border-rose-500/10'}`}>
                            {isPaid ? 'مكتملة' : 'متبقي'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold mt-0.5">المورد: {entityName}</div>
                      </div>
                      <div className="text-left">
                        <span className="text-[9px] text-slate-500 block font-bold">{safeFormatDate(inv.date || inv.createdAt)}</span>
                        <span className="text-xs font-black font-mono text-white">{formatCurrency(total)}</span>
                      </div>
                    </div>

                    <div className="p-2 bg-slate-900/40 grid grid-cols-2 gap-2 text-[10px] border-b border-slate-850/30">
                      <div className="text-slate-400">سدد: <span className="font-mono font-black text-emerald-400">{formatCurrency(paid)}</span></div>
                      <div className="text-left text-slate-400">باقي: <span className="font-mono font-black text-rose-400">{formatCurrency(remaining)}</span></div>
                    </div>

                    <button 
                      onClick={() => {
                        setViewingInvoice(inv);
                        setActiveTab('invoice-details');
                      }}
                      className="w-full py-1.5 bg-slate-900/80 hover:bg-slate-850 text-[10px] font-bold text-indigo-400 text-center flex items-center justify-center gap-1 border-t border-slate-850/20 active:bg-slate-800"
                    >
                      <FileText className="h-3 w-3" />
                      عرض كشف تفاصيل الفاتورة وحفظها PDF
                    </button>
                  </Card>
                );
              })}

              {last10Invoices.length === 0 && (
                <div className="py-12 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
                  <FileText className="h-8 w-8 mx-auto opacity-30 mb-2" />
                  <p className="font-bold text-xs">لا يوجد أي فواتير مسجلة بالنظام حالياً</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: SUPPLIERS LIST */}
        {mobileTab === 'suppliers' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            <div className="flex flex-col gap-2">
              <h2 className="text-base font-black text-white">إدارة الموردين والمذاخر</h2>
              <p className="text-xs text-slate-400">تتبع الحسابات والاتصال المباشر وتسجيل السدادات المالية.</p>
            </div>

            {/* Suppliers Search input */}
            <div className="relative">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input 
                className="bg-slate-900 border-slate-800 text-slate-100 h-11 pr-10 rounded-xl text-sm"
                placeholder="ابحث عن مورد بالاسم أو الهاتف..."
                value={supplierSearch}
                onChange={e => setSupplierSearch(e.target.value)}
              />
            </div>

            {/* Suppliers List */}
            <div className="space-y-3">
              {filteredSuppliers.map((supplier) => {
                const balance = supplier.balance || 0;
                return (
                  <Card key={supplier.id} className="bg-slate-900/95 border-slate-850 rounded-2xl hover:border-slate-800 overflow-hidden shadow-md">
                    <CardHeader className="p-4 border-b border-slate-850 flex flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-indigo-505/10 bg-slate-800 flex items-center justify-center text-slate-100 font-extrabold text-sm">
                          {supplier.name ? supplier.name.charAt(0) : 'م'}
                        </div>
                        <div>
                          <CardTitle className="text-sm font-black text-slate-100 leading-tight">{supplier.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-slate-400">
                              {supplier.type === 'company' ? 'شركة مجهزة' : 'مذخر أدوية'}
                            </span>
                            {supplier.phone && (
                              <span className="text-[10px] text-slate-500 font-mono font-bold">{supplier.phone}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-left">
                        <span className="text-[10px] text-slate-400 block font-bold">الحساب المالي</span>
                        <span className={`text-xs font-black font-mono block mt-0.5 ${balance > 0 ? 'text-rose-400' : balance < 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {formatCurrency(balance)}
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="p-3 bg-slate-900/60 flex items-center gap-2">
                      {/* Connection button */}
                      {supplier.phone ? (
                        <a 
                          href={`tel:${supplier.phone}`}
                          className="flex-1 h-9 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-850 flex items-center justify-center gap-2 text-xs font-black text-emerald-400"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          اتصال مباشر
                        </a>
                      ) : (
                        <div className="flex-1 h-9 rounded-xl border border-dashed border-slate-800 flex items-center justify-center text-[10px] text-slate-500 font-bold">
                          لا يوجد هاتف
                        </div>
                      )}
                      
                      {/* Shortcut Payment Button */}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedEntity(supplier);
                          setPaymentMode('normal');
                          setIsAddPaymentOpen(true);
                        }}
                        className="flex-1 h-9 rounded-xl border border-slate-800 hover:border-blue-500/20 text-blue-400 text-xs font-black gap-1.5"
                      >
                        <Coins className="h-3.5 w-3.5" />
                        سداد سريع
                      </Button>

                      {/* Supplier Detail Button */}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setViewingEntityDetail(supplier);
                        }}
                        className="flex-1 h-9 bg-primary/10 hover:bg-primary/20 text-emerald-400 font-black rounded-xl text-xs flex justify-center items-center gap-1"
                      >
                        كشف حساب
                        <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}

              {filteredSuppliers.length === 0 && (
                <div className="py-16 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
                  <Users className="h-10 w-10 mx-auto opacity-30 mb-3" />
                  <p className="font-bold text-sm">لم يتم العثور على أي مورد مطبق للفلتر</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 3: BRIEF INVOICES */}
        {mobileTab === 'invoices' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            <div className="flex flex-col gap-2">
              <h2 className="text-base font-black text-white">الفواتير وقوائم الشراء المختصرة</h2>
              <p className="text-xs text-slate-400">تصفح أحدث فواتير المشتريات الملتزم بها وحالة سدادها المالي.</p>
            </div>

            {/* Invoices Search & quick Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input 
                  className="bg-slate-900 border-slate-800 text-slate-100 h-11 pr-10 rounded-xl text-sm"
                  placeholder="ابحث بقائمة الشراء أو المورد..."
                  value={invoiceSearch}
                  onChange={e => setInvoiceSearch(e.target.value)}
                />
              </div>

              {/* Invoices quick filter tabs */}
              <div className="flex gap-2 bg-slate-900/60 p-1 rounded-xl border border-slate-850">
                <button
                  onClick={() => setInvoiceFilter('all')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${invoiceFilter === 'all' ? 'bg-slate-800 text-white font-black' : 'text-slate-400'}`}
                >
                  الكل ({invoicesList.length})
                </button>
                <button
                  onClick={() => setInvoiceFilter('unpaid')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${invoiceFilter === 'unpaid' ? 'bg-rose-500/10 text-rose-400 font-black' : 'text-slate-400'}`}
                >
                  المستحقة ({invoicesList.filter(i => (i.remainingAmount || 0) > 0).length})
                </button>
                <button
                  onClick={() => setInvoiceFilter('paid')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${invoiceFilter === 'paid' ? 'bg-emerald-500/10 text-emerald-400 font-black' : 'text-slate-400'}`}
                >
                  المسددة ({invoicesList.filter(i => (i.remainingAmount || 0) <= 0).length})
                </button>
              </div>
            </div>

            {/* Quick Invoices Grid */}
            <div className="space-y-3">
              {filteredInvoices.slice(0, 40).map((inv) => {
                const entityName = inv.entityName || entities.find(e => e.id === inv.accountId)?.name || 'غير معروف';
                const total = inv.netAmount || inv.amount || 0;
                const paid = inv.paidAmount || 0;
                const remaining = inv.remainingAmount || 0;
                const isPaid = remaining <= 0;

                return (
                  <Card key={inv.id} className="bg-slate-900/95 border-slate-850 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-850 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-100">رقم الفاتورة: {inv.invoiceNumber || 'عامة'}</span>
                          <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-bold text-[10px] border ${isPaid ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/10'}`}>
                            {isPaid ? 'مكتملة السداد' : 'غير مسددة'}
                          </div>
                        </div>
                        <div className="text-xs font-bold text-slate-400">
                          المجهز: {entityName}
                        </div>
                      </div>

                      <div className="text-left space-y-0.5">
                        <span className="text-[10px] text-slate-500 block font-bold">{safeFormatDate(inv.date || inv.createdAt)}</span>
                        <span className="text-sm font-black font-mono block text-white">{formatCurrency(total)}</span>
                      </div>
                    </div>

                    <div className="px-4 py-2.5 bg-slate-900/40 text-[11px] grid grid-cols-2 gap-4 border-b border-slate-850/40">
                      <div>
                        <span className="text-slate-500 block font-bold">المسدد</span>
                        <span className="text-emerald-400 font-black font-mono block mt-0.5">{formatCurrency(paid)}</span>
                      </div>
                      <div className="text-left">
                        <span className="text-slate-500 block font-bold">المتبقي المطلوب</span>
                        <span className="text-rose-400 font-black font-mono block mt-0.5">{formatCurrency(remaining)}</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-900/60 flex gap-2">
                      {/* View Button */}
                      <Button 
                        onClick={() => {
                          setViewingInvoice(inv);
                          setActiveTab('invoice-details');
                        }}
                        className="w-full h-8.5 bg-slate-800 hover:bg-slate-750 text-slate-100 text-xs font-black rounded-lg gap-1.5 flex items-center justify-center cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5 text-blue-400" />
                        عرض وحفظ التفاصيل
                      </Button>

                      {/* Settle Invoice Shortcut */}
                      {!isPaid && (
                        <Button 
                          onClick={() => {
                            setSelectedEntity(entities.find(e => e.id === inv.accountId) || null);
                            setViewingInvoice(inv);
                            setPaymentMode('invoice');
                            setIsAddPaymentOpen(true);
                          }}
                          className="w-full h-8.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-black rounded-lg gap-1.5 flex items-center justify-center cursor-pointer"
                        >
                          <Coins className="h-3.5 w-3.5 animate-bounce" />
                          تسديد الفاتورة
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}

              {filteredInvoices.length === 0 && (
                <div className="py-16 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
                  <FileText className="h-10 w-10 mx-auto opacity-30 mb-3" />
                  <p className="font-bold text-sm">لا يوجد قوائم شراء مطابقة للبحث</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 4: ALERTS & NOTIFICATIONS */}
        {mobileTab === 'notifications' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            <div className="flex flex-col gap-2">
              <h2 className="text-base font-black text-white">تنبيهات النظام المعلقة</h2>
              <p className="text-xs text-slate-400">تنبيهات تلقائية حول تواريخ استحقاق الفواتير والعمليات الهامة بالصيدلية.</p>
            </div>

            <div className="space-y-3">
              {notifications.map((notif) => {
                const isUrgent = notif.type === 'critical' || notif.title.includes('عاجل') || notif.title.includes('تأخير');
                return (
                  <Card key={notif.id} className={`bg-slate-900 border-slate-850 rounded-2xl overflow-hidden shadow-sm relative ${notif.isRead ? 'opacity-70' : ''}`}>
                    <div className={`absolute top-0 bottom-0 right-0 w-1.5 ${isUrgent ? 'bg-rose-500' : 'bg-amber-400'}`} />
                    
                    <div className="p-4 pr-6 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2">
                          {isUrgent ? (
                            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                          ) : (
                            <Bell className="h-4 w-4 text-amber-400 shrink-0" />
                          )}
                          <h4 className="text-xs font-black text-white">{notif.title}</h4>
                        </div>
                        <span className="text-[9px] text-slate-500 font-mono font-bold shrink-0">{safeFormatDate(notif.createdAt)}</span>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed font-bold">{notif.body}</p>
                    </div>
                  </Card>
                );
              })}

              {notifications.length === 0 && (
                <div className="py-16 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
                  <Bell className="h-10 w-10 mx-auto opacity-30 mb-3" />
                  <p className="font-bold text-sm">لا يوجد أي تنبيهات حالية</p>
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* Sleek Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800/80 p-1 flex items-center justify-around drop-shadow-[0_-5px_15px_rgba(0,0,0,0.5)] h-16">
        
        {/* Dashboard Tab */}
        <button
          onClick={() => setMobileTab('dashboard')}
          className={`flex-1 flex flex-col items-center justify-center gap-1.5 transition-all h-full ${mobileTab === 'dashboard' ? 'text-emerald-400 scale-105 font-black' : 'text-slate-400'}`}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[10px]">الرئيسية</span>
        </button>

        {/* Suppliers Tab */}
        <button
          onClick={() => setMobileTab('suppliers')}
          className={`flex-1 flex flex-col items-center justify-center gap-1.5 transition-all h-full ${mobileTab === 'suppliers' ? 'text-emerald-400 scale-105 font-black' : 'text-slate-400'}`}
        >
          <Users className="h-5 w-5" />
          <span className="text-[10px]">الموردون</span>
        </button>

        {/* Invoices Tab */}
        <button
          onClick={() => setMobileTab('invoices')}
          className={`flex-1 flex flex-col items-center justify-center gap-1.5 transition-all h-full ${mobileTab === 'invoices' ? 'text-emerald-400 scale-105 font-black' : 'text-slate-400'}`}
        >
          <FileText className="h-5 w-5" />
          <span className="text-[10px]">الفواتير</span>
        </button>

        {/* Notifications Tab */}
        <button
          onClick={() => setMobileTab('notifications')}
          className={`flex-1 flex flex-col items-center justify-center gap-1.5 transition-all h-full relative ${mobileTab === 'notifications' ? 'text-emerald-400 scale-105 font-black' : 'text-slate-400'}`}
        >
          <Bell className="h-5 w-5" />
          {activeNotificationsCount > 0 && (
            <span className="absolute top-1.5 right-6 bg-rose-500 text-white font-extrabold text-[8px] rounded-full px-1.5 py-0.5 scale-90 border border-slate-900 animate-pulse">
              {activeNotificationsCount}
            </span>
          )}
          <span className="text-[10px]">التنبيهات</span>
        </button>

      </nav>
    </div>
  );
};
