import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Receipt, 
  AlertTriangle,
  Calendar,
  Filter,
  ArrowDownCircle,
  ArrowUpCircle,
  PieChart,
  BarChart3,
  CalendarDays,
  FileText,
  Building2,
  Users,
  ArrowLeftRight,
  Layers,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Printer,
  Clock,
  ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { calculateReportsFromRecords, ReportResult } from '../services/reportCalculator';
import { formatNumberWithCommas, toValidDate, safeFormatDate } from '../lib/formatters';
import { startOfMonth, endOfMonth, startOfDay, endOfDay, subDays, subMonths, format } from 'date-fns';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PaymentsReportSystem } from './PaymentsReportSystem';

interface ReportsSystemProps {
  transactions: any[];
  ledgerEntries: any[];
  historicalRecords: any[];
  expiredLosses: any[];
  openingCash: any[];
  entities: any[];
  attendance: any[];
  customerDebts: any[];
  loans: any[];
  branches: any[];
  currentBranchId: string | null;
  supplierOpeningBalances: any[];
}

export const ReportsSystem: React.FC<ReportsSystemProps> = ({
  transactions,
  ledgerEntries,
  historicalRecords,
  expiredLosses,
  openingCash,
  entities,
  attendance,
  customerDebts,
  loans,
  branches,
  currentBranchId,
  supplierOpeningBalances
}) => {
  const [filterType, setFilterType] = useState<'all' | 'today' | 'this_month' | 'last_month' | 'custom'>('this_month');
  const [dateRange, setDateRange] = useState({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date())
  });
  
  const [showCashDetails, setShowCashDetails] = useState(false);
  const [showProfitDetails, setShowProfitDetails] = useState(false);

  // Sub-Tabs State
  const [activeTab, setActiveTab] = useState<'financial' | 'payments'>('financial');

  // "تقرير التسديدات" State
  const [payDateRange, setPayDateRange] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [paySupplierId, setPaySupplierId] = useState<string>('all');
  const [payStatus, setPayStatus] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const handleFilterChange = (type: 'all' | 'today' | 'this_month' | 'last_month' | 'custom') => {
    setFilterType(type);
    switch (type) {
      case 'all':
        setDateRange({
          startDate: new Date(2000, 0, 1),
          endDate: new Date(2099, 11, 31)
        });
        break;
      case 'today':
        setDateRange({
          startDate: startOfDay(new Date()),
          endDate: endOfDay(new Date())
        });
        break;
      case 'this_month':
        setDateRange({
          startDate: startOfMonth(new Date()),
          endDate: endOfMonth(new Date())
        });
        break;
      case 'last_month': {
        const lastMonth = subMonths(new Date(), 1);
        setDateRange({
          startDate: startOfMonth(lastMonth),
          endDate: endOfMonth(lastMonth)
        });
        break;
      }
      case 'custom':
        // No change to range, user will pick
        break;
    }
  };

  const reportData = useMemo(() => {
    return calculateReportsFromRecords({
      allRecords: [...transactions, ...ledgerEntries],
      historicalRecords,
      expiredLosses,
      openingCash,
      entities,
      attendance,
      loans,
      filters: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        branchId: currentBranchId
      }
    });
  }, [transactions, ledgerEntries, historicalRecords, expiredLosses, openingCash, entities, attendance, customerDebts, loans, dateRange, currentBranchId]);

  // Invoices and Payments calculation for "تقرير التسديدات"
  const paymentsReportData = useMemo(() => {
    // 1. Get all ledger entries of type 'invoice' that are not deleted
    const invoices = ledgerEntries.filter(
      (entry) => entry.operationType === 'invoice' && !entry.isDeleted
    );

    // 2. Filter by branch if currentBranchId is active
    let filtered = invoices;
    if (currentBranchId) {
      filtered = filtered.filter((inv) => inv.branchId === currentBranchId);
    }

    // 3. Filter by Date range
    if (payDateRange.startDate) {
      const start = startOfDay(new Date(payDateRange.startDate));
      filtered = filtered.filter((inv) => {
        const invDate = toValidDate(inv.date);
        return invDate >= start;
      });
    }
    if (payDateRange.endDate) {
      const end = endOfDay(new Date(payDateRange.endDate));
      filtered = filtered.filter((inv) => {
        const invDate = toValidDate(inv.date);
        return invDate <= end;
      });
    }

    // 4. Filter by Supplier
    if (paySupplierId && paySupplierId !== 'all') {
      filtered = filtered.filter((inv) => inv.accountId === paySupplierId);
    }

    // 5. Filter by Payment Status
    if (payStatus && payStatus !== 'all') {
      if (payStatus === 'paid') {
        filtered = filtered.filter((inv) => inv.paymentStatus === 'paid');
      } else if (payStatus === 'unpaid') {
        filtered = filtered.filter(
          (inv) =>
            inv.paymentStatus === 'pending' ||
            inv.paymentStatus === 'unpaid' ||
            inv.paymentStatus === 'overdue' ||
            (!inv.paymentStatus && (inv.remainingAmount ?? inv.amount) > 0 && !(inv.paidAmount > 0))
        );
      } else if (payStatus === 'partial') {
        filtered = filtered.filter(
          (inv) => inv.paymentStatus === 'partial' || inv.paymentStatus === 'partially_paid'
        );
      }
    }

    // Sort by date descending
    filtered.sort((a, b) => {
      const dateA = toValidDate(a.date).getTime();
      const dateB = toValidDate(b.date).getTime();
      return dateB - dateA;
    });

    // Calculate summaries
    const totalCount = filtered.length;
    
    // Total paid count: those with 'paid' status
    const paidCount = filtered.filter((inv) => inv.paymentStatus === 'paid').length;
    
    // Total unpaid count: those with status pending/unpaid/overdue, or remainingAmount === netAmount
    const unpaidCount = filtered.filter(
      (inv) =>
        inv.paymentStatus === 'pending' ||
        inv.paymentStatus === 'unpaid' ||
        inv.paymentStatus === 'overdue' ||
        (!inv.paymentStatus && (inv.remainingAmount ?? inv.amount) > 0 && !(inv.paidAmount > 0))
    ).length;

    const sumGrossAmount = filtered.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
    const sumDiscount = filtered.reduce((sum, inv) => sum + Number(inv.discount || 0), 0);
    const sumNetAmount = filtered.reduce((sum, inv) => sum + Number(inv.netAmount ?? (inv.amount - (inv.discount || 0))), 0);
    const sumPaid = filtered.reduce((sum, inv) => sum + Number(inv.paidAmount || 0), 0);
    const sumRemaining = filtered.reduce((sum, inv) => sum + Number(inv.remainingAmount ?? (inv.netAmount ?? (inv.amount - (inv.discount || 0))) - (inv.paidAmount || 0)), 0);

    return {
      items: filtered,
      summaries: {
        totalCount,
        paidCount,
        unpaidCount,
        sumGrossAmount,
        sumDiscount,
        sumNetAmount,
        sumPaid,
        sumRemaining
      }
    };
  }, [ledgerEntries, currentBranchId, payDateRange, paySupplierId, payStatus]);

  // Extract payment operations once for extremely efficient querying
  const invoicePayments = useMemo(() => {
    return ledgerEntries.filter(
      (e) => e.operationType === 'payment' && !e.isDeleted
    );
  }, [ledgerEntries]);

  // Find date of last payment
  const getInvoiceLastPaymentDate = (invoiceId: string) => {
    const matches = invoicePayments.filter((p) => p.linkedInvoiceId === invoiceId);
    if (matches.length === 0) return 'لا يوجد';
    
    // Find the latest payment date
    const latest = matches.reduce((latestPay, currentPay) => {
      const latestTime = toValidDate(latestPay.date).getTime();
      const currentTime = toValidDate(currentPay.date).getTime();
      return currentTime > latestTime ? currentPay : latestPay;
    });
    return safeFormatDate(latest.date, 'yyyy/MM/dd');
  };

  const StatCard = ({ title, value, icon: Icon, color, subValue, onClick }: any) => (
    <Card 
      onClick={onClick}
      className={`border-none shadow-sm bg-card hover:bg-muted/5 transition-all ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-2xl ${color} bg-opacity-10`}>
            <Icon className={`h-6 w-6 ${color.replace('bg-', 'text-')}`} />
          </div>
          {subValue && (
            <span className="text-xs font-black text-muted-foreground bg-muted px-2 py-1 rounded-lg">
              {subValue}
            </span>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-black text-muted-foreground">{title}</p>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-black font-mono tracking-tighter text-foreground">
              {formatNumberWithCommas(value)}
            </p>
            {onClick && <ArrowLeftRight className="h-4 w-4 text-muted-foreground opacity-30" />}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      {/* Sub-Tabs Switcher */}
      <div className="flex border-b border-border/80">
        <button
          onClick={() => setActiveTab('financial')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'financial'
              ? 'border-primary text-primary font-black bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/10'
          }`}
        >
          التقارير المالية والتحليلات
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          id="tab-payments-report"
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'payments'
              ? 'border-primary text-primary font-black bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/10'
          }`}
        >
          تقرير التسديدات والقوائم
        </button>
      </div>

      {activeTab === 'payments' ? (
        <PaymentsReportSystem
          ledgerEntries={ledgerEntries}
          entities={entities}
          currentBranchId={currentBranchId}
        />
      ) : (
        <>
          {/* Header & Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground">التقارير المالية</h2>
          <p className="text-muted-foreground font-medium mt-1">تحليل شامل ومبسط للعمليات والنشاط المالي</p>
        </div>
        
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'today', label: 'اليوم' },
              { id: 'this_month', label: 'الشهر الحالي' },
              { id: 'last_month', label: 'الشهر الماضي' },
              { id: 'custom', label: 'فترة مخصصة' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => handleFilterChange(f.id as any)}
                className={`px-4 py-2 rounded-2xl text-xs font-black transition-all ${
                  filterType === f.id
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filterType === 'custom' && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 bg-muted/30 p-3 rounded-2xl border border-border"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-muted-foreground">من:</span>
                <input 
                  type="date"
                  value={format(dateRange.startDate, 'yyyy-MM-dd')}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: startOfDay(new Date(e.target.value)) }))}
                  className="bg-background border-none rounded-lg text-xs font-bold p-1 focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-muted-foreground">إلى:</span>
                <input 
                  type="date"
                  value={format(dateRange.endDate, 'yyyy-MM-dd')}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: endOfDay(new Date(e.target.value)) }))}
                  className="bg-background border-none rounded-lg text-xs font-bold p-1 focus:ring-1 focus:ring-primary"
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard 
          title="إجمالي الإيرادات" 
          value={reportData.totalRevenue} 
          icon={ArrowUpCircle} 
          color="bg-emerald-500" 
          subValue={`${reportData.counts.revenue} عملية`}
        />
        <StatCard 
          title="إجمالي المصاريف" 
          value={reportData.totalExpenses + reportData.totalSalaries + reportData.totalLosses} 
          icon={ArrowDownCircle} 
          color="bg-rose-500" 
          subValue={`${reportData.counts.expenses + reportData.counts.salaries + reportData.counts.losses} سجل`}
        />
        <StatCard 
          title="إجمالي المشتريات (فواتير)" 
          value={reportData.totalPurchases} 
          icon={ShoppingCart} 
          color="bg-indigo-500" 
          subValue={`${reportData.counts.purchases} فاتورة`}
        />
        <StatCard 
          title="الرصيد النقدي الحالي" 
          value={reportData.remainingCash} 
          icon={Layers} 
          color="bg-emerald-600" 
          subValue="رصيد الخزينة"
          onClick={() => setShowCashDetails(true)}
        />
        <StatCard 
          title="صافي الربح" 
          value={reportData.netResult} 
          icon={PieChart} 
          color={reportData.netResult >= 0 ? "bg-emerald-500" : "bg-rose-500"} 
          onClick={() => setShowProfitDetails(true)}
        />
        <StatCard 
          title="الواردات غير التشغيلية" 
          value={reportData.totalNonOperatingRevenue} 
          icon={TrendingUp} 
          color="bg-indigo-600" 
          subValue={`${reportData.totalNonOperatingRevenue > 0 ? 'نشط' : 'لا يوجد'}`}
        />
        <StatCard 
          title="السلف المستحقة لي" 
          value={reportData.totalLoansDueToMe} 
          icon={Users} 
          color="bg-amber-600" 
          subValue={reportData.totalLoansDueToMe > 0 ? 'ذمة نشطة' : 'مصفرة'}
        />
      </div>

      {/* Detials Modals (Simulated with conditional rendering for speed and lack of portal complex) */}
      {showCashDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-background rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl border border-border">
              <div className="p-6 border-b border-border flex justify-between items-center">
                 <div>
                    <h3 className="text-xl font-black">تفاصيل الرصيد النقدي</h3>
                    <p className="text-xs text-muted-foreground font-bold">توضيح التدفقات النقدية والداخل والخارج</p>
                 </div>
                 <button onClick={() => setShowCashDetails(false)} className="p-2 hover:bg-muted rounded-full">
                    <TrendingDown className="h-5 w-5 rotate-45" />
                 </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 text-center">
                       <span className="text-[10px] font-black text-blue-600 block mb-1 uppercase">رصيد بداية الفترة</span>
                       <span className="text-lg font-black font-mono text-blue-600 tracking-tighter">{formatNumberWithCommas(reportData.openingCash)}</span>
                    </div>
                    <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 text-center">
                       <span className="text-[10px] font-black text-emerald-600 block mb-1 uppercase">الداخل النقدي (+)</span>
                       <span className="text-lg font-black font-mono text-emerald-600 tracking-tighter">{formatNumberWithCommas(reportData.cashInflow)}</span>
                    </div>
                    <div className="p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10 text-center">
                       <span className="text-[10px] font-black text-rose-600 block mb-1 uppercase">الخارج النقدي (-)</span>
                       <span className="text-lg font-black font-mono text-rose-600 tracking-tighter">{formatNumberWithCommas(reportData.cashOutflow)}</span>
                    </div>
                    <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 text-center">
                       <span className="text-[10px] font-black text-indigo-600 block mb-1 uppercase">رصيد نهاية الفترة</span>
                       <span className="text-lg font-black font-mono text-indigo-600 tracking-tighter">{formatNumberWithCommas(reportData.remainingCash)}</span>
                    </div>
                 </div>

                 <div className="p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-black text-orange-600 block uppercase">رصيد الخزينة الافتتاحي (عند التأسيس)</span>
                      <p className="text-[10px] text-muted-foreground font-bold">هذا المبلغ يمثل السيولة الأصلية التي بدأ بها النظام</p>
                    </div>
                    <span className="text-lg font-black font-mono text-orange-600 tracking-tighter">{formatNumberWithCommas(reportData.absoluteOpeningCash)}</span>
                 </div>

                 <div className="space-y-4">
                    <h4 className="font-black text-sm border-r-4 border-emerald-500 pr-2">الداخل النقدي (تفصيلي)</h4>
                    <div className="bg-muted/30 rounded-2xl p-2 space-y-1">
                       {reportData.cashDetails?.inflows.length === 0 ? <p className="p-4 text-center text-xs text-muted-foreground font-bold">لا يوجد وارد نقدي في هذه الفترة</p> : 
                        reportData.cashDetails?.inflows.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 hover:bg-background rounded-xl transition-colors">
                             <div className="flex flex-col">
                                <span className="text-xs font-black">{item._label || item.label}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">{format(item.date || new Date(), 'yyyy/MM/dd')}</span>
                             </div>
                             <span className="text-sm font-black font-mono text-emerald-600">+{formatNumberWithCommas(item._amount || item.amount)}</span>
                          </div>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h4 className="font-black text-sm border-r-4 border-rose-500 pr-2">الخارج النقدي (تفصيلي)</h4>
                    <div className="bg-muted/30 rounded-2xl p-2 space-y-1">
                       {reportData.cashDetails?.outflows.length === 0 ? <p className="p-4 text-center text-xs text-muted-foreground font-bold">لا يوجد صادر نقدي في هذه الفترة</p> : 
                        reportData.cashDetails?.outflows.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 hover:bg-background rounded-xl transition-colors">
                             <div className="flex flex-col">
                                <span className="text-xs font-black">{item._label || item.label}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">{format(item.date || new Date(), 'yyyy/MM/dd')}</span>
                             </div>
                             <span className="text-sm font-black font-mono text-rose-600">-{formatNumberWithCommas(Math.abs(item._amount || item.amount))}</span>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
              <div className="p-6 bg-muted/50 border-t border-border mt-auto">
                 <button onClick={() => setShowCashDetails(false)} className="w-full py-3 bg-primary text-primary-foreground font-black rounded-2xl shadow-lg shadow-primary/20">إغلاق</button>
              </div>
           </motion.div>
        </div>
      )}

      {showProfitDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-background rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl border border-border">
              <div className="p-6 border-b border-border flex justify-between items-center">
                 <div>
                    <h3 className="text-xl font-black">تفاصيل صافي الربح</h3>
                    <p className="text-xs text-muted-foreground font-bold">تحليل الأرباح مقابل الخصومات والمصاريف</p>
                 </div>
                 <button onClick={() => setShowProfitDetails(false)} className="p-2 hover:bg-muted rounded-full">
                    <TrendingDown className="h-5 w-5 rotate-45" />
                 </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                 <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 text-center">
                       <span className="text-[10px] font-black text-emerald-600 block mb-1 uppercase">أرباح المبيعات (+)</span>
                       <span className="text-lg font-black font-mono text-emerald-600 tracking-tighter">{formatNumberWithCommas(reportData.totalProfit)}</span>
                    </div>
                    <div className="p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10 text-center">
                       <span className="text-[10px] font-black text-rose-600 block mb-1 uppercase">إجمالي الخصومات (-)</span>
                       <span className="text-lg font-black font-mono text-rose-600 tracking-tighter">{formatNumberWithCommas(reportData.totalExpenses + reportData.totalSalaries + reportData.totalLosses)}</span>
                    </div>
                    <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 text-center">
                       <span className="text-[10px] font-black text-indigo-600 block mb-1 uppercase">صافي الربح</span>
                       <span className="text-lg font-black font-mono text-indigo-600 tracking-tighter">{formatNumberWithCommas(reportData.netResult)}</span>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h4 className="font-black text-sm border-r-4 border-emerald-500 pr-2">أرباح المبيعات</h4>
                    <div className="bg-muted/30 rounded-2xl p-2 space-y-1">
                       {reportData.profitDetails?.salesProfits.length === 0 ? <p className="p-4 text-center text-xs text-muted-foreground font-bold">لا توجد أرباح مبيعات مسجلة في هذه الفترة</p> : 
                        reportData.profitDetails?.salesProfits.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 hover:bg-background rounded-xl transition-colors">
                             <div className="flex flex-col">
                                <span className="text-xs font-black">{item._label || item.label}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">{format(item.date || new Date(), 'yyyy/MM/dd')}</span>
                             </div>
                             <span className="text-sm font-black font-mono text-emerald-600">+{formatNumberWithCommas(item._amount || item.amount)}</span>
                          </div>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h4 className="font-black text-sm border-r-4 border-rose-500 pr-2">الخصومات من الربح (مصاريف، رواتب، تالف)</h4>
                    <div className="bg-muted/30 rounded-2xl p-2 space-y-1">
                       {reportData.profitDetails?.deductions.length === 0 ? <p className="p-4 text-center text-xs text-muted-foreground font-bold">لا توجد خصومات في هذه الفترة</p> : 
                        reportData.profitDetails?.deductions.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 hover:bg-background rounded-xl transition-colors">
                             <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black">{item._label || item.label}</span>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${
                                    item.type === 'expense' ? 'bg-amber-500/10 text-amber-600' : 
                                    item.type === 'salary' ? 'bg-blue-500/10 text-blue-600' : 'bg-rose-500/10 text-rose-600'
                                  }`}>
                                    {item.type === 'expense' ? 'مصروف' : item.type === 'salary' ? 'راتب' : 'تالف'}
                                  </span>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-mono">{format(item.date || new Date(), 'yyyy/MM/dd')}</span>
                             </div>
                             <span className="text-sm font-black font-mono text-rose-600">-{formatNumberWithCommas(Math.abs(item._amount || item.amount))}</span>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
              <div className="p-6 bg-muted/50 border-t border-border mt-auto">
                 <button onClick={() => setShowProfitDetails(false)} className="w-full py-3 bg-primary text-primary-foreground font-black rounded-2xl shadow-lg shadow-primary/20">إغلاق</button>
              </div>
           </motion.div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-3 border-none shadow-sm rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-black italic">تقرير مديونية الموردين التفصيلي</CardTitle>
              <CardDescription className="font-medium">تحليل الديون والأرصدة الافتتاحية لكل مورد</CardDescription>
            </div>
            <div className="p-2 bg-rose-500/10 rounded-xl">
              <Building2 className="h-6 w-6 text-rose-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-right border-b border-border">
                    <th className="pb-3 text-xs font-black text-muted-foreground uppercase">المورد</th>
                    <th className="pb-3 text-xs font-black text-muted-foreground uppercase">الافتتاحي الأصلي</th>
                    <th className="pb-3 text-xs font-black text-muted-foreground uppercase">المسدد من الافتتاحي</th>
                    <th className="pb-3 text-xs font-black text-muted-foreground uppercase">المتبقي من الافتتاحي</th>
                    <th className="pb-3 text-xs font-black text-muted-foreground uppercase">متبقي الفواتير</th>
                    <th className="pb-3 text-xs font-black text-muted-foreground uppercase">إجمالي الدين</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {entities
                    .filter(e => (e.type === 'office' || e.type === 'warehouse') && !e.isArchived)
                    .map(supplier => {
                      const opening = supplierOpeningBalances.find(ob => ob.supplierId === supplier.id);
                      const originalOpening = opening?.openingAmount || 0;
                      
                      const payments = ledgerEntries.filter(le => 
                        le.accountId === supplier.id && 
                        le.operationType === 'payment' && 
                        !le.isDeleted &&
                        (le.sourceType === 'supplier_opening_balance_payment' || le.paymentSource === 'opening_balance' || le.sourceType === 'supplier_opening_payment')
                      );
                      const paidOpening = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
                      const remainingOpening = Math.max(0, originalOpening - paidOpening);
                      
                      const invoiceDebt = ledgerEntries
                        .filter(le => le.accountId === supplier.id && le.operationType === 'invoice' && !le.isDeleted)
                        .reduce((sum, inv) => sum + Number(inv.remainingAmount || 0), 0);
                      
                      const totalDebt = remainingOpening + invoiceDebt;
                      
                      if (totalDebt === 0 && originalOpening === 0) return null;

                      return (
                        <tr key={supplier.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-4">
                            <div className="font-bold text-sm">{supplier.name}</div>
                            <div className="text-[10px] text-muted-foreground">{supplier.type === 'office' ? 'مكتب' : 'مذخر'}</div>
                          </td>
                          <td className="py-4 font-mono text-sm">{formatNumberWithCommas(originalOpening)}</td>
                          <td className="py-4 font-mono text-sm text-emerald-600">{formatNumberWithCommas(paidOpening)}</td>
                          <td className="py-4 font-mono text-sm text-amber-600 font-bold">{formatNumberWithCommas(remainingOpening)}</td>
                          <td className="py-4 font-mono text-sm text-blue-600">{formatNumberWithCommas(invoiceDebt)}</td>
                          <td className="py-4 font-mono text-sm text-rose-600 font-black">{formatNumberWithCommas(totalDebt)}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Breakdown Card */}
        <Card className="lg:col-span-2 border-none shadow-sm rounded-3xl">
          <CardHeader>
            <CardTitle className="text-xl font-black">تفصيل العمليات</CardTitle>
            <CardDescription className="font-medium">توزيع المبالغ خلال الفترة المحددة</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[
                { label: 'إجمالي المبيعات (الوارد)', value: reportData.totalRevenue, color: 'bg-emerald-500', total: Math.max(reportData.totalRevenue, 1) },
                { label: 'أرباح المبيعات (قبل الخصم)', value: reportData.totalProfit, color: 'bg-emerald-400', total: Math.max(reportData.totalRevenue, 1) },
                { label: 'المصاريف العامة (-)', value: reportData.totalExpenses, color: 'bg-rose-400', total: Math.max(reportData.totalProfit, 1) },
                { label: 'الرواتب والأجور (-)', value: reportData.totalSalaries, color: 'bg-rose-500', total: Math.max(reportData.totalProfit, 1) },
                { label: 'التالف والاكسباير (-)', value: reportData.totalLosses, color: 'bg-amber-500', total: Math.max(reportData.totalProfit, 1) },
                { label: 'واردات غير تشغيليّة (+)', value: reportData.totalNonOperatingRevenue, color: 'bg-indigo-600', total: Math.max(reportData.totalNonOperatingRevenue, reportData.totalRevenue, 1) },
                { label: 'رصيد السلف المستحقة لي', value: reportData.totalLoansDueToMe, color: 'bg-amber-600', total: Math.max(Math.abs(reportData.totalLoansDueToMe), reportData.totalRevenue, 1) },
                { label: 'صافي الربح النهائي', value: reportData.netResult, color: 'bg-indigo-500', total: Math.max(reportData.totalProfit, 1) },
              ].map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-sm font-black">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="text-foreground font-mono">{formatNumberWithCommas(item.value)}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.value / item.total) * 100}%` }}
                      className={`h-full ${item.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Totals & Balances */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-primary/5 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-primary/10 rounded-xl">
                   <DollarSign className="h-5 w-5 text-primary" />
                 </div>
                 <h4 className="font-black text-lg">الأرصدة الحالية</h4>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-background/50 rounded-2xl border border-primary/5">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-muted-foreground">الرصيد النقدي الافتتاحي</span>
                    <span className="text-[10px] text-muted-foreground font-bold">إجمالي الكاش عند البدء</span>
                  </div>
                  <span className="text-lg font-black font-mono text-blue-600 tracking-tighter">{formatNumberWithCommas(reportData.absoluteOpeningCash || 0)}</span>
                </div>

                <div className="flex justify-between items-center p-4 bg-background/50 rounded-2xl border border-primary/5">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-muted-foreground">رصيد بداية الفترة</span>
                    <span className="text-[10px] text-muted-foreground font-bold">الرصيد المتاح عند بدء التاريخ المختار</span>
                  </div>
                  <span className="text-lg font-black font-mono text-zinc-600 tracking-tighter">{formatNumberWithCommas(reportData.openingCash)}</span>
                </div>
                
                <div className="pt-2 space-y-2">
                  <div className="flex justify-between items-center px-4 py-2 bg-emerald-500/5 rounded-xl text-[10px] font-black uppercase tracking-wider">
                    <span className="text-emerald-600">الوارد النقدي (+)</span>
                    <span className="text-emerald-700">{formatNumberWithCommas(reportData.cashInflow)}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2 bg-rose-500/5 rounded-xl text-[10px] font-black uppercase tracking-wider">
                    <span className="text-rose-600">الخارج النقدي (-)</span>
                    <span className="text-rose-700">{formatNumberWithCommas(-reportData.cashOutflow)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-4 bg-primary/10 rounded-2xl border border-primary/20 shadow-sm shadow-primary/5">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-primary">الرصيد النهائي (الخزينة)</span>
                    <span className="text-[10px] text-primary/60 font-bold">إجمالي الكاش الفعلي المتوفر حالياً</span>
                  </div>
                  <span className="text-xl font-black font-mono text-emerald-600 tracking-tighter">{formatNumberWithCommas(reportData.remainingCash)}</span>
                </div>

                <div className="flex justify-between items-center p-4 bg-background/50 rounded-2xl border border-rose-500/5">
                  <span className="text-sm font-black text-muted-foreground">مديونية الموردين</span>
                  <span className="text-lg font-black font-mono text-rose-500">{formatNumberWithCommas(reportData.supplierDebt)}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-background/50 rounded-2xl border border-blue-500/5">
                  <span className="text-sm font-black text-muted-foreground">ديون الزبائن</span>
                  <span className="text-lg font-black font-mono text-blue-500">{formatNumberWithCommas(reportData.customerDebt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-indigo-500/5 rounded-3xl">
             <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                   <div className="p-2 bg-indigo-500/10 rounded-xl">
                      <ArrowLeftRight className="h-5 w-5 text-indigo-600" />
                   </div>
                   <h4 className="font-black text-lg">سلف الموظفين</h4>
                </div>
                <div className="space-y-3">
                   <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-muted-foreground">إجمالي الصادر</span>
                      <span className="text-sm font-black font-mono">{formatNumberWithCommas(reportData.totalLoansOutgoing || 0)}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-muted-foreground">إجمالي المسترجع</span>
                      <span className="text-sm font-black font-mono text-emerald-600">{formatNumberWithCommas(reportData.totalLoansReturned || 0)}</span>
                   </div>
                   <div className="border-t border-border/50 my-2 pt-2 flex justify-between items-center">
                      <span className="text-xs font-black text-foreground">الرصيد المتبقي (ذمة)</span>
                      <span className="text-base font-black font-mono text-indigo-600">{formatNumberWithCommas(reportData.remainingLoansPending || 0)}</span>
                   </div>
                   <div className="text-[10px] font-black text-muted-foreground bg-muted/50 px-2 py-1 rounded text-center">
                      عدد السلف المفتوحة حالياً: {reportData.counts.openLoans || 0}
                   </div>
                </div>
             </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-rose-500/5 rounded-3xl border-r-4 border-rose-500">
             <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                   <div className="p-2 bg-rose-500/10 rounded-xl">
                      <Receipt className="h-5 w-5 text-rose-600" />
                   </div>
                   <h4 className="font-black text-lg text-rose-700">السلف الداخلة (الأمانات)</h4>
                </div>
                <div className="space-y-3">
                   <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-muted-foreground">إجمالي السلف المفتوحة</span>
                      <span className="text-sm font-black font-mono text-rose-600">{formatNumberWithCommas(reportData.openLoansInAmount)}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-muted-foreground">عدد السلف المفتوحة</span>
                      <span className="text-sm font-black">{reportData.openLoansInCount}</span>
                   </div>
                   <p className="text-[9px] text-muted-foreground font-bold mt-2 leading-tight">
                     * السلف الداخلة هي التزامات على الصيدلية يجب إرجاعها ولا تحسب كأرباح.
                   </p>
                </div>
             </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-3xl bg-amber-500/5">
             <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                   <AlertTriangle className="h-5 w-5 text-amber-500" />
                   <h4 className="font-black">ملاحظات النظام</h4>
                </div>
                <p className="text-xs text-muted-foreground font-bold leading-relaxed mb-4">
                  هذه التقارير تعتمد كلياً على البيانات المسجلة فعلياً في النظام. يتم احتساب الأرباح والمصاريف والرواتب بناءً على القيود اليومية فقط.
                </p>
                
                {reportData.debug && (
                  <div className="pt-4 border-t border-amber-500/20 space-y-2">
                    <h5 className="text-[10px] uppercase tracking-wider text-amber-600 font-black mb-2">تدقيق البيانات (فواتير المشتريات)</h5>
                    <div className="flex justify-between text-[10px] font-black">
                      <span className="text-muted-foreground">إجمالي السجلات:</span>
                      <span>{reportData.debug.rawInvoicesCount}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-black">
                      <span className="text-muted-foreground">الفواتير الفريدة:</span>
                      <span>{reportData.debug.uniqueInvoicesCount}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-black text-amber-600">
                      <span>تكرارات محذوفة:</span>
                      <span>{reportData.debug.duplicatesDetected}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-black text-blue-600 border-t border-blue-500/10 pt-1">
                      <span>النطاق الزمني:</span>
                      <span dir="ltr">{reportData.debug.filterRange}</span>
                    </div>
                    {reportData.debug.duplicateNumbers.length > 0 && (
                      <div className="mt-2 text-[9px] font-black">
                        <span className="text-muted-foreground block mb-1">أرقام مكررة:</span>
                        <div className="flex flex-wrap gap-1">
                          {reportData.debug.duplicateNumbers.map((num, idx) => (
                            <span key={idx} className="bg-amber-500/10 px-1.5 py-0.5 rounded">{num}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {reportData.debug.invoiceKeys.length > 0 && (
                      <div className="mt-2 text-[8px] font-black opacity-50">
                        <span className="text-muted-foreground block mb-1">مفاتيح الفواتير المحتسبة:</span>
                        <div className="max-h-[100px] overflow-y-auto space-y-1 p-1 bg-black/5 rounded">
                          {reportData.debug.invoiceKeys.map((key, idx) => (
                            <div key={idx} className="truncate" title={key}>{key}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
             </CardContent>
          </Card>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
