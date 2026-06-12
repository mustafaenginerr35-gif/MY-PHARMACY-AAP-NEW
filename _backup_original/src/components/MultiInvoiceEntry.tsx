import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Plus, 
  Trash2, 
  Save, 
  FileUp, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  Table as TableIcon,
  Image as ImageIcon,
  Paperclip,
  Upload,
  X,
  Clock,
  CalendarDays
} from 'lucide-react';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';
import { Entity, LedgerEntry, Transaction } from '../db';
import { firebaseService } from '../services/firebaseService';
import { formatNumberWithCommas, parseFormattedNumber, toValidDate, safeFormatDate } from '../lib/formatters';

interface MultiInvoiceRow {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  entityName: string;
  totalAmount: string;
  discount: string;
  paidAmount: string;
  bonus: string;
  notes: string;
  isValid: boolean;
  error?: string;
  entityId?: string;
  imageFiles?: File[];
  uploadProgress?: number;
  saveStatus?: 'idle' | 'saving' | 'success' | 'error';
  saveError?: string;
}

interface MultiInvoiceEntryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entities: Entity[];
  currentBranchId?: string;
  appUser?: any;
  onSuccess?: () => void;
  onImportExcel?: () => void;
  preselectedEntityId?: string;
}

export function MultiInvoiceEntry({ 
  open, 
  onOpenChange, 
  entities, 
  currentBranchId, 
  appUser,
  onSuccess,
  onImportExcel,
  preselectedEntityId
}: MultiInvoiceEntryProps) {
  const [rows, setRows] = useState<MultiInvoiceRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);

  const selectedEntity = useMemo(() => 
    preselectedEntityId ? entities.find(e => e.id === preselectedEntityId) : null
  , [preselectedEntityId, entities]);

  // Initialize rows correctly
  useEffect(() => {
    if (open && rows.length === 0) {
      setRows([createEmptyRow()]);
    }
  }, [open]);

  // Update existing rows if preselected entity changes
  useEffect(() => {
    if (open && preselectedEntityId && selectedEntity) {
      setRows(prev => prev.map(row => ({
        ...row,
        entityId: selectedEntity.id,
        entityName: selectedEntity.name,
        isValid: !!row.invoiceNumber && !!row.invoiceDate && !!selectedEntity.id && parseFormattedNumber(row.totalAmount) > 0
      })));
    }
  }, [preselectedEntityId, selectedEntity, open]);

  // Reset states when dialog opens
  useEffect(() => {
    if (open) {
      setIsSaving(false);
      setRows(prev => {
        const updated = prev.map(r => ({
          ...r,
          saveStatus: r.saveStatus === 'success' ? 'success' : 'idle',
          uploadProgress: r.saveStatus === 'success' ? 100 : 0
        }));
        if (updated.length === 0) return [createEmptyRow()];
        return updated;
      });
    }
  }, [open]);

  function createEmptyRow(): MultiInvoiceRow {
    const today = new Date();
    
    // Use preselected entity if available
    let initialEntityName = '';
    let initialEntityId = '';
    if (preselectedEntityId) {
      const entity = entities.find(e => e.id === preselectedEntityId);
      if (entity) {
        initialEntityName = entity.name;
        initialEntityId = entity.id || '';
      }
    }

    return {
      id: Math.random().toString(36).substr(2, 9),
      invoiceNumber: '',
      invoiceDate: safeFormatDate(today, 'yyyy-MM-dd'),
      dueDate: '', // Default empty (optional)
      entityName: initialEntityName,
      entityId: initialEntityId,
      totalAmount: '',
      discount: '0',
      paidAmount: '0',
      bonus: '',
      notes: '',
      isValid: !!initialEntityId,
      imageFiles: [],
      saveStatus: 'idle'
    };
  }

  const addRow = () => {
    setRows(prev => [...prev, createEmptyRow()]);
  };

  const removeRow = (id: string) => {
    if (rows.length === 1) {
      setRows([createEmptyRow()]);
      return;
    }
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const updateRow = (id: string, field: keyof MultiInvoiceRow, value: string) => {
    setRows(prev => prev.map(row => {
      if (row.id !== id) return row;
      const updatedRow = { ...row, [field]: value };
      
      // Auto-validate and link entity
      if (preselectedEntityId && selectedEntity) {
        updatedRow.entityId = selectedEntity.id;
        updatedRow.entityName = selectedEntity.name;
      } else {
        const entity = entities.find(e => e.name.trim() === updatedRow.entityName.trim());
        updatedRow.entityId = entity?.id;
      }
      
      const total = parseFormattedNumber(updatedRow.totalAmount);
      const discount = parseFormattedNumber(updatedRow.discount);
      const paid = parseFormattedNumber(updatedRow.paidAmount);
      
      updatedRow.isValid = !!updatedRow.invoiceNumber && 
                           !!updatedRow.invoiceDate && 
                           !!updatedRow.entityId && 
                           total > 0 && 
                           !isNaN(new Date(updatedRow.invoiceDate).getTime());
      
      return updatedRow;
    }));
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData.includes('\t') && !pasteData.includes('\n')) return;

    e.preventDefault();
    const spreadsheetRows = pasteData.split(/\r?\n/).filter(line => line.trim() !== '');
    
    const newRows: MultiInvoiceRow[] = spreadsheetRows.map(line => {
      const parts = line.split('\t');
      const row = createEmptyRow();
      
      // Order usually matches: Invoice#, InvoiceDate, DueDate, Entity, Amount, Discount, Paid, Bonus, Notes
      if (parts[0]) row.invoiceNumber = parts[0].trim();
      if (parts[1]) row.invoiceDate = safeFormatDate(toValidDate(parts[1]), 'yyyy-MM-dd');
      if (parts[2]) row.dueDate = safeFormatDate(toValidDate(parts[2]), 'yyyy-MM-dd');
      if (parts[3]) row.entityName = parts[3].trim();
      if (parts[4]) row.totalAmount = parts[4].trim();
      if (parts[5]) row.discount = parts[5].trim();
      if (parts[6]) row.paidAmount = parts[6].trim();
      if (parts[7]) row.bonus = parts[7].trim();
      if (parts[8]) row.notes = parts[8].trim();

      // Recalculate validity
      if (preselectedEntityId && selectedEntity) {
        row.entityId = selectedEntity.id;
        row.entityName = selectedEntity.name;
      } else {
        const entity = entities.find(e => e.name.trim() === row.entityName);
        row.entityId = entity?.id;
      }
      const total = parseFormattedNumber(row.totalAmount);
      row.isValid = !!row.invoiceNumber && !!row.invoiceDate && !!row.entityId && total > 0;
      
      return row;
    });

    // If only one row and it's empty, replace it
    if (rows.length === 1 && !rows[0].invoiceNumber && !rows[0].entityName) {
      setRows(newRows);
    } else {
      setRows(prev => [...prev, ...newRows]);
    }
    toast.success(`تم استيراد ${newRows.length} حقل من حافظة النسخ`);
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowId: string, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentElement = e.target as HTMLElement;
      const inputs = Array.from(tableRef.current?.querySelectorAll('input') || []);
      const currentIndex = inputs.indexOf(currentElement as HTMLInputElement);
      
      if (currentIndex < inputs.length - 1) {
        (inputs[currentIndex + 1] as HTMLElement).focus();
      } else {
        addRow();
        // Focus the first input of the new row in the next render
        setTimeout(() => {
          const freshInputs = Array.from(tableRef.current?.querySelectorAll('input') || []);
          (freshInputs[currentIndex + 1] as HTMLElement)?.focus();
        }, 10);
      }
    }
  };

  const totals = useMemo(() => {
    return rows.reduce((acc, row) => {
      const total = parseFormattedNumber(row.totalAmount);
      const discount = parseFormattedNumber(row.discount);
      const paid = parseFormattedNumber(row.paidAmount);
      const net = total - discount;
      return {
        count: acc.count + (row.isValid ? 1 : 0),
        total: acc.total + total,
        net: acc.net + net,
        paid: acc.paid + paid,
        remaining: acc.remaining + (net - paid)
      };
    }, { count: 0, total: 0, net: 0, paid: 0, remaining: 0 });
  }, [rows]);

  const handleSaveAll = async () => {
    console.trace("INVOICE SAVE ALL CALLED");
    const validRows = rows.filter(r => r.isValid && r.saveStatus !== 'success');
    if (validRows.length === 0) {
      toast.error('يرجى التأكد من صحة البيانات أو أن القوائم لم يتم حفظها مسبقاً');
      return;
    }

    console.log("Save all started. Total valid rows:", validRows.length);
    setIsSaving(true);
    const branchId = currentBranchId || 'main';
    const userId = appUser?.userId || 'system';

    // Compression options
    const compressionOptions = {
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1920,
      useWebWorker: true
    };

    const savePromises = validRows.map(async (row) => {
      let docId: string | null = null;
      try {
        setRows(prev => prev.map(r => r.id === row.id ? { ...r, saveStatus: 'saving', uploadProgress: 0 } : r));

        const entity = entities.find(e => e.id === row.entityId)!;
        const total = parseFormattedNumber(row.totalAmount);
        const discount = parseFormattedNumber(row.discount);
        const paid = parseFormattedNumber(row.paidAmount);
        const net = total - discount;
        const remaining = net - paid;

        // Determine if dueDate is valid
        const validDueDate = row.dueDate && !isNaN(new Date(row.dueDate).getTime()) ? new Date(row.dueDate) : null;

        // 1. Prepare Ledger Entry (initially without imageUrls)
        const newEntry: Omit<LedgerEntry, 'id'> = {
          accountId: entity.id!,
          accountName: entity.name,
          accountType: entity.type,
          date: new Date(row.invoiceDate),
          invoiceDate: new Date(row.invoiceDate),
          dueDate: validDueDate,
          operationType: 'invoice',
          purchaseType: 'credit',
          invoiceNumber: row.invoiceNumber,
          amount: total,
          discount: discount,
          discountType: 'fixed',
          bonus: row.bonus,
          netAmount: net,
          paidAmount: paid,
          remainingAmount: remaining,
          paymentStatus: remaining === 0 ? 'paid' : (paid > 0 ? 'partially_paid' : 'pending'),
          ownerId: userId,
          branchId: branchId as any,
          imageUrls: [], // Empty initially
          notes: row.notes,
          source: 'multi_entry',
          isCommitted: true,
          createdAt: new Date(),
          updatedAt: new Date()
        } as any;

        console.log(`[SaveAll] Saving invoice data: ${row.invoiceNumber}`);

        // 2. Save via unified saveInvoice (handles deduplication)
        const result = await firebaseService.saveInvoice(newEntry);
        docId = result?.id || null;
        const isUpdate = result?.isUpdate;
        const blocked = (result as any)?.blocked;

        if (blocked) {
           setRows(prev => prev.map(r => r.id === row.id ? { ...r, saveStatus: 'success' } : r));
           return { id: row.id, status: 'success', blocked: true };
        }
        
        if (docId) {
          // 3. Add transaction/sync (saveInvoice might only handle ledgerEntry, let's keep syncTransaction)
          await firebaseService.syncTransaction({
            type: 'invoice',
            category: 'invoice',
            amount: net,
            date: new Date(row.invoiceDate),
            invoiceDate: new Date(row.invoiceDate),
            dueDate: validDueDate,
            description: `إدخال متعدد: ${entity.name} - ${row.invoiceNumber}`,
            entityId: entity.id!,
            entityName: entity.name,
            invoiceNumber: row.invoiceNumber,
            branchId: branchId as any,
            ownerId: userId,
            createdBy: userId,
            source: 'multi_entry',
            sourceId: docId,
            createdAt: new Date(),
            updatedAt: new Date()
          } as Transaction);

          // 4. Update entity balance (Only if not updating existing invoice)
          if (!isUpdate) {
            await firebaseService.updateDocument('entities', entity.id!, {
              balance: (entity.balance || 0) + remaining,
              totalInvoices: (entity.totalInvoices || 0) + 1,
              updatedAt: new Date()
            });
          }

          // 4.1 Add deadline if due date is set and there's a remaining amount
          if (validDueDate && remaining > 0 && !isUpdate) {
            await firebaseService.addDocument('deadlines', {
              accountId: entity.id!,
              accountName: entity.name,
              invoiceId: docId as string,
              invoiceNumber: row.invoiceNumber,
              amount: total,
              requiredPayment: remaining,
              dueDate: validDueDate,
              status: 'pending',
              ownerId: userId,
              branchId: branchId as any,
              createdAt: new Date(),
              updatedAt: new Date()
            } as any);
          }

          // Mark as success in UI (the invoice is saved!)
          setRows(prev => prev.map(r => r.id === row.id ? { ...r, saveStatus: 'success' } : r));
          console.log(`[SaveAll] Invoice ${row.invoiceNumber} saved successfully with ID: ${docId}`);

          // 5. Handle Image Uploads Background (non-blocking for the loop)
          if (row.imageFiles && row.imageFiles.length > 0) {
            console.log(`[SaveAll] Processing ${row.imageFiles.length} images for saved invoice ID: ${docId}`);
            
            const uploadedUrls: string[] = [];
            let someFailed = false;

            for (let i = 0; i < row.imageFiles.length; i++) {
              let file = row.imageFiles[i];
              
              if (file.type.startsWith('image/')) {
                try {
                  file = await imageCompression(file, compressionOptions);
                } catch (ce) { console.error('Compression failed', ce); }
              }

              try {
                // Modified path: invoices/{branchId}/{invoiceId}/{timestamp}_{index}.jpg
                const storagePath = `invoices/${branchId}/${docId}`;
                const uploadTask = firebaseService.uploadFileWithProgress(storagePath, file, (percent) => {
                  const overallPercent = ((i * 100) + percent) / row.imageFiles!.length;
                  setRows(prev => prev.map(r => r.id === row.id ? { ...r, uploadProgress: overallPercent } : r));
                });

                const timeoutPromise = new Promise<never>((_, reject) => 
                  setTimeout(() => reject(new Error('TIMEOUT')), 20000)
                );

                const url = await Promise.race([uploadTask, timeoutPromise]) as string;
                uploadedUrls.push(url);
              } catch (ue: any) {
                someFailed = true;
                console.error(`[SaveAll] Image ${i} failed for ${row.invoiceNumber}:`, ue);
              }
            }

            if (uploadedUrls.length > 0) {
              console.log(`[SaveAll] Updating invoice ${docId} with ${uploadedUrls.length} image URLs`);
              await firebaseService.updateDocument('ledgerEntries', docId, {
                imageUrls: uploadedUrls,
                notes: row.notes + (someFailed ? " [فشل رفع بعض المرفقات]" : "")
              });
              setRows(prev => prev.map(r => r.id === row.id ? { ...r, uploadProgress: 100 } : r));
              
              if (someFailed) {
                toast.warning(`تم حفظ القائمة رقم ${row.invoiceNumber} مع فشل رفع بعض المرفقات`);
              }
            } else if (someFailed) {
                toast.error(`تم حفظ القائمة رقم ${row.invoiceNumber} ولكن فشل رفع المرفقات`);
            }
          } else {
            setRows(prev => prev.map(r => r.id === row.id ? { ...r, uploadProgress: 100 } : r));
          }

          return { id: row.id, status: 'success' };
        } else {
          throw new Error('Failed to add document');
        }
      } catch (error: any) {
        console.error(`Row save failed for ${row.invoiceNumber}:`, error);
        setRows(prev => prev.map(r => r.id === row.id ? { ...r, saveStatus: 'error', saveError: String(error) } : r));
        return { id: row.id, status: 'error', error };
      }
    });

    try {
      const results = await Promise.allSettled(savePromises);
      const successCount = results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 'success').length;
      
      console.log(`Save all finished. Success: ${successCount} / ${validRows.length}`);

      if (successCount > 0) {
        toast.success(`تم حفظ ${successCount} فاتورة بنجاح`);
        setTimeout(() => {
          onSuccess?.();
          const hasErrors = results.some(r => r.status === 'rejected' || (r.status === 'fulfilled' && (r.value as any).status === 'error'));
          if (!hasErrors) {
            onOpenChange(false);
            setRows([createEmptyRow()]);
          }
        }, 1500);
      } else {
        toast.error('لم يتم حفظ أي فاتورة، يرجى التحقق من الأخطاء');
      }
    } catch (criticalError) {
      console.error("Critical error in save all:", criticalError);
      toast.error("حدث خطأ غير متوقع أثناء الحفظ");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-[95vw] lg:max-w-7xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 border-b bg-card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-2xl font-black text-primary flex items-center gap-2">
                <TableIcon className="h-6 w-6" />
                {preselectedEntityId && selectedEntity 
                  ? `إدخال قوائم للمورد: ${selectedEntity.name}` 
                  : 'إدخال متعدد للقوائم'}
              </DialogTitle>
              <DialogDescription className="font-bold">
                أدخل البيانات يدوياً، انتقل بـ Enter، أو الصق مباشرة من Excel
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onImportExcel} className="font-bold gap-2">
                <FileUp className="h-4 w-4" />
                استيراد ملف Excel
              </Button>
              <Button type="button" disabled={isSaving} onClick={handleSaveAll} className="font-black px-8 gap-2 shadow-lg shadow-primary/20">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                حفظ الكل ({totals.count})
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-4 bg-muted/20" onPaste={handlePaste}>
          <div className="bg-background rounded-2xl border shadow-xl overflow-hidden min-w-[1200px]">
            <Table ref={tableRef}>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-right font-black w-10 text-center">الحالة</TableHead>
                  <TableHead className="text-right font-black w-32">رقم القائمة</TableHead>
                  <TableHead className="text-right font-black w-32">تاريخ الفاتورة</TableHead>
                  <TableHead className="text-right font-black w-32">تاريخ الاستحقاق (اختياري)</TableHead>
                  {!preselectedEntityId && <TableHead className="text-right font-black w-60">المورد / الجهة</TableHead>}
                  <TableHead className="text-right font-black w-32">المبلغ الكلي</TableHead>
                  <TableHead className="text-right font-black w-24">الخصم</TableHead>
                  <TableHead className="text-right font-black w-32">المسدد</TableHead>
                  <TableHead className="text-right font-black w-32 bg-primary/5">المتبقي</TableHead>
                  <TableHead className="text-right font-black w-20">الصور</TableHead>
                  <TableHead className="text-right font-black w-24">البونص</TableHead>
                  <TableHead className="text-right font-black">ملاحظات</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => {
                  const total = parseFormattedNumber(row.totalAmount);
                  const discount = parseFormattedNumber(row.discount);
                  const paid = parseFormattedNumber(row.paidAmount);
                  const remaining = Math.max(0, total - discount - paid);
                  
                   return (
                    <TableRow key={row.id} className={`${row.saveStatus === 'success' ? 'bg-emerald-50/30' : !row.isValid && row.invoiceNumber ? 'bg-red-50/50' : ''} transition-colors group`}>
                      <TableCell className="p-2 text-center">
                        {row.saveStatus === 'saving' ? (
                          <div className="flex flex-col items-center gap-1">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <span className="text-[8px] font-black text-primary">جاري...</span>
                          </div>
                        ) : row.saveStatus === 'success' ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" />
                        ) : row.saveStatus === 'error' ? (
                          <AlertCircle className="h-5 w-5 text-rose-500 mx-auto" title={row.saveError} />
                        ) : (
                          <div className="w-5 h-5 border-2 border-dashed border-muted rounded-full mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="p-2 text-right">
                        <Input 
                          value={row.invoiceNumber}
                          disabled={row.saveStatus === 'success' || row.saveStatus === 'saving'}
                          onChange={e => updateRow(row.id, 'invoiceNumber', e.target.value)}
                          onKeyDown={e => handleKeyDown(e, row.id, 'invoiceNumber')}
                          className="border-none bg-transparent h-9 text-xs font-mono font-bold focus:ring-1 focus:ring-primary/20"
                          placeholder="رقم القائمة"
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <div className="relative">
                          <CalendarDays className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-50" />
                          <Input 
                            type="date"
                            value={row.invoiceDate}
                            disabled={row.saveStatus === 'success' || row.saveStatus === 'saving'}
                            onChange={e => updateRow(row.id, 'invoiceDate', e.target.value)}
                            onKeyDown={e => handleKeyDown(e, row.id, 'invoiceDate')}
                            className="border-none bg-transparent h-9 pr-7 text-[10px] font-bold focus:ring-1 focus:ring-primary/20"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="p-2">
                         <div className="relative">
                          <Clock className={`absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${row.dueDate ? 'text-rose-400' : 'text-muted-foreground'} opacity-50`} />
                          <Input 
                            type="date"
                            value={row.dueDate}
                            disabled={row.saveStatus === 'success' || row.saveStatus === 'saving'}
                            onChange={e => updateRow(row.id, 'dueDate', e.target.value)}
                            onKeyDown={e => handleKeyDown(e, row.id, 'dueDate')}
                            className={`border-none bg-transparent h-9 pr-7 text-[10px] font-bold ${row.dueDate ? 'text-rose-600' : 'text-muted-foreground'} focus:ring-1 focus:ring-primary/20`}
                            placeholder="اختر تاريخ الاستحقاق"
                          />
                        </div>
                      </TableCell>
                      {!preselectedEntityId && (
                        <TableCell className="p-2">
                          <div className="relative">
                            <Input 
                              value={row.entityName}
                              disabled={row.saveStatus === 'success' || row.saveStatus === 'saving'}
                              onChange={e => updateRow(row.id, 'entityName', e.target.value)}
                              onKeyDown={e => handleKeyDown(e, row.id, 'entityName')}
                              className={`border-none bg-transparent h-9 text-xs font-black focus:ring-1 focus:ring-primary/20 ${!row.entityId && row.entityName ? 'text-red-500' : ''}`}
                              placeholder="اسم المورد"
                            />
                            {!row.entityId && row.entityName && (
                              <AlertCircle className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="p-2">
                        <Input 
                          value={row.totalAmount ? formatNumberWithCommas(parseFormattedNumber(row.totalAmount)) : ''}
                          disabled={row.saveStatus === 'success' || row.saveStatus === 'saving'}
                          onChange={e => updateRow(row.id, 'totalAmount', e.target.value)}
                          onKeyDown={e => handleKeyDown(e, row.id, 'totalAmount')}
                          className="border-none bg-transparent h-9 text-xs font-black text-left font-mono focus:ring-1 focus:ring-primary/20"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input 
                          value={row.discount ? formatNumberWithCommas(parseFormattedNumber(row.discount)) : ''}
                          disabled={row.saveStatus === 'success' || row.saveStatus === 'saving'}
                          onChange={e => updateRow(row.id, 'discount', e.target.value)}
                          onKeyDown={e => handleKeyDown(e, row.id, 'discount')}
                          className="border-none bg-transparent h-9 text-xs font-bold text-red-600 text-left font-mono focus:ring-1 focus:ring-primary/20"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input 
                          value={row.paidAmount ? formatNumberWithCommas(parseFormattedNumber(row.paidAmount)) : ''}
                          disabled={row.saveStatus === 'success' || row.saveStatus === 'saving'}
                          onChange={e => updateRow(row.id, 'paidAmount', e.target.value)}
                          onKeyDown={e => handleKeyDown(e, row.id, 'paidAmount')}
                          className="border-none bg-transparent h-9 text-xs font-black text-emerald-600 text-left font-mono focus:ring-1 focus:ring-primary/20"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="p-2 bg-primary/5">
                        <div className="h-9 flex items-center justify-end px-3 text-xs font-black text-amber-700 font-mono">
                          {formatNumberWithCommas(remaining)}
                        </div>
                      </TableCell>
                      <TableCell className="p-2">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <div className="relative group/img">
                            <input 
                              type="file" 
                              multiple 
                              id={`file-upload-${row.id}`} 
                              className="hidden" 
                              accept="image/*,application/pdf"
                              onChange={e => {
                                const files = Array.from(e.target.files || []);
                                if (files.length > 0) {
                                  setRows(prev => prev.map(r => r.id === row.id ? { ...r, imageFiles: [...(r.imageFiles || []), ...files] } : r));
                                }
                              }}
                            />
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg relative"
                              onClick={() => document.getElementById(`file-upload-${row.id}`)?.click()}
                              title="إرفاق صور أو PDF"
                            >
                              <Paperclip className="h-4 w-4" />
                              {(row.imageFiles?.length || 0) > 0 && (
                                <span className="absolute -top-1 -right-1 bg-primary text-white text-[9px] h-4 w-4 rounded-full flex items-center justify-center font-black">
                                  {row.imageFiles?.length}
                                </span>
                              )}
                            </Button>
                            
                            {(row.imageFiles?.length || 0) > 0 && (
                              <button 
                                onClick={() => setRows(prev => prev.map(r => r.id === row.id ? { ...r, imageFiles: [] } : r))}
                                className="absolute -bottom-1 -left-1 bg-rose-500 text-white rounded-full p-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity"
                                title="مسح المرفقات"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            )}
                          </div>
                          {row.uploadProgress !== undefined && row.uploadProgress > 0 && row.uploadProgress < 100 && (
                             <div className="w-full max-w-[40px] h-1 bg-muted rounded-full overflow-hidden">
                               <div className="bg-primary h-full transition-all duration-300" style={{ width: `${row.uploadProgress}%` }} />
                             </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="p-2">
                        <Input 
                          value={row.bonus}
                          disabled={row.saveStatus === 'success' || row.saveStatus === 'saving'}
                          onChange={e => updateRow(row.id, 'bonus', e.target.value)}
                          onKeyDown={e => handleKeyDown(e, row.id, 'bonus')}
                          className="border-none bg-transparent h-9 text-[10px] font-bold focus:ring-1 focus:ring-primary/20"
                          placeholder="بونص"
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input 
                          value={row.notes}
                          disabled={row.saveStatus === 'success' || row.saveStatus === 'saving'}
                          onChange={e => updateRow(row.id, 'notes', e.target.value)}
                          onKeyDown={e => handleKeyDown(e, row.id, 'notes')}
                          className="border-none bg-transparent h-9 text-[10px] focus:ring-1 focus:ring-primary/20"
                          placeholder="ملاحظات..."
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          disabled={row.saveStatus === 'success' || row.saveStatus === 'saving'}
                          onClick={() => removeRow(row.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="p-4 bg-muted/30 border-t flex justify-between items-center">
              <Button variant="ghost" onClick={addRow} className="gap-2 font-black text-primary">
                <Plus className="h-4 w-4" />
                إضافة سطر جديد
              </Button>
              <div className="flex gap-8">
                <div className="flex flex-col items-end">
                   <span className="text-[10px] text-muted-foreground font-bold uppercase">إجمالي المبالغ</span>
                   <span className="text-lg font-black font-mono">{formatNumberWithCommas(totals.total)}</span>
                </div>
                <div className="flex flex-col items-end">
                   <span className="text-[10px] text-muted-foreground font-bold uppercase">إجمالي المسدد</span>
                   <span className="text-lg font-black font-mono text-emerald-600">{formatNumberWithCommas(totals.paid)}</span>
                </div>
                <div className="flex flex-col items-end">
                   <span className="text-[10px] text-muted-foreground font-bold uppercase">إجمالي المتبقي</span>
                   <span className="text-lg font-black font-mono text-amber-600">{formatNumberWithCommas(totals.remaining)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-3">
             <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
             <div className="text-xs font-bold text-primary/80 leading-relaxed">
               نصائح للسرعة:
               <ul className="list-disc pr-4 mt-1 space-y-1">
                 <li>استخدم زر Enter للانتقال السريع بين الحقول (سينتقل لسطر جديد تلقائياً).</li>
                 <li>يمكنك نسخ جدول من Excel (أو Google Sheets) ولصقه مباشرة في هذه النافذة (Ctrl+V).</li>
                 <li>سيتم مطابقة اسم المورد تلقائياً، تأكد من صحة الاسم المدخل.</li>
               </ul>
             </div>
          </div>
        </div>

        <DialogFooter className="p-6 border-t bg-card">
           <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="font-bold">إلغاء</Button>
           <Button type="button" disabled={isSaving} onClick={handleSaveAll} className="font-black px-12 h-12 text-lg shadow-xl shadow-primary/20">
             اعتمد وحفظ القوائم ({totals.count})
           </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
