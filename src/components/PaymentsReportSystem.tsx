import React, { useMemo, useState } from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Receipt,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Building2,
  FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatNumberWithCommas, toValidDate, safeFormatDate } from '../lib/formatters';
import { startOfMonth, endOfMonth, startOfDay, endOfDay, format } from 'date-fns';
import * as XLSX from 'xlsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PaymentsReportSystemProps {
  ledgerEntries: any[];
  entities: any[];
  currentBranchId: string | null;
}

export const PaymentsReportSystem: React.FC<PaymentsReportSystemProps> = ({
  ledgerEntries,
  entities,
  currentBranchId
}) => {
  // Filters State
  const [payDateRange, setPayDateRange] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [paySupplierId, setPaySupplierId] = useState<string>('all');
  const [payStatus, setPayStatus] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Invoices and Payments calculation
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

  const handleExportExcel = () => {
    const excelData = [
      ['تقرير التسديدات والقوائم المسددة وغير المسددة'],
      ['من تاريخ', payDateRange.startDate || 'الكل', 'إلى تاريخ', payDateRange.endDate || 'الكل'],
      ['المورد', paySupplierId === 'all' ? 'الكل' : entities.find(e => e.id === paySupplierId)?.name || '', 'الحالة', payStatus === 'all' ? 'الكل' : payStatus === 'paid' ? 'مسددة' : payStatus === 'unpaid' ? 'غير مسددة' : 'مسددة جزئياً'],
      [],
      ['ملخص التقرير'],
      ['عدد القوائم الكلي', paymentsReportData.summaries.totalCount, 'عدد القوائم المسددة', paymentsReportData.summaries.paidCount, 'عدد القوائم غير المسددة', paymentsReportData.summaries.unpaidCount],
      ['إجمالي مبالغ القوائم (الصافي)', paymentsReportData.summaries.sumNetAmount, 'إجمالي المسدد', paymentsReportData.summaries.sumPaid, 'إجمالي المتبقي', paymentsReportData.summaries.sumRemaining],
      [],
      ['اسم المورد', 'رقم القائمة', 'تاريخ القائمة', 'مبلغ القائمة', 'الخصم', 'الصافي', 'المبلغ المسدد', 'المبلغ المتبقي', 'حالة التسديد', 'تاريخ آخر تسديد', 'ملاحظات'],
      ...paymentsReportData.items.map(inv => {
        const lastPayDate = getInvoiceLastPaymentDate(inv.id);
        const statusLabel = inv.paymentStatus === 'paid' ? 'مسددة بالكامل' : 
                            (inv.paymentStatus === 'partial' || inv.paymentStatus === 'partially_paid') ? 'مسددة جزئياً' : 
                            inv.paymentStatus === 'overdue' ? 'متأخرة' : 'غير مسددة';
        return [
          inv.accountName || entities.find(e => e.id === inv.accountId)?.name || 'غير معروف',
          inv.invoiceNumber || 'لا يوجد',
          safeFormatDate(inv.date, 'yyyy/MM/dd'),
          inv.amount || 0,
          inv.discount || 0,
          inv.netAmount ?? (inv.amount - (inv.discount || 0)),
          inv.paidAmount || 0,
          inv.remainingAmount ?? 0,
          statusLabel,
          lastPayDate,
          inv.notes || ''
        ];
      })
    ];

    const ws = XLSX.utils.aoa_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "تقرير التسديدات والقوائم");
    XLSX.writeFile(wb, `Payment_Report_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
  };

  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.getElementById('payments-report-printable');
      if (element) {
        const opt = {
          margin: 0.3,
          filename: `Payment_Report_${format(new Date(), 'yyyyMMdd')}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { scale: 1.5, useCORS: true },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' as const }
        };
        html2pdf().from(element).set(opt).save();
      }
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-black text-foreground">تقرير التسديدات</h2>
        <p className="text-xs text-muted-foreground font-semibold mt-1">عرض وتحليل القوائم المسددة، غير المسددة، والمسددة جزئياً ومتابعة حركة الديون</p>
      </div>

      {/* Filters Card */}
      <Card className="border-none shadow-sm bg-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-black text-muted-foreground block mb-2">من تاريخ</label>
            <input
              type="date"
              value={payDateRange.startDate}
              onChange={(e) => setPayDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
              className="w-full bg-background border border-border h-11 rounded-xl px-3 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-black text-muted-foreground block mb-2">إلى تاريخ</label>
            <input
              type="date"
              value={payDateRange.endDate}
              onChange={(e) => setPayDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
              className="w-full bg-background border border-border h-11 rounded-xl px-3 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-black text-muted-foreground block mb-2">المورد / المكتب</label>
            <Select value={paySupplierId} onValueChange={setPaySupplierId}>
              <SelectTrigger className="w-full bg-background border border-border text-foreground h-11 rounded-xl pr-3 font-bold text-xs">
                <SelectValue placeholder="الكل" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground">
                <SelectItem value="all">الكل</SelectItem>
                {entities
                  .filter((e) => (e.type === 'office' || e.type === 'warehouse') && !e.isArchived)
                  .map((ent) => (
                    <SelectItem key={ent.id} value={ent.id}>
                      {ent.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-black text-muted-foreground block mb-2">حالة القائمة</label>
            <Select value={payStatus} onValueChange={(val: any) => setPayStatus(val)}>
              <SelectTrigger className="w-full bg-background border border-border text-foreground h-11 rounded-xl pr-3 font-bold text-xs">
                <SelectValue placeholder="الكل" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground">
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="paid">مسددة</SelectItem>
                <SelectItem value="unpaid">غير مسددة</SelectItem>
                <SelectItem value="partial">مسددة جزئياً</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border-none shadow-sm bg-card">
          <CardContent className="p-4 flex flex-col justify-between h-full min-h-[110px]">
            <span className="text-xs font-black text-muted-foreground">عدد القوائم الكلي</span>
            <span className="text-2xl font-black font-mono tracking-tight text-foreground mt-2">
              {paymentsReportData.summaries.totalCount}
            </span>
            <span className="text-[10px] text-muted-foreground mt-1">قائمة</span>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card">
          <CardContent className="p-4 flex flex-col justify-between h-full min-h-[110px]">
            <span className="text-xs font-black text-emerald-500">عدد القوائم المسددة</span>
            <span className="text-2xl font-black font-mono tracking-tight text-emerald-500 mt-2">
              {paymentsReportData.summaries.paidCount}
            </span>
            <span className="text-[10px] text-emerald-500/80 mt-1">قائمة مسددة بالكامل</span>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card">
          <CardContent className="p-4 flex flex-col justify-between h-full min-h-[110px]">
            <span className="text-xs font-black text-rose-500">عدد القوائم غير المسددة</span>
            <span className="text-2xl font-black font-mono tracking-tight text-rose-500 mt-2">
              {paymentsReportData.summaries.unpaidCount}
            </span>
            <span className="text-[10px] text-rose-500/80 mt-1">قائمة معلقة أو متأخرة</span>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card">
          <CardContent className="p-4 flex flex-col justify-between h-full min-h-[110px]">
            <span className="text-xs font-black text-primary">مجموع مبالغ القوائم</span>
            <span className="text-base font-black font-mono tracking-tight text-primary mt-2 leading-none">
              {formatNumberWithCommas(paymentsReportData.summaries.sumNetAmount)} <span className="text-[10px]">د.ع</span>
            </span>
            <span className="text-[10px] text-muted-foreground mt-1 block truncate">
              قبل الخصم: {formatNumberWithCommas(paymentsReportData.summaries.sumGrossAmount)}
            </span>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card">
          <CardContent className="p-4 flex flex-col justify-between h-full min-h-[110px]">
            <span className="text-xs font-black text-emerald-600">مجموع المسدد</span>
            <span className="text-base font-black font-mono tracking-tight text-emerald-600 mt-2 leading-none">
              {formatNumberWithCommas(paymentsReportData.summaries.sumPaid)} <span className="text-[10px]">د.ع</span>
            </span>
            <span className="text-[10px] text-emerald-500/80 mt-1">
              خصومات: {formatNumberWithCommas(paymentsReportData.summaries.sumDiscount)}
            </span>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card">
          <CardContent className="p-4 flex flex-col justify-between h-full min-h-[110px]">
            <span className="text-xs font-black text-amber-600">مجموع المتبقي</span>
            <span className="text-base font-black font-mono tracking-tight text-amber-600 mt-2 leading-none">
              {formatNumberWithCommas(paymentsReportData.summaries.sumRemaining)} <span className="text-[10px]">د.ع</span>
            </span>
            <span className="text-[10px] text-amber-500/80 mt-1">ذمم مستحقة معلقة</span>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-none shadow-sm bg-card overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
          <div>
            <CardTitle className="text-lg font-black text-foreground">جدول تفاصيل التسديدات والقوائم</CardTitle>
            <CardDescription className="text-xs text-muted-foreground font-semibold">استعراض وتتبع حالات السداد للفواتير المسجلة</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-xs font-black px-4 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4" />
              تصدير Excel
            </button>
            <button
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-black px-4 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              {isExportingPDF ? 'جاري تصدير PDF...' : 'تصدير PDF'}
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div id="payments-report-printable" className="p-6 bg-card text-foreground">
            {/* Header description for printing */}
            <div className="hidden print:block mb-6 border-b pb-4">
              <h1 className="text-2xl font-black text-primary mb-2 text-center">تقرير التسديدات والقوائم</h1>
              <div className="grid grid-cols-3 text-xs gap-4 text-muted-foreground mr-4">
                <div>من تاريخ: {payDateRange.startDate || 'البداية'}</div>
                <div>إلى تاريخ: {payDateRange.endDate || 'النهاية'}</div>
                <div>المورد: {paySupplierId === 'all' ? 'الكل' : entities.find(e => e.id === paySupplierId)?.name || 'الكل'}</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-black">
                    <th className="pb-3 text-right">اسم المورد</th>
                    <th className="pb-3 text-center">رقم القائمة</th>
                    <th className="pb-3 text-center">تاريخ القائمة</th>
                    <th className="pb-3 text-left">مبلغ القائمة</th>
                    <th className="pb-3 text-left">الخصم</th>
                    <th className="pb-3 text-left">الصافي</th>
                    <th className="pb-3 text-left">المبلغ المسدد</th>
                    <th className="pb-3 text-left">المبلغ المتبقي</th>
                    <th className="pb-3 text-center">حالة التسديد</th>
                    <th className="pb-3 text-center">تاريخ آخر تسديد</th>
                    <th className="pb-3 text-right">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {paymentsReportData.items.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-muted-foreground font-bold">
                        لا توجد فواتير مطابقة لمعايير البحث المحددة.
                      </td>
                    </tr>
                  ) : (
                    paymentsReportData.items.map((inv) => {
                      const lastPayDate = getInvoiceLastPaymentDate(inv.id);
                      return (
                        <tr key={inv.id} className="hover:bg-muted/10 transition-colors group">
                          <td className="py-4 font-black text-foreground text-right">
                            {inv.accountName || entities.find((e) => e.id === inv.accountId)?.name || 'غير معروف'}
                          </td>
                          <td className="py-4 text-center font-bold font-mono text-foreground">
                            {inv.invoiceNumber || 'لا يوجد'}
                          </td>
                          <td className="py-4 text-center font-mono text-muted-foreground text-[10px]">
                            {safeFormatDate(inv.date, 'yyyy/MM/dd')}
                          </td>
                          <td className="py-4 text-left font-bold font-mono">
                            {formatNumberWithCommas(inv.amount || 0)}
                          </td>
                          <td className="py-4 text-left font-bold font-mono text-amber-500">
                            {formatNumberWithCommas(inv.discount || 0)}
                          </td>
                          <td className="py-4 text-left font-bold font-mono text-primary">
                            {formatNumberWithCommas(inv.netAmount ?? (inv.amount - (inv.discount || 0)))}
                          </td>
                          <td className="py-4 text-left font-bold font-mono text-emerald-500">
                            {formatNumberWithCommas(inv.paidAmount || 0)}
                          </td>
                          <td className="py-4 text-left font-bold font-mono text-rose-500">
                            {formatNumberWithCommas(inv.remainingAmount ?? 0)}
                          </td>
                          <td className="py-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              inv.paymentStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-500' :
                              (inv.paymentStatus === 'partial' || inv.paymentStatus === 'partially_paid') ? 'bg-blue-500/10 text-blue-500' :
                              inv.paymentStatus === 'overdue' ? 'bg-rose-500/10 text-rose-500' :
                              'bg-amber-500/10 text-amber-500'
                            }`}>
                              {inv.paymentStatus === 'paid' ? 'مسددة' :
                               (inv.paymentStatus === 'partial' || inv.paymentStatus === 'partially_paid') ? 'جزئي' :
                               inv.paymentStatus === 'overdue' ? 'متأخر' : 'غير مسدد'}
                            </span>
                          </td>
                          <td className="py-4 text-center font-mono text-muted-foreground text-[10px]">
                            {lastPayDate}
                          </td>
                          <td className="py-4 text-right text-muted-foreground text-[11px] max-w-[150px] truncate" title={inv.notes}>
                            {inv.notes || '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
