import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Edit, 
  Plus, 
  FileText, 
  Receipt, 
  FileUp,
  Gift, 
  RefreshCcw, 
  LayoutDashboard, 
  History, 
  CheckCircle2, 
  MoreVertical, 
  Eye, 
  DollarSign, 
  Clock, 
  Trash2, 
  Image as ImageIcon, 
  Search, 
  Settings, 
  MoreHorizontal,
  CheckCircle,
  Users,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { formatIQD, formatNumberWithCommas, safeFormatDate, toValidDate, getSupplierTypeLabel } from '@/src/lib/formatters';
import { Entity, LedgerEntry, Bonus, EntityActivity, SupplierOpeningBalance, Deadline } from '@/src/db';
import { toast } from 'sonner';
import { ensureArray } from '@/src/lib/arrayUtils';

interface SupplierAccountPageProps {
  entity: Entity;
  onBack: () => void;
  ledgerEntries: LedgerEntry[];
  bonuses: Bonus[];
  supplierOpeningBalances?: SupplierOpeningBalance[];
  onAddInvoice: () => void;
  onAddPayment: () => void;
  onAddBonus: () => void;
  onEditEntity: () => void;
  onViewInvoice: (invoice: LedgerEntry) => void;
  onEditInvoice: (invoice: LedgerEntry) => void;
  onDeleteInvoice: (invoice: LedgerEntry) => void;
  onRefundInvoice: (invoice: LedgerEntry) => void;
  onPartialPayment: (invoice: LedgerEntry) => void;
  onFullPayment: (invoice: LedgerEntry) => void;
  onShowImage?: (url: string) => void;
  onDeleteAttachment?: (ledgerId: string, url: string) => void;
  onEditPayment?: (payment: LedgerEntry) => void;
  onDeletePayment?: (paymentId: string) => void;
  onEditBonus?: (bonus: Bonus) => void;
  onDeleteBonus?: (bonusId: string) => void;
  onImportHistorical?: () => void;
  onImportExcel?: () => void;
  onMultiEntry?: () => void;
  onSetDeadline?: (target: { id: string; number: string; amount: number; accountId: string; accountName: string }) => void;
  appMode?: 'laptop' | 'mobile';
  activities?: EntityActivity[];
  deadlines?: Deadline[];
}

export const SupplierAccountPage = ({
  entity, 
  onBack, 
  ledgerEntries,
  bonuses,
  supplierOpeningBalances = [],
  onAddInvoice,
  onAddPayment,
  onAddBonus,
  onEditEntity,
  onViewInvoice,
  onEditInvoice,
  onDeleteInvoice,
  onRefundInvoice,
  onPartialPayment,
  onFullPayment,
  onShowImage,
  onDeleteAttachment,
  onEditPayment,
  onDeletePayment,
  onEditBonus,
  onDeleteBonus,
  onImportHistorical,
  onImportExcel,
  onMultiEntry,
  onSetDeadline,
  appMode = 'laptop',
  activities = [],
  deadlines = []
}: SupplierAccountPageProps) => {
  const [archiveYear, setArchiveYear] = useState(new Date().getFullYear().toString());
  const [archiveMonth, setArchiveMonth] = useState('all');
  const [archiveStatus, setArchiveStatus] = useState('all');
  const [archiveSearch, setArchiveSearch] = useState('');

  const stats = useMemo(() => {
    const invoices = ledgerEntries.filter(e => e.operationType === 'invoice' && !e.isDeleted);
    const payments = ledgerEntries.filter(e => e.operationType === 'payment' && !e.isDeleted);
    const openingBalances = ensureArray<SupplierOpeningBalance>(supplierOpeningBalances);
    
    // Sort to find last dates
    const sortedInvoices = [...invoices].sort((a, b) => toValidDate(b.date).getTime() - toValidDate(a.date).getTime());
    const sortedPayments = [...payments].sort((a, b) => toValidDate(b.date).getTime() - toValidDate(a.date).getTime());

    const originalOpeningBalance = openingBalances.reduce((acc, op) => acc + (op.openingAmount || 0), 0);
    const paidFromOpeningBalance = payments
      .filter(p => p.paymentSource === 'opening_balance' || p.sourceType === 'supplier_opening_balance_payment' || p.sourceType === 'supplier_opening_payment')
      .reduce((acc, p) => acc + (p.amount || 0), 0);
    const remainingOpeningBalance = Math.max(0, originalOpeningBalance - paidFromOpeningBalance);

    const totalRemainingInvoices = invoices.reduce((acc, i) => acc + Number(i.remainingAmount || 0), 0);
    const totalCurrentDebt = remainingOpeningBalance + totalRemainingInvoices;

    return {
      totalPurchases: invoices.reduce((acc, i) => acc + Number(i.amount || i.netAmount || 0), 0) + originalOpeningBalance,
      totalPayments: payments.reduce((acc, p) => acc + (p.amount || 0), 0),
      openInvoices: invoices.filter(i => i.paymentStatus !== 'paid').length + openingBalances.filter(op => op.remainingAmount > 0).length,
      overdueInvoices: invoices.filter(i => i.paymentStatus === 'overdue').length,
      pendingBonuses: bonuses.filter(b => b.status === 'pending').length,
      invoiceCount: invoices.length,
      lastInvoiceDate: sortedInvoices[0]?.date || null,
      lastPaymentDate: sortedPayments[0]?.date || null,
      
      // New fields
      originalOpeningBalance,
      paidFromOpeningBalance,
      remainingOpeningBalance,
      totalRemainingInvoices,
      totalCurrentDebt
    };
  }, [ledgerEntries, bonuses, supplierOpeningBalances]);

  const historicalInvoices = useMemo(() => {
    return ledgerEntries.filter(e => e.operationType === 'invoice' && e.isHistorical === true);
  }, [ledgerEntries]);

  const filteredArchive = useMemo(() => {
    return historicalInvoices.filter(inv => {
      const date = toValidDate(inv.date);
      const yearMatch = archiveYear === 'all' || date.getFullYear().toString() === archiveYear;
      const monthMatch = archiveMonth === 'all' || (date.getMonth() + 1).toString() === archiveMonth;
      const statusMatch = archiveStatus === 'all' || inv.paymentStatus === archiveStatus;
      const searchMatch = archiveSearch === '' || inv.invoiceNumber?.includes(archiveSearch);
      return yearMatch && monthMatch && statusMatch && searchMatch;
    }).sort((a, b) => toValidDate(b.date).getTime() - toValidDate(a.date).getTime());
  }, [historicalInvoices, archiveYear, archiveMonth, archiveStatus, archiveSearch]);

  const timelineItems = useMemo(() => {
    return [...ensureArray(activities), ...ensureArray(ledgerEntries), ...ensureArray(bonuses)]
      .sort((a, b) => {
        const dateA = (a as any).date || (a as any).createdAt;
        const dateB = (b as any).date || (b as any).createdAt;
        return toValidDate(dateB).getTime() - toValidDate(dateA).getTime();
      });
  }, [activities, ledgerEntries, bonuses]);

  const monthlyPurchases = useMemo(() => {
    const invoices = ledgerEntries.filter(e => e.operationType === 'invoice');
    const months: Record<string, any> = {};
    
    invoices.forEach(inv => {
      const date = toValidDate(inv.date);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      if (!months[key]) {
        months[key] = {
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          monthName: safeFormatDate(date, 'MMMM'),
          total: 0,
          count: 0,
          paid: 0,
          remaining: 0
        };
      }
      months[key].total += Number(inv.amount || 0);
      months[key].count += 1;
      months[key].paid += Number(inv.paidAmount || 0);
      months[key].remaining += Number(inv.remainingAmount || 0);
    });
    
    return Object.values(months).sort((a: any, b: any) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [ledgerEntries]);

  return (
    <div className="space-y-6 animate-in slide-in-from-left duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-muted shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl md:text-2xl font-black text-foreground truncate">{entity.name}</h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                entity.type === 'office' ? 'bg-blue-500/10 text-blue-500' : 
                entity.type === 'scientific_office' ? 'bg-purple-500/10 text-purple-500' :
                'bg-amber-500/10 text-amber-600'
              }`}>
                {getSupplierTypeLabel(entity.type)}
              </span>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground truncate">{entity.phone || 'لا يوجد رقم هاتف'} • آخر تعامل: {ledgerEntries.length > 0 ? safeFormatDate(ledgerEntries[ledgerEntries.length -1].date, 'yyyy/MM/dd') : 'لا يوجد'}</p>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Button onClick={onEditEntity} variant="outline" size="sm" className="gap-2 border-border text-foreground hover:bg-muted whitespace-nowrap">
            <Edit className="h-4 w-4" />
            تعديل
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger className="h-7 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all outline-none">
              <Plus className="h-4 w-4" />
              إجراء سريع
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border text-foreground w-48 p-2 rounded-xl">
              <DropdownMenuItem className="gap-2 p-3 cursor-pointer rounded-lg hover:bg-muted" onClick={onAddInvoice}>
                <FileText className="h-4 w-4 text-blue-500" />
                <span>إضافة فاتورة</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 p-3 cursor-pointer rounded-lg hover:bg-muted" onClick={onMultiEntry}>
                <LayoutDashboard className="h-4 w-4 text-primary" />
                <span>إدخال متعدد</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 p-3 cursor-pointer rounded-lg hover:bg-muted" onClick={onAddPayment}>
                <Receipt className="h-4 w-4 text-emerald-500" />
                <span>تسديد دفعة</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 p-3 cursor-pointer rounded-lg hover:bg-muted" onClick={onAddBonus}>
                <Gift className="h-4 w-4 text-amber-500" />
                <span>إضافة بونص</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 p-3 cursor-pointer rounded-lg hover:bg-muted" onClick={onImportExcel}>
                <FileUp className="h-4 w-4 text-emerald-500" />
                <span>استيراد من Excel</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem className="gap-2 p-3 cursor-pointer rounded-lg hover:bg-muted text-primary" onClick={onImportHistorical}>
                <RefreshCcw className="h-4 w-4" />
                <span>استيراد فواتير قديمة</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className={`grid gap-4 ${appMode === 'laptop' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-7' : 'grid-cols-2'}`}>
        {[
          { label: 'إجمالي الدين الحالي', value: stats.totalCurrentDebt, color: 'text-rose-600', border: 'border-r-rose-600' },
          { label: 'متبقي الافتتاحي', value: stats.remainingOpeningBalance, color: 'text-amber-600', border: 'border-r-amber-500' },
          { label: 'متبقي الفواتير', value: stats.totalRemainingInvoices, color: 'text-blue-600', border: 'border-r-blue-500' },
          { label: 'إجمالي المشتريات', value: stats.totalPurchases, color: 'text-foreground', border: 'border-r-primary' },
          { label: 'إجمالي التسديدات', value: stats.totalPayments, color: 'text-emerald-600', border: 'border-r-emerald-500' },
          { label: 'الفواتير المفتوحة', value: stats.openInvoices, color: 'text-foreground', border: 'border-r-blue-500', isCount: true },
          { label: 'البونصات المنتظرة', value: stats.pendingBonuses, color: 'text-primary', border: 'border-r-primary', isCount: true },
        ].map((stat, idx) => (
          <Card key={idx} className={`bg-card border-border border-r-4 ${stat.border} group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 rounded-2xl`}>
            <CardContent className="p-4 md:p-6 text-center">
              <div className="text-[10px] font-black text-muted-foreground uppercase mb-2 tracking-widest leading-tight">{stat.label}</div>
              <div className={`text-lg md:text-xl font-black ${stat.color} font-mono tracking-tighter`}>
                {stat.isCount ? stat.value : formatNumberWithCommas(stat.value)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-muted p-1 border border-border w-full justify-start overflow-x-auto rounded-xl h-auto flex flex-nowrap scrollbar-none">
          <TabsTrigger value="overview" className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm whitespace-nowrap">
            <LayoutDashboard className="h-4 w-4" />
            الحساب العام
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm whitespace-nowrap">
            <FileText className="h-4 w-4" />
            الفواتير
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm whitespace-nowrap">
            <Receipt className="h-4 w-4" />
            التسديدات
          </TabsTrigger>
          <TabsTrigger value="monthly" className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm whitespace-nowrap">
            <BarChart3 className="h-4 w-4" />
            المشتريات الشهرية
          </TabsTrigger>
          <TabsTrigger value="bonuses" className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm whitespace-nowrap">
            <Gift className="h-4 w-4" />
            البونصات
          </TabsTrigger>
          <TabsTrigger value="archive" className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm whitespace-nowrap">
            <History className="h-4 w-4 text-primary" />
             الأرشيف القديم
          </TabsTrigger>
          <TabsTrigger value="attachments" className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm whitespace-nowrap">
            <ImageIcon className="h-4 w-4" />
            المرفقات
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm whitespace-nowrap">
            <Clock className="h-4 w-4" />
            الجدول الزمني
          </TabsTrigger>
          <TabsTrigger value="statement" className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm whitespace-nowrap">
            <DollarSign className="h-4 w-4" />
            كشف الحساب
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="overview" className="animate-in fade-in zoom-in-95 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg font-black">معلومات المورد المتقدمة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <div className="text-[10px] text-muted-foreground uppercase font-black">الرصيد الافتتاحي الأصلي</div>
                      <div className="font-bold text-foreground font-mono">{formatIQD(stats.originalOpeningBalance)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] text-muted-foreground uppercase font-black">المسدد من الافتتاحي</div>
                      <div className="font-bold text-emerald-600 font-mono">{formatIQD(stats.paidFromOpeningBalance)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] text-muted-foreground uppercase font-black">المتبقي من الافتتاحي</div>
                      <div className="font-bold text-amber-600 font-mono">{formatIQD(stats.remainingOpeningBalance)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] text-muted-foreground uppercase font-black">إجمالي التسديدات</div>
                      <div className="font-bold text-emerald-600 font-mono">{formatIQD(stats.totalPayments)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] text-muted-foreground uppercase font-black">عدد الفواتير</div>
                      <div className="font-bold text-foreground">{stats.invoiceCount} فواتير</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] text-muted-foreground uppercase font-black">حالة الحساب</div>
                      <div className={`flex items-center gap-1 font-bold ${entity.status === 'مؤرشف' ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {entity.status === 'مؤرشف' ? <History className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        {entity.status || 'نشط'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] text-muted-foreground uppercase font-black">آخر تسديد</div>
                      <div className="font-bold text-foreground">{stats.lastPaymentDate ? safeFormatDate(stats.lastPaymentDate, 'yyyy/MM/dd') : 'لا يوجد'}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] text-muted-foreground uppercase font-black">آخر فاتورة</div>
                      <div className="font-bold text-foreground">{stats.lastInvoiceDate ? safeFormatDate(stats.lastInvoiceDate, 'yyyy/MM/dd') : 'لا يوجد'}</div>
                    </div>
                  </div>
                  <div className="space-y-1 border-t border-border pt-4">
                    <div className="text-xs text-muted-foreground">ملاحظات</div>
                    <p className="text-sm text-foreground italic">{entity.notes || 'لا توجد ملاحظات إضافية'}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg font-black">الكشف السريع</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {ledgerEntries.slice(-5).reverse().map((entry) => (
                      <div key={entry.id} className="p-4 flex justify-between items-center hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            entry.operationType === 'invoice' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'
                          }`}>
                            {entry.operationType === 'invoice' ? <FileText className="h-4 w-4" /> : <Receipt className="h-4 w-4" />}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-foreground">
                              {entry.operationType === 'invoice' ? `فاتورة رقم ${entry.invoiceNumber}` : 'دفعة سداد'}
                            </div>
                            <div className="text-[10px] text-muted-foreground">{safeFormatDate(entry.date, 'yyyy/MM/dd HH:mm')}</div>
                          </div>
                        </div>
                        <div className={`font-bold font-mono text-sm ${entry.operationType === 'invoice' ? 'text-blue-500' : 'text-emerald-500'}`}>
                          {entry.operationType === 'invoice' ? '+' : '-'}{formatNumberWithCommas(entry.netAmount)}
                        </div>
                      </div>
                    ))}
                    {ledgerEntries.length === 0 && (
                      <div className="p-8 text-center text-muted-foreground text-sm italic">لا يوجد سجل عمليات لهذا المورد حتى الآن</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="invoices" className="animate-in fade-in zoom-in-95 duration-300">
            <Card className="bg-card border-border overflow-hidden">
               {appMode === 'laptop' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead className="bg-muted/50 border-b border-border text-[10px] font-bold text-muted-foreground uppercase">
                      <tr>
                        <th className="px-6 py-4">رقم القائمة</th>
                        <th className="px-6 py-4 text-center">التاريخ</th>
                        <th className="px-6 py-4">المبلغ الكلي</th>
                        <th className="px-6 py-4">المتبقي</th>
                        <th className="px-6 py-4">الخصم</th>
                        <th className="px-6 py-4 text-center">الاستحقاق</th>
                        <th className="px-6 py-4 text-center">موعد التسديد</th>
                        <th className="px-6 py-4 text-center">الحالة</th>
                        <th className="px-6 py-4 text-center">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {ledgerEntries.filter(e => e.operationType === 'invoice').reverse().map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-muted/30 transition-colors group">
                          <td className="px-6 py-4 font-bold text-foreground">{invoice.invoiceNumber}</td>
                          <td className="px-6 py-4 text-center font-mono text-muted-foreground text-xs">{safeFormatDate(invoice.date, 'yyyy/MM/dd')}</td>
                          <td className="px-6 py-4 font-bold font-mono">{formatNumberWithCommas(invoice.amount)}</td>
                          <td className="px-6 py-4 font-bold font-mono text-amber-500">{formatNumberWithCommas(invoice.remainingAmount || 0)}</td>
                          <td className="px-6 py-4 font-bold font-mono text-emerald-500">{formatNumberWithCommas(invoice.discount || 0)}</td>
                          <td className="px-6 py-4 text-center font-mono text-muted-foreground text-xs">{invoice.dueDate ? safeFormatDate(invoice.dueDate, 'yyyy/MM/dd') : '-'}</td>
                          <td className="px-6 py-4 text-center">
                            {(() => {
                              const deadline = deadlines.find(d => d.invoiceId === invoice.id && d.status === 'pending');
                              return (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className={`h-8 gap-1 rounded-lg font-bold text-[10px] ${deadline ? 'text-primary bg-primary/5 hover:bg-primary/10' : 'text-muted-foreground hover:bg-muted'}`}
                                  onClick={() => onSetDeadline?.({
                                    id: invoice.id!,
                                    number: invoice.invoiceNumber!,
                                    amount: invoice.remainingAmount || 0,
                                    accountId: entity.id!,
                                    accountName: entity.name
                                  })}
                                >
                                  <Clock className={`h-3 w-3 ${deadline ? 'text-primary' : 'text-muted-foreground'}`} />
                                  {deadline ? safeFormatDate(deadline.dueDate, 'MM/dd') : 'تحديد موعد'}
                                </Button>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                              invoice.paymentStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-500' :
                              invoice.paymentStatus === 'partial' ? 'bg-blue-500/10 text-blue-500' :
                              invoice.paymentStatus === 'overdue' ? 'bg-rose-500/10 text-rose-500' :
                              'bg-amber-500/10 text-amber-500'
                            }`}>
                              {invoice.paymentStatus === 'paid' ? 'مسدد' :
                               invoice.paymentStatus === 'partial' ? 'جزئي' :
                               invoice.paymentStatus === 'overdue' ? 'متأخر' : 'غير مسدد'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted outline-none transition-colors">
                                <MoreVertical className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-card border-border text-foreground w-48 p-2 rounded-xl">
                                <DropdownMenuItem className="gap-2 p-3 cursor-pointer rounded-lg hover:bg-muted" onClick={() => onViewInvoice(invoice)}>
                                  <Eye className="h-4 w-4 text-blue-500" />
                                  <span>عرض القائمة</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 p-3 cursor-pointer rounded-lg hover:bg-muted" onClick={() => onEditInvoice(invoice)}>
                                  <Edit className="h-4 w-4 text-amber-500" />
                                  <span>تعديل القائمة</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 p-3 cursor-pointer rounded-lg hover:bg-muted" onClick={() => onFullPayment(invoice)}>
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                  <span>تسديد كلي</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 p-3 cursor-pointer rounded-lg hover:bg-muted" onClick={() => onRefundInvoice(invoice)}>
                                  <RefreshCcw className="h-4 w-4 text-rose-500" />
                                  <span>استرجاع (مرتجع)</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 p-3 cursor-pointer rounded-lg hover:bg-muted" onClick={() => onSetDeadline?.({
                                   id: invoice.id!,
                                   number: invoice.invoiceNumber!,
                                   amount: invoice.remainingAmount || 0,
                                   accountId: entity.id!,
                                   accountName: entity.name
                                 })}>
                                  <Clock className="h-4 w-4 text-primary" />
                                  <span>تحديد موعد تسديد</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-border" />
                                <DropdownMenuItem className="gap-2 p-3 cursor-pointer rounded-lg hover:bg-muted text-rose-500" onClick={() => onDeleteInvoice(invoice)}>
                                  <Trash2 className="h-4 w-4" />
                                  <span>حذف القائمة</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                      {ledgerEntries.filter(e => e.operationType === 'invoice').length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-20 text-center text-muted-foreground">لا توجد فواتير مسجلة</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
               ) : (
                 <div className="divide-y divide-border">
                    {ledgerEntries.filter(e => e.operationType === 'invoice').reverse().map((invoice) => (
                      <div key={invoice.id} className="p-4 space-y-4 hover:bg-muted/30 transition-colors">
                        <div className="flex justify-between items-start">
                          <div onClick={() => onViewInvoice(invoice)} className="cursor-pointer">
                            <div className="font-black text-foreground">قائمة رقم: {invoice.invoiceNumber}</div>
                            <div className="text-[10px] text-muted-foreground font-bold">{safeFormatDate(invoice.date, 'yyyy/MM/dd')}</div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted outline-none transition-colors">
                              <MoreVertical className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border-border text-foreground w-48 p-2 rounded-xl">
                              <DropdownMenuItem className="gap-2 p-3 cursor-pointer rounded-lg hover:bg-muted" onClick={() => onViewInvoice(invoice)}>
                                <Eye className="h-4 w-4 text-blue-500" />
                                <span>عرض القائمة</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 p-3 cursor-pointer rounded-lg hover:bg-muted" onClick={() => onEditInvoice(invoice)}>
                                <Edit className="h-4 w-4 text-amber-500" />
                                <span>تعديل</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 p-3 cursor-pointer rounded-lg hover:bg-muted" onClick={() => onFullPayment(invoice)}>
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                <span>تسديد كلي</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 p-3 cursor-pointer rounded-lg hover:bg-muted text-rose-500" onClick={() => onDeleteInvoice(invoice)}>
                                <Trash2 className="h-4 w-4" />
                                <span>حذف</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                           <div className="p-2 bg-muted rounded-lg flex justify-between">
                              <span className="text-muted-foreground">الصافي:</span>
                              <span className="font-mono text-foreground">{formatNumberWithCommas(invoice.amount)}</span>
                           </div>
                           <div className={`p-2 rounded-lg flex justify-between ${invoice.remainingAmount && invoice.remainingAmount > 0 ? 'bg-amber-500/5 text-amber-600' : 'bg-emerald-500/5 text-emerald-600'}`}>
                              <span className="opacity-70">المتبقي:</span>
                              <span className="font-mono">{formatNumberWithCommas(invoice.remainingAmount || 0)}</span>
                           </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            invoice.paymentStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-500' :
                            invoice.paymentStatus === 'partial' ? 'bg-blue-500/10 text-blue-500' :
                            invoice.paymentStatus === 'overdue' ? 'bg-rose-500/10 text-rose-500' :
                            'bg-amber-500/10 text-amber-500'
                          }`}>
                            {invoice.paymentStatus === 'paid' ? 'تم التسديد' : 
                             invoice.paymentStatus === 'overdue' ? 'متأخرة السداد' : 'قيد الانتظار'}
                          </span>
                          {invoice.dueDate && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground" title="تاريخ الاستحقاق">
                              <Clock className="h-3 w-3" />
                              <span>{safeFormatDate(invoice.dueDate, 'MM/dd')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {ledgerEntries.filter(e => e.operationType === 'invoice').length === 0 && (
                      <div className="py-20 text-center text-muted-foreground">لا توجد فواتير مسجلة</div>
                    )}
                 </div>
               )}
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="animate-in fade-in zoom-in-95 duration-300">
             <div className="space-y-6 relative before:absolute before:right-6 before:top-4 before:bottom-4 before:w-px before:bg-border">
                {ledgerEntries.filter(e => e.operationType === 'payment').reverse().map((payment) => (
                  <div key={payment.id} className="relative pr-12">
                    <div className="absolute right-[21px] top-1 w-2 h-2 rounded-full bg-emerald-500 border-2 border-background z-10" />
                    <Card className="bg-card border-border overflow-hidden">
                       <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                          <div className="flex items-center gap-3">
                             <div className="p-2 bg-emerald-500/10 rounded-lg">
                                <Receipt className="h-5 w-5 text-emerald-500" />
                             </div>
                             <div>
                                <CardTitle className="text-sm font-bold">
                                   {payment.sourceType === 'supplier_opening_balance_payment' || payment.paymentSource === 'opening_balance' ? 'تسديد رصيد افتتاحي' : 
                                     payment.paymentSource === 'invoice' ? 'تسديد فاتورة' : 'تسديد عام'}
                                   {payment.linkedInvoiceNumber && (
                                     <span className="mr-1 text-primary">({payment.linkedInvoiceNumber})</span>
                                   )}
                                </CardTitle>
                                <div className="text-[10px] text-muted-foreground">{safeFormatDate(payment.date, 'yyyy/MM/dd HH:mm')}</div>
                             </div>
                          </div>
                          <div className="flex items-center gap-4">
                             <div className="text-lg font-black text-emerald-500 font-mono">-{formatNumberWithCommas(payment.amount || 0)}</div>
                             <DropdownMenu>
                                <DropdownMenuTrigger className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted outline-none transition-colors">
                                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-card border-border text-foreground w-40 p-1">
                                  <DropdownMenuItem className="gap-2 p-2 cursor-pointer rounded-lg hover:bg-muted" onClick={() => onEditPayment?.(payment)}>
                                    <Edit className="h-4 w-4 text-primary" />
                                    <span>تعديل</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="gap-2 p-2 cursor-pointer rounded-lg hover:bg-muted text-rose-500" onClick={() => onDeletePayment?.(payment.id!)}>
                                    <Trash2 className="h-4 w-4" />
                                    <span>حذف</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                             </DropdownMenu>
                          </div>
                       </CardHeader>
                       <CardContent className="p-4 pt-0">
                          <p className="text-xs text-muted-foreground mb-4">{payment.notes || 'لا يوجد ملاحظات على هذه الدفعة'}</p>
                          {payment.imageUrl && (
                             <div className="w-32 h-32 rounded-lg border border-border overflow-hidden cursor-zoom-in" onClick={() => onShowImage?.(payment.imageUrl || '')}>
                                <img src={payment.imageUrl} alt="Bond" className="w-full h-full object-cover" />
                             </div>
                          )}
                       </CardContent>
                    </Card>
                  </div>
                ))}
                {ledgerEntries.filter(e => e.operationType === 'payment').length === 0 && (
                  <div className="py-20 text-center text-muted-foreground italic">لا توجد سجلات دفع لهذا المورد</div>
                )}
             </div>
          </TabsContent>

          <TabsContent value="monthly" className="animate-in fade-in zoom-in-95 duration-300">
             <Card className="bg-card border-border overflow-hidden rounded-2xl">
                <div className="overflow-x-auto">
                   <table className="w-full text-right">
                      <thead className="bg-muted/50 border-b border-border text-[10px] font-bold text-muted-foreground uppercase">
                         <tr>
                            <th className="px-6 py-4">الشهر والسنة</th>
                            <th className="px-6 py-4 text-center">عدد الفواتير</th>
                            <th className="px-6 py-4">إجمالي المشتريات</th>
                            <th className="px-6 py-4">المسدد</th>
                            <th className="px-6 py-4">المتبقي</th>
                            <th className="px-6 py-4 text-center">النسبة</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                         {monthlyPurchases.map((m: any, idx: number) => {
                            const percent = m.total > 0 ? (m.paid / m.total) * 100 : 0;
                            return (
                               <tr key={idx} className="hover:bg-muted/30 transition-colors">
                                  <td className="px-6 py-4 font-bold text-foreground">
                                     {m.monthName} {m.year}
                                  </td>
                                  <td className="px-6 py-4 text-center font-bold text-muted-foreground">{m.count}</td>
                                  <td className="px-6 py-4 font-black font-mono text-foreground">{formatNumberWithCommas(m.total)}</td>
                                  <td className="px-6 py-4 font-bold font-mono text-emerald-600">{formatNumberWithCommas(m.paid)}</td>
                                  <td className="px-6 py-4 font-bold font-mono text-rose-500">{formatNumberWithCommas(m.remaining)}</td>
                                  <td className="px-6 py-4 text-center">
                                     <div className="flex items-center gap-2 justify-center">
                                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                           <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, percent)}%` }} />
                                        </div>
                                        <span className="text-[10px] font-bold text-muted-foreground">{percent.toFixed(0)}%</span>
                                     </div>
                                  </td>
                               </tr>
                            );
                         })}
                      </tbody>
                   </table>
                </div>
             </Card>
          </TabsContent>

          <TabsContent value="bonuses" className="animate-in fade-in zoom-in-95 duration-300">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bonuses.reverse().map((bonus) => (
                  <Card key={bonus.id} className="bg-card border-border overflow-hidden">
                    <div className={`h-1.5 w-full ${bonus.status === 'received' ? 'bg-emerald-500' : bonus.status === 'pending' ? 'bg-amber-500' : 'bg-slate-500'}`} />
                    <CardHeader className="p-4">
                       <div className="flex justify-between items-start">
                          <div>
                             <CardTitle className="text-base font-bold">{bonus.description}</CardTitle>
                             <div className="text-xs text-muted-foreground mt-1">تاريخ الاستحقاق: {safeFormatDate(bonus.dueDate, 'yyyy/MM/dd')}</div>
                          </div>
                          <div className="flex items-center gap-2">
                             <DropdownMenu>
                                <DropdownMenuTrigger className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted outline-none transition-colors">
                                  <MoreHorizontal className="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-card border-border text-foreground w-40 p-1">
                                  <DropdownMenuItem className="gap-2 p-2 cursor-pointer rounded-lg hover:bg-muted" onClick={() => onEditBonus?.(bonus)}>
                                    <Edit className="h-4 w-4 text-amber-500" />
                                    <span>تعديل</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="gap-2 p-2 cursor-pointer rounded-lg hover:bg-muted text-rose-500" onClick={() => onDeleteBonus?.(bonus.id!)}>
                                    <Trash2 className="h-4 w-4" />
                                    <span>حذف</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                             </DropdownMenu>
                             <Gift className={`h-5 w-5 ${bonus.status === 'received' ? 'text-emerald-500' : 'text-amber-500'}`} />
                          </div>
                       </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-4">
                       <div className="flex justify-between items-center">
                          <div className="text-xl font-black text-foreground font-mono">{formatNumberWithCommas(bonus.amount || 0)}</div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                             bonus.status === 'received' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            {bonus.status === 'received' ? 'تم الاستلام' : 'قيد الانتظار'}
                          </span>
                       </div>
                       {bonus.notes && <p className="text-xs text-muted-foreground italic border-t border-border pt-4">{bonus.notes}</p>}
                    </CardContent>
                  </Card>
                ))}
                {bonuses.length === 0 && (
                  <div className="col-span-full py-20 text-center text-muted-foreground italic">لا توجد بونصات مسجلة حالياً</div>
                )}
             </div>
          </TabsContent>

          <TabsContent value="archive" className="animate-in fade-in zoom-in-95 duration-300">
             <div className="space-y-6">
                <Card className="bg-muted/50 border-border p-4 rounded-2xl">
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                         <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right block">السنة</Label>
                         <Select value={archiveYear} onValueChange={setArchiveYear}>
                            <SelectTrigger className="bg-card h-10 border-border rounded-xl text-xs font-bold text-right">
                               <SelectValue placeholder="السنة" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border text-xs font-bold">
                               <SelectItem value="all">كل السنوات</SelectItem>
                               {['2020','2021','2022','2023','2024','2025','2026'].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                            </SelectContent>
                         </Select>
                      </div>
                      <div className="space-y-2">
                         <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right block">الشهر</Label>
                         <Select value={archiveMonth} onValueChange={setArchiveMonth}>
                            <SelectTrigger className="bg-card h-10 border-border rounded-xl text-xs font-bold text-right">
                               <SelectValue placeholder="الشهر" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border text-xs font-bold">
                               <SelectItem value="all">كل الأشهر</SelectItem>
                               {Array.from({length: 12}).map((_, i) => (
                                 <SelectItem key={i+1} value={(i+1).toString()}>{safeFormatDate(new Date(2024, i, 1), 'MMMM')}</SelectItem>
                               ))}
                            </SelectContent>
                         </Select>
                      </div>
                      <div className="space-y-2">
                         <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right block">حالة الدفع</Label>
                         <Select value={archiveStatus} onValueChange={setArchiveStatus}>
                            <SelectTrigger className="bg-card h-10 border-border rounded-xl text-xs font-bold text-right">
                               <SelectValue placeholder="الحالة" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border text-xs font-bold">
                               <SelectItem value="all">الكل</SelectItem>
                               <SelectItem value="paid">مسددة</SelectItem>
                               <SelectItem value="unpaid">غير مسددة</SelectItem>
                               <SelectItem value="partial">جزئي</SelectItem>
                            </SelectContent>
                         </Select>
                      </div>
                      <div className="space-y-2">
                         <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right block">رقم الفاتورة</Label>
                         <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input 
                              placeholder="بحث برقم الفاتورة..." 
                              value={archiveSearch}
                              onChange={e => setArchiveSearch(e.target.value)}
                              className="bg-card h-10 pr-9 border-border rounded-xl text-xs font-bold text-right"
                            />
                         </div>
                      </div>
                   </div>
                </Card>

                <div className="border border-border rounded-2xl overflow-hidden bg-card">
                   <table className="w-full text-xs">
                      <thead className="bg-muted text-muted-foreground font-black border-b border-border">
                         <tr>
                            <th className="px-4 py-3 text-right">رقم الفاتورة</th>
                            <th className="px-4 py-3 text-right">التاريخ</th>
                            <th className="px-4 py-3 text-right">المبلغ الصافي</th>
                            <th className="px-4 py-3 text-right">المسدد</th>
                            <th className="px-4 py-3 text-right">المتبقي</th>
                            <th className="px-4 py-3 text-right">الحالة</th>
                            <th className="px-4 py-3 text-right w-10">المرفقات</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50 text-right">
                         {filteredArchive.map((inv) => {
                            const remaining = inv.netAmount - (inv.paidAmount || 0);
                            return (
                               <tr key={inv.id} className="hover:bg-muted/10 group cursor-pointer" onClick={() => onViewInvoice(inv)}>
                                  <td className="px-4 py-4 font-black flex items-center gap-2">
                                     <span className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-[8px]">قديمة</span>
                                     {inv.invoiceNumber}
                                  </td>
                                  <td className="px-4 py-4 font-bold">{safeFormatDate(inv.date, 'yyyy/MM/dd')}</td>
                                  <td className="px-4 py-4 font-mono font-bold">{formatNumberWithCommas(inv.netAmount)}</td>
                                  <td className="px-4 py-4 font-mono font-bold text-emerald-600">{formatNumberWithCommas(inv.paidAmount || 0)}</td>
                                  <td className="px-4 py-4 font-mono font-bold text-rose-600">{formatNumberWithCommas(remaining)}</td>
                                  <td className="px-4 py-4 text-center">
                                     <span className={`px-2 py-0.5 rounded-full font-black text-[9px] ${
                                        inv.paymentStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-600' :
                                        inv.paymentStatus === 'partial' ? 'bg-blue-500/10 text-blue-600' : 'bg-rose-500/10 text-rose-600'
                                     }`}>
                                        {inv.paymentStatus === 'paid' ? 'مسددة بالكامل' : inv.paymentStatus === 'partial' ? 'مسددة جزئياً' : 'غير مسددة'}
                                     </span>
                                  </td>
                                  <td className="px-4 py-4">
                                     <div className="flex gap-1 overflow-hidden truncate">
                                        {(inv.imageUrls?.length || 0) > 0 && <ImageIcon className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                                     </div>
                                  </td>
                               </tr>
                            );
                         })}
                         {filteredArchive.length === 0 && (
                            <tr>
                               <td colSpan={7} className="px-4 py-20 text-center text-muted-foreground font-bold italic">
                                  لاتوجد فواتير قديمة مطابقة للفلاتر
                               </td>
                            </tr>
                         )}
                      </tbody>
                   </table>
                </div>
             </div>
          </TabsContent>

          <TabsContent value="attachments" className="animate-in fade-in zoom-in-95 duration-300">
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {ledgerEntries.filter(e => e.imageUrl || e.receiptImageUrl || (e.imageUrls && e.imageUrls.length > 0)).map((e) => {
                  const urls = e.imageUrls && e.imageUrls.length > 0 ? e.imageUrls : [e.imageUrl || e.receiptImageUrl || ''];
                  return urls.filter(u => !!u).map((url, uidx) => (
                    <Card key={`${e.id}-${uidx}`} className="group relative aspect-square overflow-hidden border-border bg-muted hover:border-emerald-500 transition-all">
                      <img 
                        src={url} 
                        alt="Attachment" 
                        className="w-full h-full object-cover transition-transform group-hover:scale-110 cursor-zoom-in" 
                        onClick={() => onShowImage?.(url)}
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all pointer-events-none">
                         <span className="text-[10px] text-white font-bold">{e.operationType === 'invoice' ? 'صورة فاتورة' : 'صورة وصل'}</span>
                         <span className="text-[8px] text-white/60 font-mono mt-1">{safeFormatDate(e.date, 'yyyy/MM/dd')}</span>
                      </div>
                      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <Button 
                          size="icon" 
                          variant="destructive" 
                          className="h-7 w-7 rounded-lg"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onDeleteAttachment?.(e.id!, url);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ));
                })}
                {ledgerEntries.filter(e => e.imageUrl || e.receiptImageUrl || (e.imageUrls && e.imageUrls.length > 0)).length === 0 && (
                  <div className="col-span-full py-20 text-center text-muted-foreground italic">لا توجد مرفقات صور لهذا الحساب</div>
                )}
             </div>
          </TabsContent>

          <TabsContent value="timeline" className="animate-in fade-in zoom-in-95 duration-300">
             <div className="space-y-4">
                {timelineItems.length === 0 && (
                  <div className="py-20 text-center text-muted-foreground italic">لا يوجد نشاط مسجل لهذا المورد بعد</div>
                )}
                {timelineItems.map((item: any, idx) => {
                  const isActivity = 'type' in item && ['update_entity', 'archive_entity', 'delete_entity', 'update_invoice', 'delete_invoice', 'add_invoice'].includes(item.type);
                  
                  return (
                    <div key={item.id || idx} className="flex gap-4 items-start border-r-2 border-border pr-2 pb-4 hover:bg-muted/5 transition-colors rounded-l-xl">
                      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
                         isActivity ? 'bg-slate-500/10 text-slate-500' :
                         item.operationType === 'invoice' ? 'bg-blue-500/10 text-blue-500' :
                         item.operationType === 'payment' ? 'bg-emerald-500/10 text-emerald-500' :
                         'bg-purple-500/10 text-purple-500'
                      }`}>
                         {isActivity ? <Settings className="h-4 w-4" /> :
                          item.operationType === 'invoice' ? <FileText className="h-4 w-4" /> :
                          item.operationType === 'payment' ? <Receipt className="h-4 w-4" /> :
                          <Gift className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                         <div className="flex justify-between items-center gap-2">
                            <h4 className="text-sm font-bold text-foreground truncate">
                               {isActivity ? item.action :
                                item.operationType === 'invoice' ? `إضافة فاتورة جديدة رقم ${item.invoiceNumber}` :
                                item.operationType === 'payment' ? `تسديد دفعة مالية بمبلغ ${formatIQD(item.amount || 0)}` :
                                `تسجيل بونص جديد: ${item.description}`}
                            </h4>
                            <span className="text-[9px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded shrink-0">{safeFormatDate(item.createdAt || item.date, 'yyyy/MM/dd HH:mm')}</span>
                         </div>
                         <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {isActivity ? item.details : (item.notes || 'تمت العملية بنجاح بواسطة النظام')}
                         </p>
                         {isActivity && item.performedBy && (
                            <span className="inline-flex items-center gap-1 text-[8px] bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded mt-2 font-bold">
                               <Users className="h-2 w-2" />
                               بواسطة: {item.performedBy}
                            </span>
                         )}
                      </div>
                    </div>
                  );
                })}
             </div>
          </TabsContent>
          <TabsContent value="statement" className="animate-in fade-in zoom-in-95 duration-300">
             <Card className="bg-card border-border overflow-hidden rounded-2xl">
                <div className="overflow-x-auto">
                   <table className="w-full text-right">
                      <thead className="bg-muted/50 border-b border-border text-[10px] font-bold text-muted-foreground uppercase">
                         <tr>
                            <th className="px-6 py-4">التاريخ</th>
                            <th className="px-6 py-4">التفاصيل</th>
                            <th className="px-6 py-4 text-center">مدين (قوائم)</th>
                            <th className="px-6 py-4 text-center">دائن (تسديدات)</th>
                            <th className="px-6 py-4 text-center">الرصيد</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                         {(() => {
                            let runningBalance = 0;
                            const rows = [];
                            
                            // Start with Initial Balance
                            if (Number(entity.initialBalance || 0) > 0) {
                              const initialDate = entity.initialBalanceDate || entity.createdAt || new Date(2024, 0, 1);
                              runningBalance = Number(entity.initialBalance);
                              rows.push(
                                <tr key="initial" className="bg-muted/10 italic">
                                   <td className="px-6 py-4 text-xs font-mono">{safeFormatDate(initialDate, 'yyyy/MM/dd')}</td>
                                   <td className="px-6 py-4 font-bold text-sm text-rose-600">
                                      <div className="flex flex-col">
                                         <span>رصيد افتتاحي (مرحل)</span>
                                         {entity.initialBalanceNotes && <span className="text-[10px] text-muted-foreground font-normal">{entity.initialBalanceNotes}</span>}
                                      </div>
                                   </td>
                                   <td className="px-6 py-4 text-center font-mono text-rose-600 font-black">{formatNumberWithCommas(entity.initialBalance)}</td>
                                   <td className="px-6 py-4 text-center font-mono">-</td>
                                   <td className="px-6 py-4 text-center font-mono font-black">{formatNumberWithCommas(runningBalance)}</td>
                                </tr>
                              );
                            }

                            const sortedEntries = [...ledgerEntries].filter(e => !e.isDeleted).sort((a,b) => toValidDate(a.date).getTime() - toValidDate(b.date).getTime());
                            
                            sortedEntries.forEach(e => {
                               let debit = Number(e.debit) || 0;
                               let credit = Number(e.credit) || 0;
                               
                               // Legacy fallback
                               if (debit === 0 && credit === 0 && Number(e.amount) > 0) {
                                  if (e.operationType === 'invoice' || e.sourceType === 'supplier_opening_balance') {
                                     debit = Number(e.netAmount || e.amount);
                                  } else if (e.operationType === 'payment' || e.sourceType === 'payment' || e.sourceType === 'supplier_opening_payment') {
                                     credit = Number(e.amount) + (Number(e.discount) || 0) - (Number(e.refundAmount) || 0);
                                  } else if (e.operationType === 'refund' || e.sourceType === 'return') {
                                     credit = Number(e.refundAmount || e.amount);
                                  }
                               }

                               let desc = e.description || '';
                               if (!desc || desc.length < 5) {
                                  if (e.sourceType === 'supplier_opening_balance') desc = 'رصيد افتتاحي (دين مرحل)';
                                  else if (e.sourceType === 'supplier_opening_balance_payment' || e.paymentSource === 'opening_balance') desc = 'تسديد من الرصيد الافتتاحي';
                                  else if (e.operationType === 'invoice') desc = `فاتورة شراء رقم: ${e.invoiceNumber || 'غير محدد'}`;
                                  else if (e.operationType === 'payment' || e.sourceType === 'payment') desc = `تسديد فاتورة/عام: ${e.linkedInvoiceNumber || 'عام'}`;
                                  else if (e.sourceType === 'return' || e.operationType === 'refund') desc = `مرتجع مشتريات: ${e.linkedInvoiceNumber || ''}`;
                                  else if (e.sourceType === 'adjustment') desc = `تعديل رصيد: ${e.notes || ''}`;
                               }
                               
                               runningBalance += (debit - credit);
                               
                               rows.push(
                                  <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                                     <td className="px-6 py-4 text-xs font-mono text-muted-foreground">{safeFormatDate(e.date, 'yyyy/MM/dd')}</td>
                                     <td className="px-6 py-4 font-bold text-sm">
                                        <div className="flex flex-col">
                                           <span>{desc}</span>
                                           {e.notes && <span className="text-[10px] text-muted-foreground font-normal">{e.notes}</span>}
                                        </div>
                                     </td>
                                     <td className="px-6 py-4 text-center font-mono text-rose-500 font-bold">{debit > 0 ? formatNumberWithCommas(debit) : '-'}</td>
                                     <td className="px-6 py-4 text-center font-mono text-emerald-500 font-bold">{credit > 0 ? formatNumberWithCommas(credit) : '-'}</td>
                                     <td className="px-6 py-4 text-center font-mono font-black text-foreground">{formatNumberWithCommas(runningBalance)}</td>
                                  </tr>
                               );
                            });
                            
                            return rows.reverse();
                         })()}
                      </tbody>
                   </table>
                </div>
             </Card>
          </TabsContent>
        </div>
      </Tabs>

      {supplierOpeningBalances.length > 0 && (
         <Card className="bg-card border-border border-r-4 border-r-amber-500 overflow-hidden rounded-2xl shadow-lg shadow-amber-500/5">
            <CardHeader className="bg-amber-500/5">
               <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-amber-500/10 rounded-lg">
                        <History className="h-5 w-5 text-amber-600" />
                     </div>
                     <CardTitle className="text-lg font-black text-amber-700">الرصيد / الدين الافتتاحي</CardTitle>
                  </div>
                  <div className="text-[10px] font-black text-amber-600 bg-amber-500/10 px-2 py-1 rounded-full uppercase tracking-tighter">ديون مرحلة</div>
               </div>
            </CardHeader>
            <CardContent className="p-0">
               <div className="overflow-x-auto">
                  <table className="w-full text-right">
                     <thead className="bg-muted/50 border-b border-border text-[10px] font-black text-muted-foreground uppercase">
                        <tr>
                           <th className="px-6 py-4">أصل الدين</th>
                           <th className="px-6 py-4">المسدد</th>
                           <th className="px-6 py-4">المتبقي</th>
                           <th className="px-6 py-4 text-center">تاريخ الإدخال</th>
                           <th className="px-6 py-4 text-center font-bold">موعد التسديد</th>
                           <th className="px-6 py-4 text-center">الإجراءات</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-border">
                        {supplierOpeningBalances.map((op) => (
                           <tr key={op.id} className="hover:bg-amber-50/10 transition-colors">
                              <td className="px-6 py-4 font-black font-mono text-foreground text-lg">{formatNumberWithCommas(op.openingAmount)}</td>
                              <td className="px-6 py-4 font-bold font-mono text-emerald-600">{formatNumberWithCommas(op.paidAmount || 0)}</td>
                              <td className="px-6 py-4 font-black font-mono text-rose-600 text-lg">{formatNumberWithCommas(op.remainingAmount || 0)}</td>
                              <td className="px-6 py-4 text-center font-mono text-muted-foreground text-xs">{safeFormatDate(op.date, 'yyyy/MM/dd')}</td>
                              <td className="px-6 py-4 text-center">
                                 {(() => {
                                    const deadline = deadlines.find(d => d.invoiceId === `ob-${op.id}` && d.status === 'pending');
                                    return (
                                       <Button 
                                          size="sm" 
                                          variant="ghost"
                                          className={`h-8 gap-1 rounded-xl font-bold text-[10px] ${deadline ? 'text-primary bg-primary/5 hover:bg-primary/10' : 'text-muted-foreground hover:bg-muted'}`}
                                          onClick={() => onSetDeadline?.({
                                             id: `ob-${op.id!}`,
                                             number: 'رصيد افتتاحي',
                                             amount: op.remainingAmount || 0,
                                             accountId: entity.id!,
                                             accountName: entity.name
                                          })}
                                       >
                                          <Clock className="h-3.5 w-3.5" />
                                          {deadline ? safeFormatDate(deadline.dueDate, 'MM/dd') : 'تحديد موعد'}
                                       </Button>
                                    );
                                 })()}
                              </td>
                              <td className="px-6 py-4 text-center">
                                 <div className="flex items-center justify-center gap-2">
                                    <Button 
                                       size="sm" 
                                       className="h-8 gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px]"
                                       onClick={() => onAddPayment()}
                                    >
                                       <Receipt className="h-3.5 w-3.5" />
                                       تسديد
                                    </Button>
                                    <Button 
                                       size="sm" 
                                       variant="outline"
                                       className="h-8 gap-1 rounded-xl border-border text-foreground hover:bg-muted font-bold text-[10px]"
                                       onClick={() => onEditEntity()}
                                    >
                                       <Edit className="h-3.5 w-3.5" />
                                       تعديل
                                    </Button>
                                 </div>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </CardContent>
         </Card>
      )}
    </div>
  );
};
