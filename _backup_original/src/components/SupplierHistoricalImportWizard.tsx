import React, { useState, useMemo } from 'react';
import { Camera, Image as ImageIcon, X, Check, RefreshCw, RefreshCcw, Upload, Minimize2, Maximize2, Trash2, FileSpreadsheet, Plus, AlertCircle, AlertTriangle, CheckCircle2, History, Receipt, Gift, FileText, ChevronRight, ChevronLeft } from 'lucide-react';
import { ImageCapture } from './ImageCapture';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ar } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Entity, LedgerEntry } from '../db';
import { firebaseService } from '../services/firebaseService';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { cn, fileToBase64 } from '@/lib/utils';
import { safeFormatDate, toValidDate } from '@/src/lib/formatters';

interface SupplierHistoricalImportWizardProps {
  entity: Entity;
  branchId: string | null;
  ledgerEntries: LedgerEntry[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

type Step = 'period' | 'data' | 'attachments' | 'review';

interface InvoiceRow {
  invoiceNumber: string;
  date: string;
  amount: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  discountPercentage: number;
  purchaseType: 'cash' | 'credit';
  paidAmount: number;
  dueDate: string;
  paymentDate: string;
  notes: string;
  images: string[];
  receiptImages: string[];
  status: 'paid' | 'partial' | 'unpaid';
}

export const SupplierHistoricalImportWizard: React.FC<SupplierHistoricalImportWizardProps> = ({
  entity,
  branchId,
  ledgerEntries,
  isOpen,
  onOpenChange,
  onComplete,
}) => {
  const [step, setStep] = useState<Step>('period');
  const [period, setPeriod] = useState({
    startDate: safeFormatDate(startOfMonth(new Date()), 'yyyy-MM-dd', { useAr: false }),
    endDate: safeFormatDate(endOfMonth(new Date()), 'yyyy-MM-dd', { useAr: false }),
    year: new Date().getFullYear().toString(),
    month: (new Date().getMonth() + 1).toString(),
    importType: 'manual' as 'manual' | 'excel'
  });

  const [invoices, setInvoices] = useState<InvoiceRow[]>([
    {
      invoiceNumber: '',
      date: safeFormatDate(new Date(), 'yyyy-MM-dd', { useAr: false }),
      amount: 0,
      discount: 0,
      discountType: 'fixed',
      discountPercentage: 0,
      purchaseType: 'credit',
      paidAmount: 0,
      dueDate: '',
      paymentDate: '',
      notes: '',
      images: [],
      receiptImages: [],
      status: 'unpaid'
    }
  ]);

  const existingInvoiceNumbers = useMemo(() => {
    return new Set(ledgerEntries.map(e => e.invoiceNumber).filter(Boolean));
  }, [ledgerEntries]);

  const handleAddRow = () => {
    setInvoices([...invoices, {
      invoiceNumber: '',
      date: safeFormatDate(new Date(), 'yyyy-MM-dd', { useAr: false }),
      amount: 0,
      discount: 0,
      discountType: 'fixed',
      discountPercentage: 0,
      purchaseType: 'credit',
      paidAmount: 0,
      dueDate: '',
      paymentDate: '',
      notes: '',
      images: [],
      receiptImages: [],
      status: 'unpaid'
    }]);
  };

  const handleRemoveRow = (index: number) => {
    setInvoices(invoices.filter((_, i) => i !== index));
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleUpdateRow = (index: number, data: Partial<InvoiceRow>) => {
    const newInvoices = [...invoices];
    let row = { ...newInvoices[index], ...data };
    
    // Sync discount and percentage
    if (data.discountType !== undefined) {
      if (data.discountType === 'percentage' && row.amount > 0) {
        row.discount = (row.amount * row.discountPercentage) / 100;
      } else if (data.discountType === 'fixed' && row.amount > 0) {
        row.discountPercentage = (row.discount / row.amount) * 100;
      }
    } else if (data.discountPercentage !== undefined) {
      row.discount = (row.amount * data.discountPercentage) / 100;
    } else if (data.discount !== undefined) {
      if (row.amount > 0) {
        row.discountPercentage = (data.discount / row.amount) * 100;
      }
    } else if (data.amount !== undefined) {
      if (row.discountType === 'percentage') {
        row.discount = (data.amount * row.discountPercentage) / 100;
      } else if (data.amount > 0) {
        row.discountPercentage = (row.discount / data.amount) * 100;
      }
    }

    // Auto calculate status based on paid amount
    const net = row.amount - row.discount;
    const paid = row.paidAmount;
    if (paid >= net && net > 10) row.status = 'paid';
    else if (paid > 10) row.status = 'partial';
    else row.status = 'unpaid';

    newInvoices[index] = row;
    setInvoices(newInvoices);
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const importedRows: InvoiceRow[] = data.map(row => {
          const amount = Number(row['المبلغ'] || row['amount']) || 0;
          const discount = Number(row['الخصم'] || row['discount']) || 0;
          const paid = Number(row['المسدد'] || row['paid']) || 0;
          const net = amount - discount;
          
          let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
          if (paid >= net && net > 0) status = 'paid';
          else if (paid > 0) status = 'partial';

          return {
            invoiceNumber: String(row['رقم الفاتورة'] || row['invoice_number'] || ''),
            date: safeFormatDate(new Date(row['التاريخ'] || row['date'] || Date.now()), 'yyyy-MM-dd', { useAr: false }),
            amount,
            discount,
            purchaseType: (row['نوع الشراء'] === 'نقدي' || row['type'] === 'cash') ? 'cash' : 'credit',
            paidAmount: paid,
            dueDate: row['تاريخ الاستحقاق'] ? safeFormatDate(new Date(row['تاريخ الاستحقاق']), 'yyyy-MM-dd', { useAr: false }) : '',
            paymentDate: row['تاريخ التسديد'] ? safeFormatDate(new Date(row['تاريخ التسديد']), 'yyyy-MM-dd', { useAr: false }) : '',
            notes: row['ملاحظات'] || row['notes'] || '',
            discountType: 'fixed',
            discountPercentage: 0,
            images: [],
            receiptImages: [],
            status
          };
        });

        if (importedRows.length > 0) {
          setInvoices(importedRows);
          setStep('data');
          toast.success(`تم استيراد ${importedRows.length} فاتورة بنجاح`);
        }
      } catch (err) {
        toast.error('خطأ في قراءة ملف Excel');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handlePasteFromExcel = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const rows = text.split('\n').map(row => row.split('\t'));
      
      if (rows.length === 0 || rows[0].length < 3) {
        toast.error('تنسيق البيانات غير صحيح للصح');
        return;
      }

      const pastedRows: InvoiceRow[] = rows.filter(r => r.length >= 3 && r[0].trim() !== '').map(row => {
        const amount = parseFloat(row[2]) || 0;
        const discount = parseFloat(row[3]) || 0;
        const paid = parseFloat(row[5]) || 0;
        const net = amount - discount;

        let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
        if (paid >= net && net > 0) status = 'paid';
        else if (paid > 0) status = 'partial';

        return {
          invoiceNumber: row[0] || '',
          date: row[1] || safeFormatDate(new Date(), 'yyyy-MM-dd', { useAr: false }),
          amount,
          discount,
          purchaseType: row[4]?.includes('نقدي') ? 'cash' : 'credit',
          paidAmount: paid,
          dueDate: row[8] || '',
          paymentDate: row[9] || '',
          notes: row[10] || '',
          discountType: 'fixed',
          discountPercentage: 0,
          images: [],
          receiptImages: [],
          status
        };
      });

      if (pastedRows.length > 0) {
        setInvoices([...invoices.filter(inv => inv.invoiceNumber !== ''), ...pastedRows]);
        toast.success(`تم لصق ${pastedRows.length} فاتورة`);
      }
    } catch (err) {
      toast.error('فشل الوصول للحافظة');
    }
  };

  const handleFileChange = async (index: number, e: React.ChangeEvent<HTMLInputElement>, type: 'invoice' | 'receipt') => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const base64s: string[] = [];
    for (const file of files) {
      const base64 = await fileToBase64(file as File);
      base64s.push(base64);
    }

    const newInvoices = [...invoices];
    if (type === 'invoice') {
      newInvoices[index].images = [...newInvoices[index].images, ...base64s];
    } else {
      newInvoices[index].receiptImages = [...newInvoices[index].receiptImages, ...base64s];
    }
    setInvoices(newInvoices);
  };

  const handleRemoveImage = (rowIdx: number, imgIdx: number, type: 'invoice' | 'receipt') => {
    const newInvoices = [...invoices];
    if (type === 'invoice') {
      newInvoices[rowIdx].images = newInvoices[rowIdx].images.filter((_, i) => i !== imgIdx);
    } else {
      newInvoices[rowIdx].receiptImages = newInvoices[rowIdx].receiptImages.filter((_, i) => i !== imgIdx);
    }
    setInvoices(newInvoices);
  };

  const validateDraft = () => {
    for (const inv of invoices) {
      if (!inv.invoiceNumber) { toast.error('يرجى إدخال رقم الفاتورة'); return false; }
      if (!inv.date) { toast.error('يرجى إدخال تاريخ الفاتورة'); return false; }
      if (inv.amount <= 0) { toast.error('المبلغ يجب أن يكون أكبر من صفر'); return false; }
    }
    return true;
  };

  const handleFinalSave = async () => {
    if (isSaving) return;
    setIsSaving(true);

    console.trace("INVOICE HISTORICAL SAVE CALLED");
    const toastId = toast.loading('جاري رفع الصور وحفظ الفواتير...');
    
    try {
      let totalDebtToUpdate = 0;

      for (const inv of invoices) {
        // Upload images if they are base64
        const uploadedInvoiceImages = await Promise.all(
          inv.images.map(async (img) => {
            if (img.startsWith('data:')) {
              return await firebaseService.uploadImage('invoices', img);
            }
            return img;
          })
        );

        const uploadedReceiptImages = await Promise.all(
          inv.receiptImages.map(async (img) => {
            if (img.startsWith('data:')) {
              return await firebaseService.uploadImage('payments', img);
            }
            return img;
          })
        );

        const netAmount = inv.amount - inv.discount;
        const remaining = netAmount - inv.paidAmount;
        
        // Update total debt logic
        if (inv.status !== 'paid') {
          totalDebtToUpdate += remaining;
        }

        const entry: Partial<LedgerEntry> = {
          accountId: entity.id!,
          accountName: entity.name,
          accountType: entity.type,
          date: toValidDate(inv.date),
          invoiceDate: toValidDate(inv.date),
          operationType: 'invoice',
          type: 'purchase_invoice',
          subtype: 'historical',
          purchaseType: inv.purchaseType,
          invoiceNumber: inv.invoiceNumber,
          amount: inv.amount,
          totalAmount: inv.amount,
          discount: inv.discount,
          discountType: inv.discountType,
          discountValue: inv.discountPercentage,
          netAmount: netAmount,
          paidAmount: inv.paidAmount,
          remainingAmount: remaining,
          paymentStatus: inv.status,
          dueDate: inv.dueDate ? toValidDate(inv.dueDate) : undefined,
          notes: inv.notes + (inv.paymentDate ? ` | تاريخ التسديد: ${inv.paymentDate}` : '') + ' (فاتورة قديمة / مرحّلة)',
          imageUrls: uploadedInvoiceImages,
          imageUrl: uploadedInvoiceImages[0] || '',
          isHistorical: true,
          isCommitted: true,
          source: 'historical',
          branchId,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await firebaseService.saveInvoice(entry);
        const invoiceId = result?.id;
        
        if (inv.paidAmount > 0) {
          const paymentEntry: Partial<LedgerEntry> = {
            accountId: entity.id!,
            accountName: entity.name,
            accountType: entity.type,
            date: inv.paymentDate ? toValidDate(inv.paymentDate) : toValidDate(inv.date),
            operationType: 'payment',
            type: 'payment',
            subtype: 'historical',
            amount: inv.paidAmount,
            discount: 0,
            netAmount: inv.paidAmount,
            notes: `تسديد للفاتورة رقم ${inv.invoiceNumber} (مرحّلة)`,
            linkedInvoiceId: invoiceId,
            linkedInvoiceNumber: inv.invoiceNumber,
            imageUrls: uploadedReceiptImages,
            imageUrl: uploadedReceiptImages[0] || '',
            isHistorical: true,
            isCommitted: true,
            branchId,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          await firebaseService.addDocument('ledgerEntries', paymentEntry);
          
          // Sync payment to transactions
          await firebaseService.syncTransaction({
            ...paymentEntry,
            sourceId: invoiceId + '_pay',
            sourceType: 'payment'
          });
        }
      }

      // Update entity balance
      if (totalDebtToUpdate !== 0) {
        await firebaseService.updateDocument('entities', entity.id!, {
          balance: (entity.balance || 0) + totalDebtToUpdate,
          totalInvoices: (entity.totalInvoices || 0) + invoices.length,
          totalPayments: (entity.totalPayments || 0) + invoices.reduce((acc, i) => acc + i.paidAmount, 0),
          updatedAt: new Date()
        });
      } else {
        await firebaseService.updateDocument('entities', entity.id!, {
          totalInvoices: (entity.totalInvoices || 0) + invoices.length,
          totalPayments: (entity.totalPayments || 0) + invoices.reduce((acc, i) => acc + i.paidAmount, 0),
          updatedAt: new Date()
        });
      }

      toast.dismiss(toastId);
      toast.success('تم استيراد الفواتير القديمة بنجاح وتحديث الرصيد');
      onComplete();
      onOpenChange(false);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error('حدث خطأ أثناء الحفظ');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const summary = useMemo(() => {
    return {
      count: invoices.length,
      totalAmount: invoices.reduce((acc, i) => acc + i.amount, 0),
      totalPaid: invoices.reduce((acc, i) => acc + i.paidAmount, 0),
      totalRemaining: invoices.reduce((acc, i) => acc + (i.amount - i.discount - i.paidAmount), 0),
      paidCount: invoices.filter(i => i.status === 'paid').length,
      unpaidCount: invoices.filter(i => i.status !== 'paid').length
    };
  }, [invoices]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-[1200px] w-full h-[90vh] flex flex-col p-0 overflow-hidden bg-card border-border rounded-3xl" dir="rtl">
        <DialogHeader className="p-6 bg-primary text-primary-foreground shrink-0">
          <div className="flex justify-between items-center">
             <div>
                <DialogTitle className="text-2xl font-black flex items-center gap-2">
                  <RefreshCcw className="h-6 w-6" />
                  استيراد فواتير قديمة - {entity.name}
                </DialogTitle>
                <DialogDescription className="text-primary-foreground/80 font-bold">اتبع الخطوات لإضافة الأرشفة التاريخية لهذا المورد</DialogDescription>
             </div>
             <div className="hidden md:flex gap-2">
                {[
                  { id: 'period', label: 'الفترة' },
                  { id: 'data', label: 'البيانات' },
                  { id: 'attachments', label: 'المرفقات' },
                  { id: 'review', label: 'المراجعة' }
                ].map((s, idx) => (
                  <div key={s.id} className="flex items-center">
                    <div className={`size-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                      step === s.id ? 'bg-white text-primary ring-4 ring-white/20 scale-110' : 
                      idx < ['period', 'data', 'attachments', 'review'].indexOf(step) ? 'bg-emerald-400 text-white' : 'bg-primary-foreground/20 text-primary-foreground'
                    }`}>
                      {idx + 1}
                    </div>
                    {idx < 3 && <div className="w-8 h-0.5 bg-primary-foreground/20 mx-1" />}
                  </div>
                ))}
             </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {step === 'period' && (
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-bold">من تاريخ</Label>
                    <Input 
                      type="date" 
                      value={period.startDate} 
                      onChange={e => setPeriod({...period, startDate: e.target.value})}
                      className="bg-muted h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">إلى تاريخ</Label>
                    <Input 
                      type="date" 
                      value={period.endDate} 
                      onChange={e => setPeriod({...period, endDate: e.target.value})}
                      className="bg-muted h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">السنة المالية</Label>
                    <Select value={period.year} onValueChange={v => setPeriod({...period, year: v})}>
                       <SelectTrigger className="bg-muted h-12 rounded-xl font-bold">
                          <SelectValue />
                       </SelectTrigger>
                       <SelectContent className="bg-card border-border">
                          {['2020','2021','2022','2023','2024','2025'].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                       </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">نوع الإدخال</Label>
                    <Select value={period.importType} onValueChange={(v: any) => setPeriod({...period, importType: v})}>
                       <SelectTrigger className="bg-muted h-12 rounded-xl font-bold">
                          <SelectValue />
                       </SelectTrigger>
                       <SelectContent className="bg-card border-border">
                          <SelectItem value="manual">إدخال جماعي يدوي</SelectItem>
                          <SelectItem value="excel">استيراد من Excel</SelectItem>
                       </SelectContent>
                    </Select>
                  </div>
               </div>

               {period.importType === 'excel' ? (
                 <div className="p-12 border-2 border-dashed border-border rounded-3xl flex flex-col items-center gap-6 bg-muted/30">
                    <div className="size-20 bg-emerald-500/10 rounded-full flex items-center justify-center">
                       <FileSpreadsheet className="h-10 w-10 text-emerald-500" />
                    </div>
                    <div className="text-center">
                       <p className="font-black text-xl">تحميل ملف الإكسل</p>
                       <p className="text-muted-foreground font-bold text-sm">يجب أن يحتوي الملف على أعمدة (رقم الفاتورة، التاريخ، المبلغ، الخصم، المسدد)</p>
                    </div>
                    <input 
                      type="file" 
                      id="excel-upload" 
                      className="hidden" 
                      accept=".xlsx, .xls"
                      onChange={handleExcelImport}
                    />
                    <Button onClick={() => document.getElementById('excel-upload')?.click()} className="bg-emerald-600 hover:bg-emerald-700 text-white h-14 px-8 rounded-2xl font-black gap-2">
                       <Upload className="h-5 w-5" />
                       اختر ملف Excel
                    </Button>
                 </div>
               ) : (
                 <div className="p-8 bg-primary/5 rounded-3xl border border-primary/10 flex items-center gap-4">
                    <AlertCircle className="h-8 w-8 text-primary shrink-0" />
                    <div>
                       <p className="font-black text-primary">الإدخال اليدوي</p>
                       <p className="text-sm font-bold text-primary/70">ستقوم بإدخال البيانات فاتورة تلو الأخرى في الجدول التالي. يمكنك أيضاً لصق البيانات من إكسل مباشرة داخل الجدول.</p>
                    </div>
                 </div>
               )}
            </div>
          )}

          {step === 'data' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-left-4 h-full flex flex-col">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card py-2 shrink-0">
                   <div>
                      <h3 className="font-black text-xl">قائمة الفواتير القديمة ({invoices.length})</h3>
                      <p className="text-xs text-muted-foreground font-bold">قم بإدخال تفاصيل الفواتير السابقة للمورد</p>
                   </div>
                   <div className="flex gap-3 w-full md:w-auto">
                      <Button variant="outline" onClick={handlePasteFromExcel} className="flex-1 md:flex-none h-11 font-black rounded-xl border-border hover:bg-muted gap-2 text-sm">
                         <FileSpreadsheet className="h-4 w-4" />
                         لصق من Excel
                      </Button>
                      <Button onClick={handleAddRow} className="flex-1 md:flex-none bg-primary text-primary-foreground h-11 px-6 font-black rounded-xl gap-2 text-sm shadow-md">
                         <Plus className="h-4 w-4" />
                         إضافة فاتورة
                      </Button>
                   </div>
                </div>

                {/* Mobile/Tablet Card View */}
                <div className="md:hidden space-y-4">
                   {invoices.map((inv, idx) => (
                      <Card key={idx} className="border-border rounded-2xl bg-muted/20 relative">
                         <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleRemoveRow(idx)} 
                            className="absolute top-2 left-2 size-8 text-rose-500 hover:bg-rose-500/10 rounded-full z-10"
                         >
                            <Trash2 className="h-4 w-4" />
                         </Button>
                         <CardContent className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                               <div className="space-y-1">
                                  <Label className="text-[10px] font-black text-muted-foreground">رقم الفاتورة</Label>
                                  <Input 
                                    value={inv.invoiceNumber} 
                                    onChange={e => handleUpdateRow(idx, {invoiceNumber: e.target.value})}
                                    placeholder="0000"
                                    className={`h-11 bg-card rounded-xl font-bold ${existingInvoiceNumbers.has(inv.invoiceNumber) ? 'border-rose-500 text-rose-500 ring-rose-500' : ''}`}
                                  />
                               </div>
                               <div className="space-y-1">
                                  <Label className="text-[10px] font-black text-muted-foreground">التاريخ</Label>
                                  <Input 
                                    type="date" 
                                    value={inv.date} 
                                    onChange={e => handleUpdateRow(idx, {date: e.target.value})}
                                    className="h-11 bg-card rounded-xl font-bold text-xs"
                                  />
                               </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                               <div className="space-y-1">
                                  <Label className="text-[10px] font-black text-muted-foreground text-indigo-600">المبلغ</Label>
                                  <CurrencyInput 
                                    value={inv.amount} 
                                    onChange={val => handleUpdateRow(idx, {amount: val})}
                                    className="h-11 bg-card rounded-xl font-black text-indigo-600"
                                  />
                               </div>
                               <div className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <Label className="text-[10px] font-black text-rose-500 text-rose-500">الخصم</Label>
                                    <div className="flex bg-muted rounded p-0.5 scale-75 origin-right">
                                      <button type="button" onClick={() => handleUpdateRow(idx, {discountType: 'fixed'})} className={`px-2 py-0.5 text-[8px] font-black rounded transition-all ${inv.discountType === 'fixed' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground'}`}>د.ع</button>
                                      <button type="button" onClick={() => handleUpdateRow(idx, {discountType: 'percentage'})} className={`px-2 py-0.5 text-[8px] font-black rounded transition-all ${inv.discountType === 'percentage' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground'}`}>%</button>
                                    </div>
                                  </div>
                                  {inv.discountType === 'percentage' ? (
                                    <div className="relative">
                                      <Input 
                                        type="number"
                                        value={inv.discountPercentage}
                                        onChange={e => handleUpdateRow(idx, {discountPercentage: parseFloat(e.target.value) || 0})}
                                        className="h-11 bg-card rounded-xl font-bold text-rose-500 pl-6 text-left"
                                      />
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-rose-500">%</span>
                                    </div>
                                  ) : (
                                    <CurrencyInput 
                                      value={inv.discount} 
                                      onChange={val => handleUpdateRow(idx, {discount: val})}
                                      className="h-11 bg-card rounded-xl font-bold text-rose-500"
                                    />
                                  )}
                               </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                               <div className="space-y-1">
                                  <Label className="text-[10px] font-black text-muted-foreground text-emerald-600">المسدد</Label>
                                  <CurrencyInput 
                                    value={inv.paidAmount} 
                                    onChange={val => handleUpdateRow(idx, {paidAmount: val})}
                                    className="h-11 bg-card rounded-xl font-bold text-emerald-600"
                                  />
                               </div>
                               <div className="space-y-1">
                                  <Label className="text-[10px] font-black text-muted-foreground">النوع</Label>
                                  <Select 
                                    value={inv.purchaseType} 
                                    onValueChange={val => handleUpdateRow(idx, {purchaseType: val as any})}
                                  >
                                     <SelectTrigger className="h-11 bg-card rounded-xl font-bold">
                                        <SelectValue />
                                     </SelectTrigger>
                                     <SelectContent>
                                        <SelectItem value="credit">آجل</SelectItem>
                                        <SelectItem value="cash">نقدي</SelectItem>
                                     </SelectContent>
                                  </Select>
                               </div>
                            </div>
                            <div className="flex gap-3">
                               <div className="bg-muted/50 p-3 rounded-xl flex-1 flex justify-between items-center">
                                  <span className="text-xs font-black text-muted-foreground">المتبقي</span>
                                  <span className={`font-black text-lg ${inv.amount - inv.discount - inv.paidAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                     {(inv.amount - inv.discount - inv.paidAmount).toLocaleString()}
                                  </span>
                               </div>
                               <Button 
                                 variant="ghost" 
                                 onClick={() => setStep('attachments')}
                                 className={`h-auto px-4 rounded-xl gap-2 font-black border transition-all ${
                                   (inv.images.length + inv.receiptImages.length) > 0 
                                   ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' 
                                   : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                                 }`}
                               >
                                  <ImageIcon className="h-5 w-5" />
                                  <span className="text-lg">{inv.images.length + inv.receiptImages.length}</span>
                               </Button>
                            </div>
                         </CardContent>
                      </Card>
                   ))}
                </div>

                {/* Desktop Professional Editable Grid */}
                <div className="hidden md:block flex-1 border border-border rounded-2xl overflow-hidden bg-card shadow-inner">
                   <div className="overflow-x-auto h-full">
                      <table className="w-full text-sm border-collapse min-w-[1300px]">
                         <thead className="bg-muted/80 backdrop-blur sticky top-0 z-20 shadow-sm">
                            <tr>
                               <th className="p-4 text-right font-black text-muted-foreground border-b border-border w-[160px]">رقم الفاتورة</th>
                               <th className="p-4 text-right font-black text-muted-foreground border-b border-border w-[160px]">التاريخ</th>
                               <th className="p-4 text-right font-black text-muted-foreground border-b border-border w-[160px]">المبلغ (د.ع)</th>
                               <th className="p-4 text-right font-black text-muted-foreground border-b border-border w-[140px]">الخصم</th>
                               <th className="p-4 text-right font-black text-muted-foreground border-b border-border w-[120px]">النوع</th>
                               <th className="p-4 text-right font-black text-muted-foreground border-b border-border w-[160px]">المسدد</th>
                               <th className="p-4 text-right font-black text-muted-foreground border-b border-border w-[160px]">المتبقي</th>
                               <th className="p-4 text-center font-black text-muted-foreground border-b border-border w-[100px]">المرفقات</th>
                               <th className="p-4 text-right font-black text-muted-foreground border-b border-border min-w-[220px]">ملاحظات</th>
                               <th className="p-4 text-center font-black text-muted-foreground border-b border-border w-[80px]">إجراء</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-border/50">
                            {invoices.map((inv, idx) => (
                               <tr key={idx} className="hover:bg-muted/30 transition-colors group">
                                  <td className="p-2 align-middle">
                                     <Input 
                                       value={inv.invoiceNumber} 
                                       onChange={e => handleUpdateRow(idx, {invoiceNumber: e.target.value})}
                                       placeholder="رقم القائمة"
                                       className={`bg-transparent border-none font-black focus:ring-2 focus:ring-primary h-11 text-lg rounded-xl text-right ${existingInvoiceNumbers.has(inv.invoiceNumber) ? 'text-rose-500 placeholder:text-rose-300' : ''}`}
                                     />
                                  </td>
                                  <td className="p-2 align-middle">
                                     <Input 
                                       type="date" 
                                       value={inv.date} 
                                       onChange={e => handleUpdateRow(idx, {date: e.target.value})}
                                       className="bg-transparent border-none focus:ring-2 focus:ring-primary h-11 text-xs font-bold rounded-xl"
                                     />
                                  </td>
                                  <td className="p-2 align-middle">
                                     <CurrencyInput 
                                       value={inv.amount} 
                                       onChange={val => handleUpdateRow(idx, {amount: val})}
                                       className="bg-primary/5 border-none font-black text-indigo-700 h-11 text-lg px-4 rounded-xl text-left"
                                     />
                                  </td>
                                  <td className="p-2 align-middle min-w-[120px]">
                                     <div className="flex flex-col gap-1">
                                        <div className="flex bg-muted/50 p-0.5 rounded-lg w-fit ml-auto">
                                          <button type="button" onClick={() => handleUpdateRow(idx, {discountType: 'fixed'})} className={`px-2 py-0.5 text-[8px] font-black rounded transition-all ${inv.discountType === 'fixed' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground'}`}>د.ع</button>
                                          <button type="button" onClick={() => handleUpdateRow(idx, {discountType: 'percentage'})} className={`px-2 py-0.5 text-[8px] font-black rounded transition-all ${inv.discountType === 'percentage' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground'}`}>%</button>
                                        </div>
                                        {inv.discountType === 'percentage' ? (
                                          <div className="relative">
                                            <Input 
                                              type="number"
                                              value={inv.discountPercentage}
                                              onChange={e => handleUpdateRow(idx, {discountPercentage: parseFloat(e.target.value) || 0})}
                                              className="bg-transparent border-none font-bold text-rose-500 h-11 rounded-xl text-left pl-6"
                                            />
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-rose-500">%</span>
                                          </div>
                                        ) : (
                                          <CurrencyInput 
                                            value={inv.discount} 
                                            onChange={val => handleUpdateRow(idx, {discount: val})}
                                            className="bg-transparent border-none font-bold text-rose-500 h-11 rounded-xl text-left"
                                          />
                                        )}
                                     </div>
                                  </td>
                                  <td className="p-2 align-middle">
                                     <Select 
                                       value={inv.purchaseType} 
                                       onValueChange={val => handleUpdateRow(idx, {purchaseType: val as any})}
                                     >
                                        <SelectTrigger className="bg-transparent border-none font-black text-xs h-11 focus:ring-0">
                                           <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                           <SelectItem value="credit">آجل</SelectItem>
                                           <SelectItem value="cash">نقدي</SelectItem>
                                        </SelectContent>
                                     </Select>
                                  </td>
                                  <td className="p-2 align-middle">
                                     <CurrencyInput 
                                       value={inv.paidAmount} 
                                       onChange={val => handleUpdateRow(idx, {paidAmount: val})}
                                       className="bg-emerald-500/5 border-none font-black text-emerald-700 h-11 rounded-xl text-left"
                                     />
                                  </td>
                                  <td className="p-2 align-middle">
                                     <div className={`font-black h-11 flex items-center justify-end px-4 text-lg tabular-nums ${inv.amount - inv.discount - inv.paidAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {(inv.amount - inv.discount - inv.paidAmount).toLocaleString()}
                                     </div>
                                  </td>
                                  <td className="p-2 align-middle text-center">
                                     <Popover>
                                        <PopoverTrigger className={cn(buttonVariants({ variant: 'ghost' }), 'h-11 px-3 rounded-xl gap-2 font-black border transition-all', (inv.images.length + inv.receiptImages.length) > 0 ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted')}> <ImageIcon className='h-4 w-4' /> <span>{inv.images.length + inv.receiptImages.length}</span> </PopoverTrigger>
                                        <PopoverContent className="w-80 bg-card border-border p-4 shadow-2xl rounded-2xl" align="center" dir="rtl">
                                           <div className="space-y-4">
                                              <div className="flex justify-between items-center">
                                                 <h4 className="font-black text-sm">مرفقات الفاتورة</h4>
                                                 <span className="text-[10px] text-muted-foreground font-bold">رقم: {inv.invoiceNumber || idx + 1}</span>
                                              </div>
                                              
                                              <div className="grid grid-cols-1 gap-4">
                                                 <div className="space-y-2">
                                                    <Label className="text-[10px] font-black text-muted-foreground uppercase">صور القوائم</Label>
                                                    <div className="flex flex-wrap gap-2">
                                                       {inv.images.map((img, imgIdx) => (
                                                          <div key={imgIdx} className="relative size-12 group">
                                                             <img src={img} className="size-full object-cover rounded-lg border border-border" />
                                                             <button 
                                                               onClick={() => handleRemoveImage(idx, imgIdx, 'invoice')}
                                                               className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                             >
                                                                <X className="h-3 w-3" />
                                                             </button>
                                                          </div>
                                                       ))}
                                                       <label className="size-12 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition-colors">
                                                          <Plus className="h-4 w-4 text-muted-foreground" />
                                                          <input type="file" multiple accept="image/*" className="hidden" onChange={e => handleFileChange(idx, e, 'invoice')} />
                                                       </label>
                                                    </div>
                                                 </div>

                                                 <div className="space-y-2">
                                                    <Label className="text-[10px] font-black text-muted-foreground uppercase">صور الوصلات</Label>
                                                    <div className="flex flex-wrap gap-2">
                                                       {inv.receiptImages.map((img, imgIdx) => (
                                                          <div key={imgIdx} className="relative size-12 group">
                                                             <img src={img} className="size-full object-cover rounded-lg border border-border" />
                                                             <button 
                                                               onClick={() => handleRemoveImage(idx, imgIdx, 'receipt')}
                                                               className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                             >
                                                                <X className="h-3 w-3" />
                                                             </button>
                                                          </div>
                                                       ))}
                                                       <label className="size-12 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition-colors">
                                                          <Plus className="h-4 w-4 text-muted-foreground" />
                                                          <input type="file" multiple accept="image/*" className="hidden" onChange={e => handleFileChange(idx, e, 'receipt')} />
                                                       </label>
                                                    </div>
                                                 </div>

                                                 <Button variant="outline" className="w-full text-xs font-black h-9 rounded-xl border-primary/20 text-primary hover:bg-primary/5" onClick={() => setStep('attachments')}>
                                                    تفاصيل المرفقات والكاميرا
                                                 </Button>
                                              </div>
                                           </div>
                                        </PopoverContent>
                                     </Popover>
                                  </td>
                                  <td className="p-2 align-middle">
                                     <Input 
                                       value={inv.notes} 
                                       onChange={e => handleUpdateRow(idx, {notes: e.target.value})}
                                       placeholder="ملاحظات..."
                                       className="bg-transparent border-none text-xs font-bold h-11 rounded-xl"
                                     />
                                  </td>
                                  <td className="p-2 align-middle text-center">
                                     <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => handleRemoveRow(idx)} 
                                        className="h-10 w-10 text-muted-foreground hover:text-white hover:bg-rose-500 rounded-xl transition-all"
                                     >
                                        <Trash2 className="h-4 w-4" />
                                     </Button>
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>
            </div>
          )}

          {step === 'attachments' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {invoices.map((inv, idx) => (
                    <Card key={idx} className="border-border overflow-hidden rounded-2xl shadow-sm">
                       <div className="bg-muted/50 p-4 border-b border-border flex justify-between items-center">
                          <h4 className="font-black text-sm">فاتورة رقم: {inv.invoiceNumber || '---'}</h4>
                          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{idx + 1} / {invoices.length}</span>
                       </div>
                       <CardContent className="p-4 space-y-6">
                          <div className="space-y-3">
                             <Label className="text-xs font-black text-muted-foreground">صور الفاتورة</Label>
                             <div className="flex flex-wrap gap-2">
                                {inv.images.map((img, imgIdx) => (
                                   <div key={imgIdx} className="relative size-16 group">
                                      <img src={img} className="size-full object-cover rounded-lg border border-border" />
                                      <button 
                                        onClick={() => handleRemoveImage(idx, imgIdx, 'invoice')}
                                        className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                         <X className="h-3 w-3" />
                                      </button>
                                   </div>
                                ))}
                                <div className="flex gap-2">
                                   <label className="size-16 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition-colors">
                                      <Plus className="h-5 w-5 text-muted-foreground" />
                                      <input type="file" multiple accept="image/*" className="hidden" onChange={e => handleFileChange(idx, e, 'invoice')} />
                                   </label>
                                   <ImageCapture 
                                      id={`cam-inv-${idx}`}
                                      label=""
                                      onImageCaptured={async (file) => {
                                         const b64 = await fileToBase64(file);
                                         const newInvoices = [...invoices];
                                         newInvoices[idx].images = [...newInvoices[idx].images, b64];
                                         setInvoices(newInvoices);
                                      }}
                                      renderTrigger={(open) => (
                                         <Button variant="outline" className="size-16 border-2 border-dashed border-border rounded-lg p-0 hover:bg-muted" onClick={open}>
                                            <Camera className="h-5 w-5 text-muted-foreground" />
                                         </Button>
                                      )}
                                   />
                                </div>
                             </div>
                          </div>

                          <div className="space-y-3">
                             <Label className="text-xs font-black text-muted-foreground">وصولات التسديد</Label>
                             <div className="flex flex-wrap gap-2">
                                {inv.receiptImages.map((img, imgIdx) => (
                                   <div key={imgIdx} className="relative size-16 group">
                                      <img src={img} className="size-full object-cover rounded-lg border border-border" />
                                      <button 
                                        onClick={() => handleRemoveImage(idx, imgIdx, 'receipt')}
                                        className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                         <X className="h-3 w-3" />
                                      </button>
                                   </div>
                                ))}
                                <div className="flex gap-2">
                                   <label className="size-16 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition-colors">
                                      <Plus className="h-5 w-5 text-muted-foreground" />
                                      <input type="file" multiple accept="image/*" className="hidden" onChange={e => handleFileChange(idx, e, 'receipt')} />
                                   </label>
                                   <ImageCapture 
                                      id={`cam-rec-${idx}`}
                                      label=""
                                      onImageCaptured={async (file) => {
                                         const b64 = await fileToBase64(file);
                                         const newInvoices = [...invoices];
                                         newInvoices[idx].receiptImages = [...newInvoices[idx].receiptImages, b64];
                                         setInvoices(newInvoices);
                                      }}
                                      renderTrigger={(open) => (
                                         <Button variant="outline" className="size-16 border-2 border-dashed border-border rounded-lg p-0 hover:bg-muted" onClick={open}>
                                            <Camera className="h-5 w-5 text-muted-foreground" />
                                         </Button>
                                      )}
                                   />
                                </div>
                             </div>
                          </div>
                          <div className="space-y-2">
                             <Label className="text-xs font-black text-muted-foreground">تاريخ الاستحقاق والتسديد</Label>
                             <div className="grid grid-cols-2 gap-2">
                                <Input type="date" value={inv.dueDate} onChange={e => handleUpdateRow(idx, {dueDate: e.target.value})} className="h-9 text-xs rounded-lg" placeholder="تاريخ الاستحقاق" />
                                <Input type="date" value={inv.paymentDate} onChange={e => handleUpdateRow(idx, {paymentDate: e.target.value})} className="h-9 text-xs rounded-lg" placeholder="تاريخ التسديد" />
                             </div>
                          </div>
                          <Textarea 
                            placeholder="ملاحظات لهذه الفاتورة..." 
                            value={inv.notes} 
                            onChange={e => handleUpdateRow(idx, {notes: e.target.value})}
                            className="bg-muted/50 text-xs min-h-[60px] rounded-xl border-border"
                          />
                       </CardContent>
                    </Card>
                  ))}
               </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-8 animate-in zoom-in-95 duration-300">
               <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <Card className="bg-primary/5 border-primary/20 rounded-3xl">
                     <CardContent className="p-6 text-center">
                        <p className="text-xs font-black text-muted-foreground mb-1">عدد الفواتير</p>
                        <p className="text-2xl font-black text-primary">{summary.count}</p>
                     </CardContent>
                  </Card>
                  <Card className="bg-indigo-500/5 border-indigo-500/20 rounded-3xl">
                     <CardContent className="p-6 text-center">
                        <p className="text-xs font-black text-muted-foreground mb-1">إجمالي المبالغ</p>
                        <p className="text-2xl font-black text-indigo-600">{summary.totalAmount.toLocaleString()} د.ع</p>
                     </CardContent>
                  </Card>
                  <Card className="bg-emerald-500/5 border-emerald-500/20 rounded-3xl">
                     <CardContent className="p-6 text-center">
                        <p className="text-xs font-black text-muted-foreground mb-1">إجمالي المسدد</p>
                        <p className="text-2xl font-black text-emerald-600">{summary.totalPaid.toLocaleString()} د.ع</p>
                     </CardContent>
                  </Card>
                  <Card className="bg-rose-500/5 border-rose-500/20 rounded-3xl">
                     <CardContent className="p-6 text-center">
                        <p className="text-xs font-black text-muted-foreground mb-1">إجمالي المتبقي (دين جديد)</p>
                        <p className="text-2xl font-black text-rose-600">{summary.totalRemaining.toLocaleString()} د.ع</p>
                     </CardContent>
                  </Card>
                  <Card className="bg-emerald-500/10 border-emerald-500/20 rounded-3xl">
                     <CardContent className="p-6 text-center">
                        <p className="text-xs font-black text-muted-foreground mb-1">فواتير مسددة</p>
                        <p className="text-2xl font-black text-emerald-600">{summary.paidCount}</p>
                     </CardContent>
                  </Card>
                  <Card className="bg-rose-500/10 border-rose-500/20 rounded-3xl">
                     <CardContent className="p-6 text-center">
                        <p className="text-xs font-black text-muted-foreground mb-1">فواتير غير مسددة / جزئية</p>
                        <p className="text-2xl font-black text-rose-600">{summary.unpaidCount}</p>
                     </CardContent>
                  </Card>
               </div>

               <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-3xl flex gap-4 items-center">
                  <AlertTriangle className="h-8 w-8 text-amber-600 shrink-0" />
                  <div>
                     <p className="font-black text-amber-700">تنبيه المراجعة النهائية</p>
                     <p className="text-sm font-bold text-amber-700/80">عند الضغط على "اعتماد وحفظ"، سيتم إضافة الفواتير لأرشيف النظام، وتعديل رصيد المكتب {entity.name} ليعكس المبالغ المتبقية في هذه الفواتير. هذه العملية دائمة ولا يمكن التراجع عنها دفعة واحدة.</p>
                  </div>
               </div>

               <div className="border border-border rounded-3xl overflow-hidden">
                  <table className="w-full text-xs">
                     <thead className="bg-muted text-muted-foreground font-black">
                        <tr>
                           <th className="p-3 text-right">رقم الفاتورة</th>
                           <th className="p-3 text-right">التاريخ</th>
                           <th className="p-3 text-right">المبلغ</th>
                           <th className="p-3 text-right">المسدد</th>
                           <th className="p-3 text-right">المتبقي</th>
                           <th className="p-3 text-right">الحالة</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-border">
                        {invoices.map((inv, idx) => {
                           const remaining = inv.amount - inv.discount - inv.paidAmount;
                           return (
                              <tr key={idx} className="hover:bg-muted/30">
                                 <td className="p-3 font-bold">{inv.invoiceNumber}</td>
                                 <td className="p-3">{inv.date}</td>
                                 <td className="p-3 font-black">{(inv.amount - inv.discount).toLocaleString()}</td>
                                 <td className="p-3 font-bold text-emerald-600">{inv.paidAmount.toLocaleString()}</td>
                                 <td className="p-3 font-bold text-rose-600">{remaining.toLocaleString()}</td>
                                 <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
                                       inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600' :
                                       inv.status === 'partial' ? 'bg-blue-500/10 text-blue-600' : 'bg-rose-500/10 text-rose-600'
                                    }`}>
                                       {inv.status === 'paid' ? 'مسددة' : inv.status === 'partial' ? 'جزئية' : 'غير مسددة'}
                                    </span>
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>
               </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 border-t border-border bg-muted/30 gap-4">
          {step !== 'period' && (
            <Button variant="outline" onClick={() => setStep(step === 'review' ? 'attachments' : step === 'attachments' ? 'data' : 'period')} className="px-8 h-12 rounded-xl font-bold border-border gap-2">
              <ChevronRight className="h-4 w-4" />
              السابق
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="px-8 h-12 rounded-xl font-bold text-muted-foreground">إلغاء</Button>
          
          {step !== 'review' ? (
            <Button 
               onClick={() => {
                 if (step === 'data' && !validateDraft()) return;
                 setStep(step === 'period' ? 'data' : step === 'data' ? 'attachments' : 'review');
               }} 
               className="px-10 h-12 rounded-xl font-black bg-primary text-primary-foreground gap-2"
            >
              المتابعة للخطوة التالية
              <ChevronLeft className="h-4 w-4" />
            </Button>
          ) : (
            <Button 
               onClick={handleFinalSave}
               className="px-12 h-14 rounded-2xl font-black bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-500/20"
            >
              <CheckCircle2 className="h-5 w-5" />
              اعتماد وحفظ الفواتير القديمة
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
