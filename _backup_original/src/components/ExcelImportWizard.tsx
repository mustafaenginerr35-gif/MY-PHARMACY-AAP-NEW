import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileUp, FileDown, CheckCircle2, AlertTriangle, XCircle, Loader2, Camera, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Entity, LedgerEntry, Transaction } from '../db';
import { firebaseService } from '../services/firebaseService';
import { getSimilarity, toValidDate, formatIQD } from '../lib/formatters';

interface ExcelImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entities: Entity[];
  currentBranchId?: string;
  appUser?: any;
  onImportComplete?: () => void;
  preSelectedEntityId?: string; // New: for supplier page context
}

const SUPPORTED_COLUMNS = [
  // Required Fields
  { key: 'invoiceNumber', label: 'رقم القائمة', required: true, synonyms: ['رقم القائمة', 'رقم الفاتورة', 'invoice_number', 'bill_no', 'invoice', 'رقم', 'invoice number', 'invoice_no', 'الرقم', 'رقم_الفاتورة'] },
  { key: 'date', label: 'تاريخ القائمة', required: true, synonyms: ['التاريخ', 'date', 'تاريخ الفاتورة', 'تاريخ', 'bill date', 'تاريخ_الفاتورة', 'تاريخ الفاتوره', 'الارسال'] },
  { key: 'amount', label: 'مبلغ القائمة', required: true, synonyms: ['مبلغ القائمة', 'مبلغ الفاتورة', 'total', 'amount', 'المبلغ', 'القيمة', 'invoice amount', 'sum', 'قيمة الفاتورة', 'الاجمالي', 'إجمالي', 'الصافي'] },
  
  // Optional / Auto-detected
  { key: 'entityName', label: 'اسم المورد/المذخر', required: false, synonyms: ['اسم المورد', 'اسم المذخر', 'supplier', 'entity', 'المورد', 'المذخر', 'supplier name', 'اسم_المورد', 'الشركة', 'اسم الشركة', 'اسم المجهز'] },
  { key: 'notes', label: 'ملاحظات', required: false, synonyms: ['ملاحظات', 'notes', 'بيان', 'comment', 'description', 'ملاحظه', 'الملاحظات', 'تفاصيل'] },
];

export function ExcelImportWizard({ 
  open, 
  onOpenChange, 
  entities, 
  currentBranchId, 
  appUser,
  onImportComplete,
  preSelectedEntityId
}: ExcelImportWizardProps) {
  const [step, setStep] = useState(1); // 1: Upload, 2: Map, 3: Edit & Confirm
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [editableData, setEditableData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedEntity = useMemo(() => 
    preSelectedEntityId ? entities.find(e => e.id === preSelectedEntityId) : null
  , [preSelectedEntityId, entities]);

  const reset = () => {
    setStep(1);
    setFile(null);
    setRawData([]);
    setHeaders([]);
    setMappings({});
    setEditableData([]);
    setIsLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = (selectedFile: File) => {
    setIsLoading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('Failed to read file data');

        const workbook = XLSX.read(data, { type: 'array' });
        
        // Find first non-empty sheet
        let worksheet = null;
        let sheetName = '';
        for (const name of workbook.SheetNames) {
          const sheet = workbook.Sheets[name];
          const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
          if (range.e.r > 0) { // Has more than one row
            worksheet = sheet;
            sheetName = name;
            break;
          }
        }

        if (!worksheet) {
          worksheet = workbook.Sheets[workbook.SheetNames[0]];
        }

        const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });
        
        if (json.length < 1) {
          toast.error('المستند فارغ');
          setIsLoading(false);
          return;
        }

        // Detect headers - skip empty rows at top if any
        let headerRowIndex = 0;
        while (headerRowIndex < json.length && (!json[headerRowIndex] || Object.values(json[headerRowIndex]).every(v => v === null || v === ''))) {
          headerRowIndex++;
        }

        if (headerRowIndex >= json.length) {
          toast.error('تعذر قراءة عناوين الأعمدة من الملف');
          setIsLoading(false);
          return;
        }

        const fileHeaders = json[headerRowIndex].map((h: any) => String(h || '').trim());
        
        // Debug logs as requested
        console.log('Detected Headers:', fileHeaders);
        
        // Convert to objects starting from the row after headers
        const dataRows = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex });
        
        // Filter out completely empty rows
        const filteredRows = dataRows.filter((row: any) => 
          Object.values(row).some(val => val !== null && val !== undefined && val !== '')
        );

        console.log('Sample Rows:', filteredRows.slice(0, 3));

        setHeaders(fileHeaders);
        setRawData(filteredRows);
        setFile(selectedFile);

        // Auto-mapping logic
        const normalize = (str: string) => str.toLowerCase().trim().replace(/[_\s-]+/g, '');
        
        const initialMappings: Record<string, string> = {};
        SUPPORTED_COLUMNS.forEach(col => {
          let bestMatch = '';
          let maxScore = 0;

          fileHeaders.forEach(header => {
            const normHeader = normalize(header);
            
            // 1. Direct match (normalized)
            if (normHeader === normalize(col.label)) {
              bestMatch = header;
              maxScore = 1;
              return;
            }

            // 2. Synonym match
            col.synonyms.forEach(syn => {
              const normSyn = normalize(syn);
              if (normHeader === normSyn) {
                bestMatch = header;
                maxScore = 1;
              } else if (normHeader.includes(normSyn) || normSyn.includes(normHeader)) {
                if (maxScore < 0.8) {
                  bestMatch = header;
                  maxScore = 0.8;
                }
              }
            });

            // 3. Similarity fallback
            if (maxScore < 0.6) {
              const sim = getSimilarity(header.toLowerCase(), col.label.toLowerCase());
              if (sim > 0.7 && sim > maxScore) {
                maxScore = sim;
                bestMatch = header;
              }
            }
          });

          if (bestMatch) {
            initialMappings[col.key] = bestMatch;
          }
        });

        setMappings(initialMappings);
        setStep(2);
      } catch (err) {
        console.error('Import Error:', err);
        toast.error('فشل في معالجة الملف. تأكد من أن الملف غير محمي بكلمة سر.');
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      toast.error('حدث خطأ أثناء قراءة الملف');
      setIsLoading(false);
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  const parsedData = useMemo(() => {
    return rawData.map((row, index) => {
      const getVal = (key: string) => {
        const header = mappings[key];
        return header ? row[header] : undefined;
      };

      const entityName = String(getVal('entityName') || '').trim();
      const entity = preSelectedEntityId 
        ? entities.find(e => e.id === preSelectedEntityId)
        : entities.find(e => e.name.trim() === entityName);
      
      const rawDate = getVal('date');
      const date = toValidDate(rawDate);
      const isDateValid = !isNaN(date.getTime());
      
      const amount = Number(getVal('amount') || 0);
      const invoiceNumber = String(getVal('invoiceNumber') || '');

      return {
        id: Math.random().toString(36).substr(2, 9),
        invoiceNumber,
        date: isDateValid ? date : undefined,
        entityId: entity?.id || null,
        entityName: entity?.name || entityName || 'مورد غير معروف',
        amount: isNaN(amount) ? 0 : amount,
        paidAmount: 0,
        remainingAmount: isNaN(amount) ? 0 : amount,
        paymentStatus: 'pending',
        purchaseType: 'credit',
        discount: 0,
        discountType: 'fixed' as const,
        bonus: '',
        dueDate: undefined as Date | undefined,
        notes: String(getVal('notes') || ''),
        isValid: !!entity && amount > 0 && !!invoiceNumber && isDateValid,
        isDateValid,
        images: [] as string[]
      };
    });
  }, [rawData, mappings, entities, preSelectedEntityId]);

  const handleNextToReview = () => {
    setEditableData(parsedData);
    setStep(3);
  };

  const updateRow = (id: string, updates: Partial<any>) => {
    setEditableData(prev => prev.map(row => {
      if (row.id !== id) return row;
      const updated = { ...row, ...updates };
      
      // Auto-recalculate remaining based on status and paid amount
      if (updates.paymentStatus || ('paidAmount' in updates) || ('amount' in updates)) {
        if (updated.paymentStatus === 'paid') {
          updated.paidAmount = updated.amount;
          updated.remainingAmount = 0;
        } else if (updated.paymentStatus === 'pending') {
          updated.paidAmount = 0;
          updated.remainingAmount = updated.amount;
        } else if (updated.paymentStatus === 'partially_paid') {
            updated.remainingAmount = Math.max(0, updated.amount - (Number(updated.paidAmount) || 0));
        }
      }

      // Re-validate row on any change
      updated.isValid = !!updated.entityId && 
                        !!updated.invoiceNumber && 
                        updated.amount > 0 && 
                        !!updated.date && 
                        !isNaN(toValidDate(updated.date).getTime());
      
      return updated;
    }));
  };

  const summary = useMemo(() => {
    const dataToUse = step === 3 ? editableData : parsedData;
    const validCount = dataToUse.filter(d => d.isValid).length;
    return {
      totalCount: dataToUse.length,
      validCount,
      invalidCount: dataToUse.length - validCount,
      totalAmount: dataToUse.reduce((sum, d) => sum + (Number(d.amount) || 0), 0),
      totalPaid: dataToUse.reduce((sum, d) => sum + (Number(d.paidAmount) || 0), 0),
      totalRemaining: dataToUse.reduce((sum, d) => sum + (Number(d.remainingAmount) || 0), 0),
      duplicateCount: 0 
    };
  }, [parsedData, editableData, step]);

  const missingRequiredFields = useMemo(() => {
    return SUPPORTED_COLUMNS.filter(col => col.required && !mappings[col.key]).map(col => col.label);
  }, [mappings]);

  const handleImport = async () => {
    console.trace("INVOICE EXCEL IMPORT CALLED");
    const validData = editableData.filter(d => d.isValid);
    if (validData.length === 0) {
      toast.error('لا توجد فواتير صالحة للاستيراد');
      return;
    }

    setIsLoading(true);
    let importedInvoices = 0;
    let skippedDuplicates = 0;
    let failedInvoices = 0;

    try {
      const targetBranchId = currentBranchId || (entities.length > 0 ? entities.find(e => e.id === validData[0].entityId)?.branchId : 'main');
      const userId = appUser?.userId || 'system';
      
      const localBalances: Record<string, number> = {};
      entities.forEach(e => {
        localBalances[e.id!] = e.balance || 0;
      });

      for (const data of validData) {
        try {
          const entityId = data.entityId;
          const entity = entities.find(e => e.id === entityId);
          if (!entity) continue;

          const currentEntityBalance = localBalances[entity.id!] || 0;
          
          const newEntry: Omit<LedgerEntry, 'id'> = {
            accountId: entity.id!,
            accountName: entity.name,
            accountType: entity.type,
            date: data.date,
            invoiceDate: data.date,
            operationType: 'invoice',
            purchaseType: data.purchaseType as any,
            invoiceNumber: String(data.invoiceNumber),
            amount: data.amount,
            discount: Number(data.discount) || 0,
            discountType: data.discountType,
            bonus: data.bonus ? String(data.bonus) : '',
            dueDate: data.dueDate,
            netAmount: data.amount, 
            paidAmount: Number(data.paidAmount) || 0,
            remainingAmount: Number(data.remainingAmount) || 0,
            paymentStatus: data.paymentStatus as any,
            ownerId: userId,
            branchId: targetBranchId as any,
            notes: data.notes,
            images: data.images,
            source: "excel_import",
            isCommitted: true,
            isHistorical: true,
            createdAt: new Date(),
            updatedAt: new Date()
          } as any;

          // Use unified saveInvoice for deduplication
          const result = await firebaseService.saveInvoice(newEntry);
          const addedId = result?.id;
          const isUpdate = result?.isUpdate;
          const blocked = (result as any)?.blocked;
          
          if (addedId && addedId !== 'blocked') {
            const newTx: Omit<Transaction, 'id'> = {
              type: 'invoice',
              category: 'invoice',
              amount: data.amount,
              date: data.date,
              invoiceDate: data.date,
              description: `استيراد Excel: ${entity.name} - ${data.invoiceNumber}`,
              entityId: entity.id!,
              entityName: entity.name,
              invoiceNumber: String(data.invoiceNumber),
              branchId: targetBranchId as any,
              ownerId: userId,
              source: "excel_import",
              sourceId: addedId,
              isCommitted: true,
              isHistorical: true,
              createdAt: new Date(),
              updatedAt: new Date()
            } as any;
            
            await firebaseService.syncTransaction(newTx);

            // Update entity ONLY if new and not blocked
            if (!isUpdate && !blocked) {
              const newBalanceValue = currentEntityBalance + data.remainingAmount;
              await firebaseService.updateDocument('entities', entity.id!, {
                balance: newBalanceValue,
                totalInvoices: (entity.totalInvoices || 0) + 1,
                updatedAt: new Date()
              } as any);

              localBalances[entity.id!] = newBalanceValue;

              if (data.dueDate && data.remainingAmount > 0) {
                await firebaseService.addDocument('deadlines', {
                  accountId: entity.id!,
                  accountName: entity.name,
                  invoiceId: addedId,
                  invoiceNumber: String(data.invoiceNumber),
                  amount: data.amount,
                  requiredPayment: data.remainingAmount,
                  dueDate: data.dueDate,
                  status: 'pending',
                  ownerId: userId,
                  branchId: targetBranchId as any,
                  createdAt: new Date(),
                  updatedAt: new Date()
                } as any);
              }
              importedInvoices++;
            } else {
              skippedDuplicates++;
            }
          } else if (blocked) {
             skippedDuplicates++;
          } else {
            failedInvoices++;
          }
        } catch (rowErr) {
          console.error('Row Import Error:', rowErr);
          failedInvoices++;
        }
      }

      toast.success(`تم الاستيراد بنجاح: ${importedInvoices} فاتورة (تخطي/تحديث ${skippedDuplicates} مكررة)`);
      onImportComplete?.();
      onOpenChange(false);
      reset();
    } catch (err) {
      console.error('Import process failed:', err);
      toast.error('فشل الاستيراد');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = () => {
    const data = [
      SUPPORTED_COLUMNS.map(c => c.label),
      ['INV-2024-001', '2024-05-01', 1500000, 'اسم المورد التجريبي', 'مثال لملاحظة']
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wscols = SUPPORTED_COLUMNS.map(() => ({ wch: 20 }));
    ws['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, ws, 'قالب استيراد الفواتير');
    XLSX.writeFile(workbook, 'Excel_Import_Template.xlsx');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if(!isLoading) onOpenChange(v); if(!v) reset(); }}>
      <DialogContent className={`${step === 3 ? 'max-w-7xl' : 'max-w-5xl'} max-h-[95vh] overflow-hidden flex flex-col rtl`}>
        <DialogHeader className="border-b pb-4">
          <div className="flex justify-between items-center">
            <div>
              <DialogTitle className="text-2xl font-black text-primary">
                {step === 3 ? `مراجعة وتعديل البيانات (${selectedEntity?.name || 'موردين متعددين'})` : 'استيراد الفواتير من Excel'}
              </DialogTitle>
              <DialogDescription className="font-bold">
                {step === 1 && 'قم برفع ملفك ومطابقة الأعمدة لاستيراد البيانات بسرعة'}
                {step === 2 && 'طابق أعمدة Excel مع حقول النظام'}
                {step === 3 && 'يمكنك تعديل البيانات وإضافة تفاصيل الدفع والصور قبل الحفظ النهائي'}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
               {step > 1 && (
                 <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={isLoading}>السابق</Button>
               )}
               {step === 2 && (
                 <Button onClick={handleNextToReview} disabled={missingRequiredFields.length > 0}>
                   {missingRequiredFields.length > 0 ? `يرجى اختيار الحقول المطلوبة` : 'المتابعة للمراجعة'}
                 </Button>
               )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-6">
          {step === 1 && (
            <div className="flex flex-col items-center justify-center py-20 px-8 border-2 border-dashed rounded-3xl border-muted-foreground/20 hover:border-primary/50 transition-all bg-muted/5 group">
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx, .xls, .csv"
              />
              <div className="bg-primary/5 p-6 rounded-full mb-6 group-hover:scale-110 transition-transform">
                <FileUp className="w-16 h-16 text-primary" />
              </div>
              <h3 className="text-xl font-black mb-2">اسحب الملف هنا أو اضغط للاختيار</h3>
              <p className="text-muted-foreground font-bold mb-8 text-center max-w-md">
                يدعم ملفات .xlsx, .xls, .csv. تأكد من أن الصف الأول يحتوي على أسماء الأعمدة.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button size="lg" className="h-12 px-8 rounded-xl font-black" onClick={() => fileInputRef.current?.click()}>
                  اختار الملف من جهازك
                </Button>
                <Button size="lg" variant="outline" className="h-12 px-8 rounded-xl font-bold gap-2" onClick={downloadTemplate}>
                  <FileDown className="w-5 h-5" />
                  تحميل القالب النموذجي
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 px-1">
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <p className="text-amber-800 text-sm font-bold">
                  {preSelectedEntityId 
                    ? `سيتم استيراد كافة القوائم إلى حساب: ${selectedEntity?.name}`
                    : 'تأكد من مطابقة الحقول المحددة بـ * لضمان دقة البيانات.'}
                </p>
              </div>

              <div className="border rounded-2xl overflow-hidden bg-background shadow-sm">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="text-right w-1/3">حقل النظام</TableHead>
                      <TableHead className="text-right w-1/3">العمود المقابل في Excel</TableHead>
                      <TableHead className="text-right w-1/3">مثال من ملفك</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {SUPPORTED_COLUMNS.filter(col => !preSelectedEntityId || col.key !== 'entityName').map(col => {
                      const selectedHeader = mappings[col.key];
                      const exampleValue = selectedHeader ? rawData[0]?.[selectedHeader] : '---';
                      
                      return (
                        <TableRow key={col.key} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-bold py-4">
                            <div className="flex flex-col">
                              <span>{col.label} {col.required && <span className="text-red-500 pr-1">*</span>}</span>
                              <span className="text-[10px] text-muted-foreground font-medium">
                                {col.required ? '(أساسي)' : '(اختياري)'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={selectedHeader || 'skip'} 
                              onValueChange={(val) => setMappings(prev => ({ ...prev, [col.key]: val === 'skip' ? undefined : val }))}
                            >
                              <SelectTrigger className={`bg-background h-10 rounded-lg ${!selectedHeader && col.required ? 'border-red-300 ring-offset-red-50' : ''}`}>
                                <SelectValue placeholder="اختر العمود المقابل" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="skip">-- لا يوجد (تجاهل) --</SelectItem>
                                {headers.map(h => (
                                  <SelectItem key={h} value={h}>{h}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-muted-foreground font-mono text-xs">
                             {String(exampleValue || '').length > 30 ? String(exampleValue).substring(0, 30) + '...' : String(exampleValue || '---')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 px-1 h-full flex flex-col">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="عدد الفواتير" value={summary.totalCount} icon={<FileUp className="w-5 h-5" />} />
                <StatCard label="إجمالي القيمة" value={formatIQD(summary.totalAmount)} icon={<DollarSignIcon className="w-5 h-5 text-emerald-500" />} />
                <StatCard label="إجمالي المسدد" value={formatIQD(summary.totalPaid)} icon={<CheckCircle2 className="w-5 h-5 text-blue-500" />} />
                <StatCard label="إجمالي المتبقي" value={formatIQD(summary.totalRemaining)} icon={<XCircle className="w-5 h-5 text-amber-500" />} />
              </div>

              <div className="border rounded-2xl overflow-x-auto shadow-sm flex-1">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="text-right whitespace-nowrap min-w-[120px]">رقم القائمة</TableHead>
                      <TableHead className="text-right whitespace-nowrap min-w-[150px]">المورد</TableHead>
                      <TableHead className="text-right whitespace-nowrap min-w-[130px]">تاريخ القائمة</TableHead>
                      <TableHead className="text-right whitespace-nowrap min-w-[130px]">المبلغ</TableHead>
                      <TableHead className="text-right whitespace-nowrap min-w-[120px]">نوع الشراء</TableHead>
                      <TableHead className="text-right whitespace-nowrap min-w-[130px]">المسدد</TableHead>
                      <TableHead className="text-right whitespace-nowrap min-w-[140px]">الحالة</TableHead>
                      <TableHead className="text-right whitespace-nowrap min-w-[150px]">موعد الاستحقاق</TableHead>
                      <TableHead className="text-right whitespace-nowrap min-w-[120px]">المتبقي</TableHead>
                      <TableHead className="text-right whitespace-nowrap min-w-[100px]">صور</TableHead>
                      <TableHead className="text-right whitespace-nowrap min-w-[200px]">ملاحظات</TableHead>
                      <TableHead className="text-center">حذف</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editableData.map((row) => (
                      <TableRow key={row.id} className={row.isValid ? "" : "bg-red-50"}>
                        <TableCell>
                          <Input 
                            value={row.invoiceNumber} 
                            onChange={(e) => updateRow(row.id, { invoiceNumber: e.target.value })}
                            className="bg-transparent border-none h-8 font-mono text-xs focus:ring-0"
                          />
                        </TableCell>
                        <TableCell>
                          {!preSelectedEntityId ? (
                            <Select 
                              value={row.entityId || 'none'} 
                              onValueChange={(val) => {
                                const ent = entities.find(e => e.id === val);
                                updateRow(row.id, { entityId: val, entityName: ent?.name, isValid: !!ent && !!row.invoiceNumber && row.amount > 0 });
                              }}
                            >
                              <SelectTrigger className="h-8 border-none bg-transparent hover:bg-muted text-xs">
                                <SelectValue placeholder="اختر مورد" />
                              </SelectTrigger>
                              <SelectContent>
                                {entities.map(e => <SelectItem key={e.id} value={e.id!}>{e.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs font-bold px-2">{row.entityName}</span>
                          )}
                        </TableCell>
                        <TableCell>
                           <Input 
                             type="date"
                             value={row.date instanceof Date && !isNaN(row.date.getTime()) ? row.date.toISOString().split('T')[0] : ''}
                             onChange={(e) => {
                               const newDate = e.target.value ? toValidDate(e.target.value) : undefined;
                               updateRow(row.id, { date: newDate });
                             }}
                             className={`bg-transparent border-none h-8 text-xs focus:ring-0 ${!row.date ? 'text-red-500 font-bold' : ''}`}
                           />
                           {!row.date && (
                             <div className="text-[9px] text-red-500 font-bold px-1">صيغة التاريخ غير صحيحة</div>
                           )}
                        </TableCell>
                        <TableCell>
                           <Input 
                             type="number"
                             value={row.amount} 
                             onChange={(e) => updateRow(row.id, { amount: Number(e.target.value) })}
                             className="bg-transparent border-none h-8 font-black text-xs focus:ring-0"
                           />
                        </TableCell>
                        <TableCell>
                           <Select value={row.purchaseType} onValueChange={(val) => updateRow(row.id, { purchaseType: val })}>
                             <SelectTrigger className="h-8 border-none bg-transparent hover:bg-muted text-xs">
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="cash">نقدي</SelectItem>
                               <SelectItem value="credit">آجل</SelectItem>
                             </SelectContent>
                           </Select>
                        </TableCell>
                        <TableCell>
                           <Input 
                             type="number"
                             value={row.paidAmount} 
                             onChange={(e) => updateRow(row.id, { paidAmount: Number(e.target.value), paymentStatus: 'partially_paid' })}
                             className="bg-transparent border-none h-8 font-bold text-xs focus:ring-0 text-emerald-600"
                           />
                        </TableCell>
                        <TableCell>
                           <Select value={row.paymentStatus} onValueChange={(val) => updateRow(row.id, { paymentStatus: val })}>
                             <SelectTrigger className="h-8 border-none bg-transparent hover:bg-muted text-xs">
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="paid">مسددة بالكامل</SelectItem>
                               <SelectItem value="partially_paid">مسددة جزئياً</SelectItem>
                               <SelectItem value="pending">غير مسددة</SelectItem>
                             </SelectContent>
                           </Select>
                        </TableCell>
                        <TableCell>
                           <Input 
                             type="date"
                             value={row.dueDate instanceof Date && !isNaN(row.dueDate.getTime()) ? row.dueDate.toISOString().split('T')[0] : ''}
                             onChange={(e) => {
                               const newDate = e.target.value ? toValidDate(e.target.value) : undefined;
                               updateRow(row.id, { dueDate: newDate });
                             }}
                             className="bg-transparent border-none h-8 text-xs focus:ring-0"
                           />
                        </TableCell>
                        <TableCell>
                           <span className={`text-xs font-black ${row.remainingAmount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {formatIQD(row.remainingAmount)}
                           </span>
                        </TableCell>
                        <TableCell>
                           <div className="flex items-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 p-0"
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'image/*';
                                  input.multiple = true;
                                  input.onchange = async (e) => {
                                    const files = (e.target as HTMLInputElement).files;
                                    if (files) {
                                      const base64s = [];
                                      for (let i = 0; i < files.length; i++) {
                                        const reader = new FileReader();
                                        const b64 = await new Promise<string>((resolve) => {
                                          reader.onload = () => resolve(reader.result as string);
                                          reader.readAsDataURL(files[i]);
                                        });
                                        base64s.push(b64);
                                      }
                                      updateRow(row.id, { images: [...(row.images || []), ...base64s] });
                                    }
                                  };
                                  input.click();
                                }}
                              >
                                <Camera className="h-3.5 w-3.5" />
                              </Button>
                              <span className="text-[10px] font-bold">{row.images?.length || 0}</span>
                           </div>
                        </TableCell>
                        <TableCell>
                           <Input 
                             value={row.notes} 
                             onChange={(e) => updateRow(row.id, { notes: e.target.value })}
                             className="bg-transparent border-none h-8 text-xs focus:ring-0"
                             placeholder="أضف ملاحظة..."
                           />
                        </TableCell>
                        <TableCell className="text-center">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setEditableData(prev => prev.filter(p => p.id !== row.id))}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <DialogFooter className="gap-2 pt-4 border-t mt-auto">
                <Button type="button" size="lg" onClick={handleImport} disabled={isLoading || summary.validCount === 0} className="h-14 px-12 rounded-xl font-black text-lg shadow-xl shadow-primary/20">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <CheckCircle2 className="w-5 h-5 ml-2" />}
                  اعتماد القوائم المستوردة ({summary.validCount})
                </Button>
                <Button type="button" size="lg" variant="outline" onClick={() => setStep(2)} disabled={isLoading} className="h-14 px-8 rounded-xl font-bold">
                  تعديل مطابقة الأعمدة
                </Button>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
function StatCard({ label, value, icon, color = "" }: { label: string, value: string | number, icon: React.ReactNode, color?: string }) {
  return (
    <div className="bg-background p-5 rounded-2xl border-2 border-muted/30 shadow-sm flex flex-col gap-2 hover:border-primary/20 transition-colors">
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-black uppercase tracking-wider">
        <div className="bg-muted p-2 rounded-lg">{icon}</div>
        <span>{label}</span>
      </div>
      <div className={`text-xl font-black ${color} font-mono tracking-tight`}>{value}</div>
    </div>
)
}

function DollarSignIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
