import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  History, 
  FileUp, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Download,
  AlertTriangle,
  Info,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  ArrowUpRight,
  RefreshCcw,
  Trash2,
  Table as TableIcon,
  Pencil
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { firebaseService, getEffectiveUserInfo } from '../services/firebaseService';
import { useFirebaseQuery } from '../hooks/useFirebaseQuery';
import { where, orderBy } from 'firebase/firestore';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { formatIQD, safeFormatDate, toValidDate } from '../lib/formatters';
import { HistoricalRecord, Entity, OpeningCash } from '../db';

export const getSourceLabel = (source?: string): string => {
  if (!source) return 'رصيد نقد';
  switch (source) {
    case 'previous_month':
      return 'وارد مدور من الشهر السابق';
    case 'cash_remaining':
    case 'leftover_cash':
      return 'كاش متبقي';
    case 'internal_transfer':
      return 'تحويل داخلي';
    case 'other':
      return 'أخرى';
    default:
      return source;
  }
};

interface HistoricalMigrationPageProps {
  branchId: string | null;
  ownerId: string;
  openingCash?: OpeningCash[];
  onImportExcel?: () => void;
  onMultiEntry?: () => void;
  onDeleteHistoricalRecord: (id: string) => void;
  onDeleteOpeningCash: (item: OpeningCash) => void;
}

export const HistoricalMigrationPage: React.FC<HistoricalMigrationPageProps> = ({ 
  branchId, 
  ownerId, 
  openingCash = [],
  onImportExcel, 
  onMultiEntry, 
  onDeleteHistoricalRecord,
  onDeleteOpeningCash
}) => {
  const [activeTab, setActiveTab] = useState('opening');
  const [editingRecord, setEditingRecord] = useState<HistoricalRecord | null>(null);
  
  const constraints = useMemo(() => [
    where('ownerId', '==', ownerId)
  ], [ownerId]);

  const { data: historicalRecordsRaw = [] } = useFirebaseQuery<HistoricalRecord>('historicalRecords', constraints);
  const { data: entities = [] } = useFirebaseQuery<Entity>('entities', constraints);

  const historicalRecords = useMemo(() => {
    const sortedRaw = [...historicalRecordsRaw].sort((a, b) => toValidDate(b.createdAt).getTime() - toValidDate(a.createdAt).getTime());
    if (!branchId) return sortedRaw;
    return sortedRaw.filter(r => r.branchId === branchId);
  }, [historicalRecordsRaw, branchId]);

  const [singleEntry, setSingleEntry] = useState<Partial<HistoricalRecord>>({
    entryType: 'revenue',
    amount: 0,
    date: undefined,
    entityId: '',
    invoiceNumber: '',
    discount: 0,
    bonus: 0,
    paidAmount: 0,
    remainingAmount: 0,
    paymentStatus: 'paid',
    notes: ''
  });

  const [monthlySummary, setMonthlySummary] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    totalRevenueCash: 0,
    totalRevenueCredit: 0,
    totalExpenses: 0,
    totalProfits: 0,
    totalPurchases: 0,
    totalPaidDebt: 0,
    officeDebtPeriod: 0,
    warehouseDebtPeriod: 0,
    notes: ''
  });

  const [yearlySummary, setYearlySummary] = useState({
    year: new Date().getFullYear(),
    totalSales: 0,
    totalExpenses: 0,
    totalProfits: 0,
    totalDebtOwed: 0,
    totalPaidDebt: 0,
    totalPurchases: 0,
    notes: ''
  });

  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewData, setReviewData] = useState<any>(null);

  useEffect(() => {
    if (editingRecord) {
      if (editingRecord.type === 'opening_balance') {
        setActiveTab('opening');
        setOpeningBalance({
          cashHand: editingRecord.cashHand || 0,
          inventoryValue: editingRecord.inventoryValue || 0,
          customerDebts: editingRecord.customerDebts || 0,
          officeDebts: editingRecord.officeDebts || 0,
          warehouseDebts: editingRecord.warehouseDebts || 0,
          accumulatedExpenses: editingRecord.accumulatedExpenses || 0,
          retainedEarnings: editingRecord.retainedEarnings || 0,
          notes: editingRecord.notes || ''
        });
      } else if (editingRecord.type === 'single_entry') {
        setActiveTab('single');
        setSingleEntry({...editingRecord});
      } else if (editingRecord.type === 'monthly_summary' || editingRecord.type === 'batch_period') {
        setActiveTab('monthly');
        setMonthlySummary({
          year: editingRecord.year || new Date().getFullYear(),
          month: editingRecord.month || 1,
          totalRevenueCash: editingRecord.totalRevenueCash || editingRecord.totalSales || 0,
          totalRevenueCredit: editingRecord.totalRevenueCredit || 0,
          totalExpenses: editingRecord.totalExpenses || 0,
          totalProfits: editingRecord.totalProfits || 0,
          totalPurchases: editingRecord.totalPurchases || 0,
          totalPaidDebt: editingRecord.totalPaidDebt || 0,
          officeDebtPeriod: editingRecord.officeDebtPeriod || 0,
          warehouseDebtPeriod: editingRecord.warehouseDebtPeriod || 0,
          notes: editingRecord.notes || ''
        });
      } else if (editingRecord.type === 'yearly_summary') {
        setActiveTab('yearly');
        setYearlySummary({
          year: editingRecord.year || new Date().getFullYear(),
          totalSales: editingRecord.totalSales || 0,
          totalExpenses: editingRecord.totalExpenses || 0,
          totalProfits: editingRecord.totalProfits || 0,
          totalDebtOwed: editingRecord.totalDebtOwed || 0,
          totalPaidDebt: editingRecord.totalPaidDebt || 0,
          totalPurchases: editingRecord.totalPurchases || 0,
          notes: editingRecord.notes || ''
        });
      }
    }
  }, [editingRecord]);
  const [openingBalance, setOpeningBalance] = useState({
    cashHand: 0,
    inventoryValue: 0,
    customerDebts: 0,
    officeDebts: 0,
    warehouseDebts: 0,
    accumulatedExpenses: 0,
    retainedEarnings: 0,
    notes: ''
  });

  const [batchEntry, setBatchEntry] = useState({
    startDate: '',
    endDate: '',
    totalSales: 0,
    totalPurchases: 0,
    totalExpenses: 0,
    totalProfits: 0,
    totalDebtOwed: 0,
    totalPaidDebt: 0,
    estimatedInventory: 0,
    notes: ''
  });

  const handleSaveOpeningBalance = async () => {
    try {
      if (editingRecord) {
        await firebaseService.updateDocument('historicalRecords', editingRecord.id!, {
          ...openingBalance,
          updatedAt: new Date()
        });
        toast.success('تم تحديث الأرصدة الافتتاحية بنجاح');
        setEditingRecord(null);
      } else {
        const record: Omit<HistoricalRecord, 'id'> = {
          type: 'opening_balance',
          ...openingBalance,
          isHistorical: true,
          branchId: branchId || null,
          ownerId,
          createdAt: new Date()
        };
        
        await firebaseService.addDocument('historicalRecords', record as HistoricalRecord);
        toast.success('تمت إضافة الأرصدة الافتتاحية بنجاح');
      }
      
      setOpeningBalance({
        cashHand: 0,
        inventoryValue: 0,
        customerDebts: 0,
        officeDebts: 0,
        warehouseDebts: 0,
        accumulatedExpenses: 0,
        retainedEarnings: 0,
        notes: ''
      });
    } catch (err) {
      toast.error('حدث خطأ أثناء حفظ البيانات');
    }
  };

  const handleSaveBatchEntry = async () => {
    if (!batchEntry.startDate || !batchEntry.endDate) {
      toast.error('يرجى تحديد الفترة الزمنية');
      return;
    }
    
    try {
      if (editingRecord) {
        await firebaseService.updateDocument('historicalRecords', editingRecord.id!, {
          ...batchEntry,
          startDate: toValidDate(batchEntry.startDate),
          endDate: toValidDate(batchEntry.endDate),
          updatedAt: new Date()
        });
        toast.success('تم تحديث العمليات التاريخية بنجاح');
        setEditingRecord(null);
      } else {
        const record: Omit<HistoricalRecord, 'id'> = {
          type: 'batch_period',
          ...batchEntry,
          startDate: toValidDate(batchEntry.startDate),
          endDate: toValidDate(batchEntry.endDate),
          isHistorical: true,
          branchId: branchId || null,
          ownerId,
          createdAt: new Date()
        };
        
        await firebaseService.addDocument('historicalRecords', record as HistoricalRecord);
        toast.success('تم ترحيل العمليات التاريخية بنجاح');
      }
      // Reset form
      setBatchEntry({
        startDate: '',
        endDate: '',
        totalSales: 0,
        totalPurchases: 0,
        totalExpenses: 0,
        totalProfits: 0,
        totalDebtOwed: 0,
        totalPaidDebt: 0,
        estimatedInventory: 0,
        notes: ''
      });
    } catch (err) {
      toast.error('حدث خطأ أثناء حفظ البيانات');
    }
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const records = data.map(row => ({
          type: 'single_entry',
          entryType: (row['النوع'] || row['type']) === 'وارد' ? 'revenue' : 'expense',
          date: toValidDate(row['التاريخ'] || row['date'] || Date.now()),
          amount: Number(row['المبلغ'] || row['amount']) || 0,
          notes: row['ملاحظات'] || row['notes'] || '',
          isHistorical: true,
          createdAt: new Date(),
          branchId,
          ownerId
        }));

        if (records.length === 0) {
           toast.error('لم يتم العثور على بيانات في الملف');
           return;
        }

        setReviewData({ type: 'batch_import', data: records });
        setIsReviewOpen(true);
        toast.info(`تم قراءة ${records.length} سجل، يرجى المراجعة للتأكيد`);
      } catch (err) {
        toast.error('خطأ في قراءة ملف الاكسل');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDeleteRecord = async (id: string) => {
    onDeleteHistoricalRecord(id);
  };

  const totals = historicalRecords?.reduce((acc, rec) => {
    if (rec.type === 'opening_balance') {
      acc.cash += rec.cashHand || 0;
      acc.inventory += rec.inventoryValue || 0;
      acc.profits += rec.retainedEarnings || 0;
      acc.debtsToOthers += (rec.officeDebts || 0) + (rec.warehouseDebts || 0);
      acc.debtsFromOthers += rec.customerDebts || 0;
    } else {
      acc.sales += rec.totalSales || 0;
      acc.purchases += rec.totalPurchases || 0;
      acc.expenses += rec.totalExpenses || 0;
      acc.profits += rec.totalProfits || 0;
      acc.debtsToOthers += rec.totalDebtOwed || 0;
      acc.debtsFromOthers += rec.totalDebtOwed || 0; // Usually debt owed is to suppliers? 
      // User prompt says: "مجموع الديون المستحقة" (Could be both)
      // Let's assume the user means debts to suppliers for batch entry
    }
    return acc;
  }, { cash: 0, inventory: 0, sales: 0, purchases: 0, expenses: 0, profits: 0, debtsToOthers: 0, debtsFromOthers: 0 }) || { cash: 0, inventory: 0, sales: 0, purchases: 0, expenses: 0, profits: 0, debtsToOthers: 0, debtsFromOthers: 0 };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-foreground flex items-center gap-3">
            <History className="h-6 w-6 text-primary" />
            الأرصدة الافتتاحية والترحيل التاريخي
          </h2>
          <p className="text-muted-foreground font-bold text-sm">إدارة ودمج البيانات السابقة مع النظام الحالي</p>
        </div>
        
        <div className="flex gap-2">
            <Button 
               variant="outline" 
               className="rounded-xl border-primary/20 text-primary hover:bg-primary/10 gap-2 font-black"
               onClick={onMultiEntry}
            >
              <TableIcon className="h-4 w-4" />
              إدخال متعدد للقوائم
            </Button>
            <Button 
              variant="outline" 
              className="rounded-xl border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10 gap-2 font-bold"
              onClick={onImportExcel}
            >
              <FileUp className="h-4 w-4" />
              استيراد من Excel
            </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted p-1 mb-6 rounded-2xl w-full md:w-auto h-auto grid grid-cols-3">
          <TabsTrigger value="opening" className="rounded-xl py-3 data-[state=active]:bg-card font-black gap-2">
             <DollarSign className="h-4 w-4" />
             أرصدة افتتاحية
          </TabsTrigger>
          <TabsTrigger value="single" className="rounded-xl py-3 data-[state=active]:bg-card font-black gap-2">
             <Plus className="h-4 w-4" />
             إدخال مفرد
          </TabsTrigger>
          <TabsTrigger value="monthly" className="rounded-xl py-3 data-[state=active]:bg-card font-black gap-2">
             <Calendar className="h-4 w-4" />
             موجز شهري
          </TabsTrigger>
          <TabsTrigger value="yearly" className="rounded-xl py-3 data-[state=active]:bg-card font-black gap-2">
             <TrendingUp className="h-4 w-4" />
             موجز سنوي
          </TabsTrigger>
          <TabsTrigger value="review" className="rounded-xl py-3 data-[state=active]:bg-card font-black gap-2">
             <TableIcon className="h-4 w-4" />
             البيانات المدخلة
          </TabsTrigger>
        </TabsList>

        <TabsContent value="opening" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
           <Card className="border-border shadow-sm overflow-hidden">
             <CardHeader className="bg-muted/50 border-b border-border">
               <CardTitle className="text-lg font-black flex items-center gap-2">
                 <Building2 className="h-5 w-5 text-primary" />
                 إدخال الأرصدة الافتتاحية للمؤسسة
               </CardTitle>
               <CardDescription className="font-bold">أدخل الأرصدة المتوفرة في لحظة بدء استخدام النظام</CardDescription>
             </CardHeader>
             <CardContent className="p-6">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="font-bold text-muted-foreground">الرصيد النقدي الحالي (الكاش)</Label>
                    <div className="relative">
                      <CurrencyInput 
                        value={openingBalance.cashHand}
                        onChange={val => setOpeningBalance({...openingBalance, cashHand: val})}
                        className="bg-muted border-border font-mono h-12 rounded-xl"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="font-bold text-muted-foreground">قيمة المخزون التقديرية</Label>
                    <div className="relative">
                      <CurrencyInput 
                        value={openingBalance.inventoryValue}
                        onChange={val => setOpeningBalance({...openingBalance, inventoryValue: val})}
                        className="bg-muted border-border font-mono h-12 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold text-muted-foreground">ديون الزبائن (مستحقات لك)</Label>
                    <CurrencyInput 
                      value={openingBalance.customerDebts}
                      onChange={val => setOpeningBalance({...openingBalance, customerDebts: val})}
                      className="bg-muted border-border font-mono h-12 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold text-muted-foreground">ديون المكاتب / المذاخر (عليك)</Label>
                    <CurrencyInput 
                      value={openingBalance.officeDebts + openingBalance.warehouseDebts}
                      onChange={val => setOpeningBalance({...openingBalance, officeDebts: val})}
                      className="bg-muted border-border font-mono h-12 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold text-muted-foreground">المصاريف المتراكمة السابقة</Label>
                    <CurrencyInput 
                      value={openingBalance.accumulatedExpenses}
                      onChange={val => setOpeningBalance({...openingBalance, accumulatedExpenses: val})}
                      className="bg-muted border-border font-mono h-12 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold text-muted-foreground">الأرباح المرحّلة</Label>
                    <CurrencyInput 
                      value={openingBalance.retainedEarnings}
                      onChange={val => setOpeningBalance({...openingBalance, retainedEarnings: val})}
                      className="bg-muted border-border font-mono h-12 rounded-xl"
                    />
                  </div>
               </div>
               
               <div className="mt-6 space-y-2">
                  <Label className="font-bold text-muted-foreground">ملاحظات إضافية</Label>
                  <Textarea 
                    value={openingBalance.notes}
                    onChange={e => setOpeningBalance({...openingBalance, notes: e.target.value})}
                    placeholder="أي ملاحظات حول الأرصدة الافتتاحية..."
                    className="bg-muted border-border rounded-xl min-h-[100px]"
                  />
               </div>
             </CardContent>
             <CardFooter className="bg-muted/30 border-t border-border p-6 flex justify-end">
                <Button 
                   onClick={handleSaveOpeningBalance}
                   className="bg-primary hover:bg-primary/90 text-primary-foreground font-black h-12 px-10 rounded-xl shadow-lg shadow-primary/20 gap-2"
                >
                   <CheckCircle2 className="h-5 w-5" />
                   {editingRecord ? 'تحديث الأرصدة' : 'حفظ الأرصدة الافتتاحية'}
                </Button>
             </CardFooter>
           </Card>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardContent className="p-6">
                   <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-black text-emerald-600 uppercase tracking-wider mb-1">إجمالي الموجودات</p>
                        <h3 className="text-2xl font-black text-emerald-700">{(totals.cash + totals.inventory + totals.debtsFromOthers).toLocaleString()} د.ع</h3>
                      </div>
                      <div className="p-3 bg-emerald-500/20 rounded-xl">
                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                      </div>
                   </div>
                </CardContent>
              </Card>

              <Card className="border-rose-500/20 bg-rose-500/5">
                <CardContent className="p-6">
                   <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-black text-rose-600 uppercase tracking-wider mb-1">إجمالي المطلوبات</p>
                        <h3 className="text-2xl font-black text-rose-700">{(totals.debtsToOthers).toLocaleString()} د.ع</h3>
                      </div>
                      <div className="p-3 bg-rose-500/20 rounded-xl">
                        <TrendingDown className="h-5 w-5 text-rose-600" />
                      </div>
                   </div>
                </CardContent>
              </Card>

              <Card className="border-blue-500/20 bg-blue-500/5">
                <CardContent className="p-6">
                   <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-black text-blue-600 uppercase tracking-wider mb-1">صافي القيمة (رأس المال)</p>
                        <h3 className="text-2xl font-black text-blue-700">{(totals.cash + totals.inventory + totals.debtsFromOthers - totals.debtsToOthers).toLocaleString()} د.ع</h3>
                      </div>
                      <div className="p-3 bg-blue-500/20 rounded-xl">
                        <DollarSign className="h-5 w-5 text-blue-600" />
                      </div>
                   </div>
                </CardContent>
              </Card>
           </div>
        </TabsContent>

        <TabsContent value="single" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
           <Card className="border-border shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/50 border-b border-border">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  إدخال عملية مفردة مطولة (قديمة)
                </CardTitle>
                <CardDescription className="font-bold">إضافة حركة مالية سابقة من تاريخ قديم</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                       <Label className="font-bold text-muted-foreground">نوع العملية</Label>
                       <Select 
                          value={singleEntry.entryType} 
                          onValueChange={(val: any) => setSingleEntry({...singleEntry, entryType: val})}
                       >
                          <SelectTrigger className="bg-muted border-border h-12 rounded-xl font-bold">
                             <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                             <SelectItem value="revenue">وارد قديم</SelectItem>
                             <SelectItem value="expense">مصروف قديم</SelectItem>
                             <SelectItem value="invoice">فاتورة قديمة (مورد)</SelectItem>
                             <SelectItem value="payment">تسديد قديم (لمورد)</SelectItem>
                             <SelectItem value="customer_debt">دين زبون قديم</SelectItem>
                             <SelectItem value="supplier_debt">دين مورد قديم</SelectItem>
                          </SelectContent>
                       </Select>
                    </div>

                    <div className="space-y-2">
                       <Label className="font-bold text-muted-foreground">التاريخ القديم</Label>
                       <Input 
                          type="date"
                          value={singleEntry.date ? safeFormatDate(singleEntry.date, 'yyyy-MM-dd', { useAr: false }) : ''}
                          onChange={e => setSingleEntry({...singleEntry, date: toValidDate(e.target.value)})}
                          className="bg-muted border-border h-12 rounded-xl"
                       />
                    </div>

                    <div className="space-y-2">
                       <Label className="font-bold text-muted-foreground">المبلغ (د.ع)</Label>
                       <CurrencyInput 
                          value={singleEntry.amount}
                          onChange={val => setSingleEntry({...singleEntry, amount: val})}
                          className="bg-muted border-border h-12 rounded-xl font-black text-lg"
                       />
                    </div>

                    {(singleEntry.entryType === 'invoice' || singleEntry.entryType === 'payment' || singleEntry.entryType === 'supplier_debt') && (
                       <div className="space-y-2">
                          <Label className="font-bold text-muted-foreground">المورد / الجهة</Label>
                          <Select 
                             value={singleEntry.entityId} 
                             onValueChange={val => setSingleEntry({...singleEntry, entityId: val})}
                          >
                             <SelectTrigger className="bg-muted border-border h-12 rounded-xl font-bold">
                                <SelectValue placeholder="اختر المورد" />
                             </SelectTrigger>
                             <SelectContent className="bg-card border-border">
                                {entities.map(e => <SelectItem key={e.id} value={e.id!}>{e.name}</SelectItem>)}
                             </SelectContent>
                          </Select>
                       </div>
                    )}

                    {(singleEntry.entryType === 'invoice') && (
                       <>
                          <div className="space-y-2">
                             <Label className="font-bold text-muted-foreground">رقم القائمة</Label>
                             <Input 
                                value={singleEntry.invoiceNumber}
                                onChange={e => setSingleEntry({...singleEntry, invoiceNumber: e.target.value})}
                                className="bg-muted border-border h-12 rounded-xl"
                             />
                          </div>
                          <div className="space-y-2">
                             <Label className="font-bold text-rose-500">الخصم</Label>
                             <CurrencyInput 
                                value={singleEntry.discount}
                                onChange={val => setSingleEntry({...singleEntry, discount: val})}
                                className="bg-muted border-rose-500/20 text-rose-500 h-12 rounded-xl"
                             />
                          </div>
                          <div className="space-y-2">
                             <Label className="font-bold text-blue-500">البونص</Label>
                             <CurrencyInput 
                                value={singleEntry.bonus}
                                onChange={val => setSingleEntry({...singleEntry, bonus: val})}
                                className="bg-muted border-blue-500/20 text-blue-500 h-12 rounded-xl"
                             />
                          </div>
                       </>
                    )}

                    {(singleEntry.entryType === 'invoice' || singleEntry.entryType === 'customer_debt') && (
                       <>
                          <div className="space-y-2">
                             <Label className="font-bold text-emerald-600">المبلغ المسدد</Label>
                             <CurrencyInput 
                                value={singleEntry.paidAmount}
                                onChange={val => setSingleEntry({...singleEntry, paidAmount: val})}
                                className="bg-muted border-emerald-500/20 text-emerald-600 h-12 rounded-xl"
                             />
                          </div>
                          <div className="space-y-2">
                             <Label className="font-bold text-rose-600">المبلغ المتبقي</Label>
                             <div className="bg-muted p-3 rounded-xl border border-border h-12 flex items-center font-black">
                                {((singleEntry.amount || 0) - (singleEntry.paidAmount || 0) - (singleEntry.discount || 0)).toLocaleString()} د.ع
                             </div>
                          </div>
                       </>
                    )}
                 </div>

                 <div className="space-y-2">
                    <Label className="font-bold text-muted-foreground">ملاحظات</Label>
                    <Textarea 
                       value={singleEntry.notes}
                       onChange={e => setSingleEntry({...singleEntry, notes: e.target.value})}
                       className="bg-muted border-border rounded-xl"
                       placeholder="تفاصيل إضافية عن هذه الحركة التاريخية..."
                    />
                 </div>
              </CardContent>
              <CardFooter className="bg-muted/30 border-t border-border p-6 flex justify-end gap-3">
                 <Button 
                    variant="outline"
                    onClick={() => setSingleEntry({entryType: 'revenue', amount: 0, notes: ''})}
                    className="font-bold rounded-xl h-12 px-6"
                 >
                    إعادة تعيين
                 </Button>
                 <Button 
                    onClick={() => {
                        if (!singleEntry.date) { toast.error('يرجى تحديد التاريخ'); return; }
                        setReviewData({ 
                            type: 'single_entry', 
                            data: {...singleEntry, type: 'single_entry', isHistorical: true, createdAt: new Date(), branchId, ownerId} 
                        }); 
                        setIsReviewOpen(true);
                    }}
                    className="bg-primary text-primary-foreground font-black px-10 h-12 rounded-xl shadow-lg shadow-primary/20"
                 >
                    مراجعة وحفظ
                 </Button>
              </CardFooter>
           </Card>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
           <Card className="border-border shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/50 border-b border-border">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  إدخال موجز شهري مختصر (قديم)
                </CardTitle>
                <CardDescription className="font-bold">تسجيل مجاميع الشهر بالكامل دفعة واحدة</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                       <Label className="font-bold text-muted-foreground">السنة</Label>
                       <Input 
                          type="number"
                          value={monthlySummary.year}
                          onChange={e => setMonthlySummary({...monthlySummary, year: Number(e.target.value)})}
                          className="bg-muted border-border h-12 rounded-xl font-bold"
                       />
                    </div>
                    <div className="space-y-2">
                       <Label className="font-bold text-muted-foreground">الشهر</Label>
                       <Select 
                          value={monthlySummary.month.toString()} 
                          onValueChange={val => setMonthlySummary({...monthlySummary, month: Number(val)})}
                       >
                          <SelectTrigger className="bg-muted border-border h-12 rounded-xl font-bold">
                             <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border h-64 overflow-y-auto">
                             {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                                <SelectItem key={m} value={m.toString()}>{safeFormatDate(new Date(2024, m-1, 1), 'MMMM')}</SelectItem>
                             ))}
                          </SelectContent>
                       </Select>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                       <Label className="font-bold text-emerald-600">مجموع الوارد النقدي</Label>
                       <CurrencyInput 
                          value={monthlySummary.totalRevenueCash}
                          onChange={val => setMonthlySummary({...monthlySummary, totalRevenueCash: val})}
                          className="bg-muted border-emerald-500/20 text-emerald-600 h-12 rounded-xl font-black"
                       />
                    </div>
                    <div className="space-y-2">
                       <Label className="font-bold text-amber-600">مجموع الوارد الآجل (ديون الزبائن)</Label>
                       <CurrencyInput 
                          value={monthlySummary.totalRevenueCredit}
                          onChange={val => setMonthlySummary({...monthlySummary, totalRevenueCredit: val})}
                          className="bg-muted border-amber-500/20 text-amber-600 h-12 rounded-xl font-black"
                       />
                    </div>
                    <div className="space-y-2">
                       <Label className="font-bold text-blue-600">مجموع المشتريات (فواتير الموردين)</Label>
                       <CurrencyInput 
                          value={monthlySummary.totalPurchases}
                          onChange={val => setMonthlySummary({...monthlySummary, totalPurchases: val})}
                          className="bg-muted border-blue-500/20 text-blue-600 h-12 rounded-xl font-black"
                       />
                    </div>
                    <div className="space-y-2">
                       <Label className="font-bold text-rose-600">مجموع المصروفات</Label>
                       <CurrencyInput 
                          value={monthlySummary.totalExpenses}
                          onChange={val => setMonthlySummary({...monthlySummary, totalExpenses: val})}
                          className="bg-muted border-rose-500/20 text-rose-600 h-12 rounded-xl font-black"
                       />
                    </div>
                    <div className="space-y-2">
                       <Label className="font-bold text-primary">صافي الربح التقديري</Label>
                       <CurrencyInput 
                          value={monthlySummary.totalProfits}
                          onChange={val => setMonthlySummary({...monthlySummary, totalProfits: val})}
                          className="bg-muted border-primary/20 text-primary h-12 rounded-xl font-black"
                       />
                    </div>
                    <div className="space-y-2">
                       <Label className="font-bold text-slate-600">مجموع التسديدات للموردين</Label>
                       <CurrencyInput 
                          value={monthlySummary.totalPaidDebt}
                          onChange={val => setMonthlySummary({...monthlySummary, totalPaidDebt: val})}
                          className="bg-muted border-border text-slate-600 h-12 rounded-xl font-black"
                       />
                    </div>
                    <div className="space-y-2">
                       <Label className="font-bold text-muted-foreground">ديون المكاتب (المتبقية)</Label>
                       <CurrencyInput 
                          value={monthlySummary.officeDebtPeriod}
                          onChange={val => setMonthlySummary({...monthlySummary, officeDebtPeriod: val})}
                          className="bg-muted border-border h-12 rounded-xl font-bold"
                       />
                    </div>
                    <div className="space-y-2">
                       <Label className="font-bold text-muted-foreground">ديون المذاخر (المتبقية)</Label>
                       <CurrencyInput 
                          value={monthlySummary.warehouseDebtPeriod}
                          onChange={val => setMonthlySummary({...monthlySummary, warehouseDebtPeriod: val})}
                          className="bg-muted border-border h-12 rounded-xl font-bold"
                       />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <Label className="font-bold text-muted-foreground">ملاحظات الشهر</Label>
                    <Textarea 
                       value={monthlySummary.notes}
                       onChange={e => setMonthlySummary({...monthlySummary, notes: e.target.value})}
                       className="bg-muted border-border rounded-xl"
                       placeholder="أي أحداث مهمة في هذا الشهر..."
                    />
                 </div>
              </CardContent>
              <CardFooter className="bg-muted/30 border-t border-border p-6 flex justify-end">
                 <Button 
                    onClick={() => {
                        setReviewData({ 
                            type: 'monthly_summary', 
                            data: {
                                ...monthlySummary, 
                                type: 'monthly_summary', 
                                isHistorical: true, 
                                createdAt: new Date(), 
                                branchId, 
                                ownerId
                            } 
                        }); 
                        setIsReviewOpen(true);
                    }}
                    className="bg-primary text-primary-foreground font-black px-10 h-12 rounded-xl shadow-lg shadow-primary/20"
                 >
                    مراجعة وحفظ الموجز الشهري
                 </Button>
              </CardFooter>
           </Card>
        </TabsContent>

        <TabsContent value="yearly" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
           <Card className="border-border shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/50 border-b border-border">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  إدخال الموجز السنوي الكامل (قديم)
                </CardTitle>
                <CardDescription className="font-bold">تسجيل إجمالي أرقام السنة المالية كاملة</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                 <div className="w-full md:w-1/3">
                    <div className="space-y-2">
                       <Label className="font-bold text-muted-foreground">السنة</Label>
                       <Input 
                          type="number"
                          value={yearlySummary.year}
                          onChange={e => setYearlySummary({...yearlySummary, year: Number(e.target.value)})}
                          className="bg-muted border-border h-12 rounded-xl font-black text-xl"
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                       <Label className="font-bold text-emerald-600">إجمالي الوارد السنوي</Label>
                       <CurrencyInput 
                          value={yearlySummary.totalSales}
                          onChange={val => setYearlySummary({...yearlySummary, totalSales: val})}
                          className="bg-muted border-emerald-500/20 text-emerald-600 h-12 rounded-xl font-black"
                       />
                    </div>
                    <div className="space-y-2">
                       <Label className="font-bold text-rose-600">إجمالي المصروفات السنوية</Label>
                       <CurrencyInput 
                          value={yearlySummary.totalExpenses}
                          onChange={val => setYearlySummary({...yearlySummary, totalExpenses: val})}
                          className="bg-muted border-rose-500/20 text-rose-600 h-12 rounded-xl font-black"
                       />
                    </div>
                    <div className="space-y-2">
                       <Label className="font-bold text-primary">إجمالي الأرباح السنوية</Label>
                       <CurrencyInput 
                          value={yearlySummary.totalProfits}
                          onChange={val => setYearlySummary({...yearlySummary, totalProfits: val})}
                          className="bg-muted border-primary/20 text-primary h-12 rounded-xl font-black"
                       />
                    </div>
                    <div className="space-y-2">
                       <Label className="font-bold text-amber-600">إجمالي الديون (المتبقي بذمة الزبائن)</Label>
                       <CurrencyInput 
                          value={yearlySummary.totalDebtOwed}
                          onChange={val => setYearlySummary({...yearlySummary, totalDebtOwed: val})}
                          className="bg-muted border-amber-500/20 text-amber-600 h-12 rounded-xl font-black"
                       />
                    </div>
                    <div className="space-y-2">
                       <Label className="font-bold text-slate-600">إجمالي التسديدات للموردين</Label>
                       <CurrencyInput 
                          value={yearlySummary.totalPaidDebt}
                          onChange={val => setYearlySummary({...yearlySummary, totalPaidDebt: val})}
                          className="bg-muted border-border text-slate-600 h-12 rounded-xl font-black"
                       />
                    </div>
                    <div className="space-y-2">
                       <Label className="font-bold text-blue-600">إجمالي المشتريات السنوية</Label>
                       <CurrencyInput 
                          value={yearlySummary.totalPurchases}
                          onChange={val => setYearlySummary({...yearlySummary, totalPurchases: val})}
                          className="bg-muted border-blue-500/20 text-blue-600 h-12 rounded-xl font-black"
                       />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <Label className="font-bold text-muted-foreground">ملاحظات السنة</Label>
                    <Textarea 
                       value={yearlySummary.notes}
                       onChange={e => setYearlySummary({...yearlySummary, notes: e.target.value})}
                       className="bg-muted border-border rounded-xl"
                       placeholder="ملخص أحداث العام المالي..."
                    />
                 </div>
              </CardContent>
              <CardFooter className="bg-muted/30 border-t border-border p-6 flex justify-end">
                 <Button 
                    onClick={() => {
                        setReviewData({ 
                            type: 'yearly_summary', 
                            data: {
                                ...yearlySummary, 
                                type: 'yearly_summary', 
                                isHistorical: true, 
                                createdAt: new Date(), 
                                branchId, 
                                ownerId
                            } 
                        }); 
                        setIsReviewOpen(true);
                    }}
                    className="bg-primary text-primary-foreground font-black px-10 h-12 rounded-xl shadow-lg shadow-primary/20"
                 >
                    مراجعة وحفظ الموجز السنوي
                 </Button>
              </CardFooter>
           </Card>
        </TabsContent>

        <TabsContent value="review" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
           <div className="flex items-center gap-4 py-4 px-6 bg-card border border-border rounded-2xl shadow-sm">
              <div className="p-3 bg-primary/10 rounded-xl">
                 <TableIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                 <h3 className="font-black text-foreground">سجل البيانات المرحّلة</h3>
                 <p className="text-xs text-muted-foreground font-bold">مراجعة كافة الأرصدة والعمليات التاريخية المدخلة</p>
              </div>
           </div>

           <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                   <tr>
                      <th className="px-6 py-4 text-right text-xs font-black uppercase text-muted-foreground">النوع</th>
                      <th className="px-6 py-4 text-right text-xs font-black uppercase text-muted-foreground">الفترة / التفاصيل</th>
                      <th className="px-6 py-4 text-right text-xs font-black uppercase text-muted-foreground">القيم المالية</th>
                      <th className="px-6 py-4 text-right text-xs font-black uppercase text-muted-foreground">تاريخ الترحيل</th>
                      <th className="px-6 py-4 text-center text-xs font-black uppercase text-muted-foreground">الإجراءات</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-border">
                   <AnimatePresence>
                    {historicalRecords?.map((record) => (
                      <motion.tr 
                        key={record.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                           <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black ${
                             record.type === 'opening_balance' ? 'bg-blue-500/10 text-blue-500' : 
                             record.type === 'single_entry' ? 'bg-emerald-500/10 text-emerald-500' :
                             record.type === 'monthly_summary' ? 'bg-amber-500/10 text-amber-500' :
                             'bg-purple-500/10 text-purple-500'
                           }`}>
                              {record.type === 'opening_balance' ? 'رصيد افتتاحي' : 
                               record.type === 'single_entry' ? 'إدخال مفرد' :
                               record.type === 'monthly_summary' ? 'موجز شهري' : 'موجز سنوي'}
                           </span>
                        </td>
                        <td className="px-6 py-4">
                           {record.type === 'opening_balance' ? (
                             <div className="text-xs font-bold text-foreground">أرصدة عند التأسيس</div>
                           ) : record.type === 'single_entry' ? (
                             <div className="text-xs font-bold text-foreground">
                                {record.entryType === 'revenue' ? 'وارد' : 
                                 record.entryType === 'expense' ? 'مصروف' :
                                 record.entryType === 'invoice' ? 'فاتورة' :
                                 record.entryType === 'payment' ? 'تسديد' :
                                 record.entryType === 'customer_debt' ? 'دين زبون' : 'دين مورد'}
                                {' - '}
                                {record.date && safeFormatDate(record.date, 'yyyy/MM/dd')}
                             </div>
                           ) : record.type === 'monthly_summary' ? (
                             <div className="text-xs font-bold text-foreground">
                                {safeFormatDate(new Date(record.year!, record.month!-1, 1), 'MMMM yyyy')}
                             </div>
                           ) : (
                             <div className="text-xs font-bold text-foreground">
                                كامل سنة {record.year}
                             </div>
                           )}
                           <div className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{record.notes}</div>
                        </td>
                        <td className="px-6 py-4">
                           {record.type === 'opening_balance' ? (
                             <div className="space-y-1">
                                <div className="text-[10px]"><span className="text-muted-foreground">نقد:</span> <span className="font-mono font-bold">{(record.cashHand || 0).toLocaleString()}</span></div>
                                <div className="text-[10px]"><span className="text-muted-foreground">مخزون:</span> <span className="font-mono font-bold">{(record.inventoryValue || 0).toLocaleString()}</span></div>
                             </div>
                           ) : record.type === 'single_entry' ? (
                             <div className="text-[10px] font-black text-emerald-600">{(record.amount || 0).toLocaleString()} د.ع</div>
                           ) : (
                             <div className="space-y-1">
                                <div className="text-[10px]"><span className="text-muted-foreground">إيراد:</span> <span className="font-mono font-bold">{(record.totalSales || record.totalRevenueCash || 0).toLocaleString()}</span></div>
                                <div className="text-[10px]"><span className="text-muted-foreground">أرباح:</span> <span className="font-mono font-bold">{(record.totalProfits || 0).toLocaleString()}</span></div>
                             </div>
                           )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                           <div className="text-xs font-bold text-foreground">{safeFormatDate(record.createdAt, 'yyyy/MM/dd HH:mm')}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                               <Button 
                                 variant="ghost" 
                                 size="icon" 
                                 className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg"
                                 onClick={() => setEditingRecord(record)}
                               >
                                 <Pencil className="h-4 w-4" />
                               </Button>
                               <Button 
                                 variant="ghost" 
                                 size="icon" 
                                 className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 rounded-lg"
                                 onClick={() => handleDeleteRecord(record.id!)}
                               >
                                 <Trash2 className="h-4 w-4" />
                               </Button>
                            </div>
                        </td>
                      </motion.tr>
                    ))}

                    {/* Opening Cash Entries */}
                    {openingCash.map((item) => (
                      <motion.tr 
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-muted/20 transition-colors border-t border-border"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                           <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-indigo-500/10 text-indigo-500">
                              رصيد نقد افتتاحي
                           </span>
                        </td>
                        <td className="px-6 py-4">
                           <div className="text-xs font-bold text-foreground">
                              {getSourceLabel(item.source)} - {item.month}/{item.year}
                           </div>
                           <div className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{item.notes}</div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="text-[10px] font-black text-emerald-600">{(item.amount || 0).toLocaleString()} د.ع</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                           <div className="text-xs font-bold text-foreground">{safeFormatDate(item.createdAt, 'yyyy/MM/dd HH:mm')}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                             <div className="flex items-center justify-center gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 rounded-lg"
                                  onClick={() => onDeleteOpeningCash(item)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                             </div>
                        </td>
                      </motion.tr>
                    ))}
                   </AnimatePresence>
                   {!historicalRecords || historicalRecords.length === 0 && (
                     <tr>
                       <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground font-bold">لا توجد بيانات مرحّلة حتى الآن</td>
                     </tr>
                   )}
                </tbody>
              </table>
           </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="max-w-2xl bg-card border-border rounded-3xl overflow-hidden p-0">
          <DialogHeader className="bg-primary p-6 text-primary-foreground">
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6" />
              مراجعة البيانات التاريخية قبل الاعتماد
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/80 font-bold">
              يرجى التأكد من صحة البيانات المدخلة قبل حفظها نهائياً
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto" dir="rtl">
            {reviewData?.type === 'single_entry' && (
              <div className="grid grid-cols-2 gap-y-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-bold">نوع العملية</p>
                  <p className="font-black text-foreground">
                    {reviewData.data.entryType === 'revenue' ? 'وارد قديم' : 
                     reviewData.data.entryType === 'expense' ? 'مصروف قديم' :
                     reviewData.data.entryType === 'invoice' ? 'فاتورة قديمة' :
                     reviewData.data.entryType === 'payment' ? 'تسديد قديم' :
                     reviewData.data.entryType === 'customer_debt' ? 'دين زبون' : 'دين مورد'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-bold">التاريخ</p>
                  <p className="font-black text-foreground font-mono">{safeFormatDate(reviewData.data.date, 'yyyy/MM/dd')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-bold">المبلغ</p>
                  <p className="font-black text-emerald-600 text-lg">{(reviewData.data.amount || 0).toLocaleString()} د.ع</p>
                </div>
                {reviewData.data.entityId && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-bold">المورد / الجهة</p>
                    <p className="font-black text-foreground">{entities.find(e => e.id === reviewData.data.entityId)?.name || 'غير معروف'}</p>
                  </div>
                )}
              </div>
            )}

            {reviewData?.type === 'monthly_summary' && (
              <div className="grid grid-cols-2 gap-y-6">
                <div className="col-span-2 p-3 bg-muted rounded-xl flex justify-between">
                  <p className="font-black text-primary">موجز شهر: {safeFormatDate(new Date(2024, reviewData.data.month-1, 1), 'MMMM')}</p>
                  <p className="font-black text-primary">سنة: {reviewData.data.year}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-bold">الوارد النقدي</p>
                  <p className="font-black text-emerald-600">{(reviewData.data.totalRevenueCash || 0).toLocaleString()} د.ع</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-bold">الوارد الآجل</p>
                  <p className="font-black text-amber-600">{(reviewData.data.totalRevenueCredit || 0).toLocaleString()} د.ع</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-bold">المصروفات</p>
                  <p className="font-black text-rose-600">{(reviewData.data.totalExpenses || 0).toLocaleString()} د.ع</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-bold">صافي الربح</p>
                  <p className="font-black text-primary">{(reviewData.data.totalProfits || 0).toLocaleString()} د.ع</p>
                </div>
              </div>
            )}

            {reviewData?.type === 'yearly_summary' && (
              <div className="space-y-6">
                <div className="p-3 bg-primary/10 rounded-xl text-center">
                  <p className="font-black text-primary text-xl">موجز السنة الكاملة: {reviewData.data.year}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-muted rounded-2xl">
                      <p className="text-xs text-muted-foreground font-bold mb-1">إجمالي الوارد</p>
                      <p className="font-black text-emerald-600">{(reviewData.data.totalSales || 0).toLocaleString()} د.ع</p>
                   </div>
                   <div className="p-4 bg-muted rounded-2xl">
                      <p className="text-xs text-muted-foreground font-bold mb-1">إجمالي الأرباح</p>
                      <p className="font-black text-primary">{(reviewData.data.totalProfits || 0).toLocaleString()} د.ع</p>
                   </div>
                </div>
              </div>
            )}

            {reviewData?.type === 'batch_import' && (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                  <p className="font-black text-emerald-700 text-center">استيراد جماعي من ملف Excel ({reviewData.data.length} سجل)</p>
                </div>
                <div className="max-h-[300px] overflow-y-auto border border-border rounded-xl">
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="p-2 text-right">التاريخ</th>
                        <th className="p-2 text-right">النوع</th>
                        <th className="p-2 text-right">المبلغ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {reviewData.data.slice(0, 10).map((record: any, idx: number) => (
                        <tr key={idx}>
                          <td className="p-2">{safeFormatDate(record.date, 'yyyy/MM/dd')}</td>
                          <td className="p-2">{record.entryType === 'revenue' ? 'وارد' : 'مصروف'}</td>
                          <td className="p-2 font-bold">{(record.amount || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                      {reviewData.data.length > 10 && (
                        <tr>
                          <td colSpan={3} className="p-2 text-center text-muted-foreground font-bold">
                            ... و {reviewData.data.length - 10} سجلات أخرى
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {reviewData?.data.notes && (
              <div className="p-4 bg-muted/50 rounded-2xl border border-border">
                <p className="text-xs text-muted-foreground font-bold mb-2">ملاحظات:</p>
                <p className="text-sm font-bold text-foreground">{reviewData.data.notes}</p>
              </div>
            )}

            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex gap-3 items-center">
               <AlertTriangle className="h-5 w-5 text-amber-500" />
               <p className="text-xs font-bold text-amber-700">سيتم حفظ هذه البيانات كبيانات قديمة "مرحّلة" في أرشيف النظام وسيتم احتسابها في الميزانية العامة والتقارير.</p>
            </div>
          </div>

          <DialogFooter className="p-6 bg-muted/30 border-t border-border flex gap-3">
            <Button 
               variant="ghost" 
               className="flex-1 font-bold rounded-2xl h-12"
               onClick={() => setIsReviewOpen(false)}
            >
              إلغاء وتعديل
            </Button>
            <Button 
               className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl h-12 gap-2"
               onClick={async () => {
                 try {
                    const { uid } = getEffectiveUserInfo();
                    if (reviewData.type === 'batch_import') {
                       // Save multiple records
                       const batch = reviewData.data;
                       for (const rec of batch) {
                          if (rec.entryType === 'invoice') {
                             const invData = {
                                ...rec,
                                accountId: rec.entityId,
                                invoiceNumber: rec.invoiceNumber || 'OLD',
                                totalAmount: rec.amount,
                                amount: rec.amount,
                                netAmount: (rec.amount || 0) - (rec.discount || 0),
                                paidAmount: rec.paidAmount || 0,
                                isHistorical: true,
                                type: 'purchase_invoice',
                                subtype: 'historical',
                                source: 'historical'
                             };
                             await firebaseService.saveInvoice(invData);
                          } else {
                             await firebaseService.addDocument('historicalRecords', rec);
                          }
                       }
                       toast.success(`تم استيراد ${batch.length} سجل بنجاح`);
                    } else {
                       const rec = reviewData.data;
                       if (rec.entryType === 'invoice') {
                          const invData = {
                             ...rec,
                             accountId: rec.entityId,
                             invoiceNumber: rec.invoiceNumber || 'OLD',
                             totalAmount: rec.amount,
                             amount: rec.amount,
                             netAmount: (rec.amount || 0) - (rec.discount || 0),
                             paidAmount: rec.paidAmount || 0,
                             isHistorical: true,
                             type: 'purchase_invoice',
                             subtype: 'historical',
                             source: 'historical'
                          };
                          await firebaseService.saveInvoice(invData);
                          
                          if (invData.paidAmount > 0) {
                             await firebaseService.addDocument('ledgerEntries', {
                                accountId: invData.accountId,
                                amount: invData.paidAmount,
                                date: invData.date,
                                operationType: 'payment',
                                isHistorical: true,
                                subtype: 'historical',
                                notes: `تسديد فاتورة قديمة رقم ${invData.invoiceNumber}`,
                                ownerId: uid,
                                branchId,
                                createdAt: new Date()
                             });
                          }
                       } else {
                          await firebaseService.addDocument('historicalRecords', rec);
                       }
                       toast.success('تم حفظ البيانات التاريخية بنجاح');
                    }
                    setIsReviewOpen(false);
                    // Reset forms
                    if (reviewData.type === 'single_entry') setSingleEntry({entryType: 'revenue', amount: 0});
                    if (reviewData.type === 'monthly_summary') setMonthlySummary({...monthlySummary, totalRevenueCash: 0, totalRevenueCredit: 0});
                    if (reviewData.type === 'yearly_summary') setYearlySummary({...yearlySummary, totalSales: 0});
                 } catch (err) {
                    toast.error('حدث خطأ أثناء الحفظ');
                 }
               }}
            >
              <CheckCircle2 className="h-5 w-5" />
              تأكيد واعتماد البيانات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
