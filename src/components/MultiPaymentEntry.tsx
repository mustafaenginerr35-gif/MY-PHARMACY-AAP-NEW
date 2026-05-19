import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  X, 
  Search,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  Loader2,
  FileSpreadsheet,
  Receipt
} from 'lucide-react';
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
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Entity, LedgerEntry } from '../db';
import { firebaseService } from '../services/firebaseService';
import { formatNumberWithCommas, parseFormattedNumber, safeFormatDate, getSupplierTypeLabel } from '../lib/formatters';

interface MultiPaymentRow {
  id: string;
  date: string;
  entityId: string;
  entityName: string;
  amount: string;
  notes: string;
  vouchedNumber: string;
  imageFiles?: File[];
  uploadProgress?: number;
  isValid: boolean;
}

interface MultiPaymentEntryProps {
  entities: Entity[];
  onClose: () => void;
  onRefresh: () => void;
  userId: string;
  branchId?: string | null;
}

export function MultiPaymentEntry({ 
  entities, 
  onClose, 
  onRefresh, 
  userId,
  branchId 
}: MultiPaymentEntryProps) {
  const [rows, setRows] = useState<MultiPaymentRow[]>([createEmptyRow()]);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  function createEmptyRow(): MultiPaymentRow {
    return {
      id: Math.random().toString(36).substr(2, 9),
      date: safeFormatDate(new Date(), 'yyyy-MM-dd'),
      entityId: '',
      entityName: '',
      amount: '',
      notes: '',
      vouchedNumber: '',
      imageFiles: [],
      isValid: false
    };
  }

  const addRow = () => {
    setRows([...rows, createEmptyRow()]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter(row => row.id !== id));
    } else {
      setRows([createEmptyRow()]);
    }
  };

  const updateRow = (id: string, field: keyof MultiPaymentRow, value: any) => {
    setRows(prev => prev.map(row => {
      if (row.id === id) {
        const updatedRow = { ...row, [field]: value };
        
        // Auto-validate
        const hasEntity = !!updatedRow.entityId;
        const hasAmount = parseFormattedNumber(updatedRow.amount) > 0;
        updatedRow.isValid = hasEntity && hasAmount;
        
        return updatedRow;
      }
      return row;
    }));
  };

  const handleSaveAll = async () => {
    const validRows = rows.filter(r => r.isValid);
    if (validRows.length === 0) {
      toast.error('يرجى ملأ بيانات صحيحة لعملية واحدة على الأقل');
      return;
    }

    setIsSaving(true);
    try {
      for (const row of validRows) {
        const entity = entities.find(e => e.id === row.entityId)!;
        const amount = parseFormattedNumber(row.amount);

        // Upload images first
        let uploadedUrls: string[] = [];
        if (row.imageFiles && row.imageFiles.length > 0) {
          for (let i = 0; i < row.imageFiles.length; i++) {
            const file = row.imageFiles[i];
            const url = await firebaseService.uploadFileWithProgress('payments', file, (percent) => {
               const overall = ((i * 100) + percent) / row.imageFiles!.length;
               setRows(prev => prev.map(r => r.id === row.id ? { ...r, uploadProgress: overall } : r));
            });
            uploadedUrls.push(url);
          }
           setRows(prev => prev.map(r => r.id === row.id ? { ...r, uploadProgress: 100 } : r));
        }

        const newEntry: Omit<LedgerEntry, 'id'> = {
          accountId: entity.id!,
          accountName: entity.name,
          accountType: entity.type,
          date: new Date(row.date),
          operationType: 'payment',
          invoiceNumber: row.vouchedNumber || '',
          amount: amount,
          paidAmount: amount,
          remainingAmount: 0,
          paymentStatus: 'paid',
          balanceAfterOperation: (entity.balance || 0) - amount,
          ownerId: userId,
          branchId: branchId as any,
          notes: row.notes,
          imageUrls: uploadedUrls,
          source: 'multi_payment_entry',
          createdAt: new Date(),
          updatedAt: new Date()
        } as any;

        await firebaseService.addDocument('ledgerEntries', newEntry);

        // Update entity balance
        await firebaseService.updateDocument('entities', entity.id!, {
          balance: (entity.balance || 0) - amount,
          totalPayments: (entity.totalPayments || 0) + amount
        });

        // Add activity
        await firebaseService.addDocument('entityActivities', {
          entityId: entity.id!,
          type: 'payment',
          action: 'تسديد دفعة مالية (إدخال متعدد)',
          details: `المبلغ: ${formatNumberWithCommas(amount)}`,
          performedBy: 'user',
          createdAt: new Date(),
          ownerId: userId,
          branchId: branchId || undefined
        });
      }

      toast.success(`تم حفظ ${validRows.length} تسديدات بنجاح`);
      onRefresh();
      onClose();
    } catch (err) {
      console.error('Error saving multi payments:', err);
      toast.error('حدث خطأ أثناء حفظ البيانات');
    } finally {
      setIsSaving(false);
    }
  };

  const totalAmount = rows.reduce((acc, row) => acc + parseFormattedNumber(row.amount), 0);

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl border-primary/10 overflow-hidden rounded-3xl">
        <CardHeader className="bg-primary px-8 py-6 text-white shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <Receipt className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black">الإدخال المتعدد للتسديدات</CardTitle>
                <CardDescription className="text-white/70 font-bold">تسجيل مجموعة من سندات القبض والدفع دفعة واحدة</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10 rounded-full h-12 w-12">
              <X className="h-6 w-6" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-8 overflow-y-auto flex-grow flex flex-col gap-6" dir="rtl">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-muted/30 p-6 rounded-2xl border border-border/50">
             <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div>
                  <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">إجمالي المبلغ</div>
                  <div className="text-2xl font-black text-primary font-mono">{formatNumberWithCommas(totalAmount)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">عدد السندات</div>
                  <div className="text-2xl font-black text-foreground font-mono">{rows.length}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">العمليات الصحيحة</div>
                  <div className="text-2xl font-black text-emerald-500 font-mono">{rows.filter(r => r.isValid).length}</div>
                </div>
             </div>
             
             <div className="flex gap-3">
               <Button variant="outline" onClick={addRow} className="gap-2 border-primary/20 text-primary font-black h-11 px-6 rounded-xl hover:bg-primary/5">
                 <Plus className="h-4 w-4" />
                 إضافة سطر
               </Button>
               <Button onClick={handleSaveAll} disabled={isSaving} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black h-11 px-8 rounded-xl shadow-lg shadow-emerald-600/10">
                 {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                 حفظ كافة العمليات
               </Button>
             </div>
          </div>

          <div className="border border-border rounded-2xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-right font-black w-40">التاريخ</TableHead>
                  <TableHead className="text-right font-black">المورد / المذخر</TableHead>
                  <TableHead className="text-right font-black w-40">المبلغ</TableHead>
                  <TableHead className="text-right font-black w-40">رقم السند/الوصل</TableHead>
                  <TableHead className="text-right font-black w-20">الصور</TableHead>
                  <TableHead className="text-right font-black">ملاحظات</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={row.id} className={row.isValid ? 'bg-emerald-500/[0.02]' : ''}>
                    <TableCell className="p-2">
                      <Input 
                        type="date" 
                        value={row.date}
                        onChange={e => updateRow(row.id, 'date', e.target.value)}
                        className="h-10 border-border focus:ring-primary/20 rounded-xl font-mono text-center"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                       <Select 
                        value={row.entityId} 
                        onValueChange={val => {
                          const entity = entities.find(e => e.id === val);
                          updateRow(row.id, 'entityId', val);
                          if (entity) updateRow(row.id, 'entityName', entity.name);
                        }}
                      >
                        <SelectTrigger className="h-10 border-border rounded-xl font-bold bg-background">
                          <SelectValue placeholder="اختر المورد..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-60" dir="rtl">
                          <div className="p-2 sticky top-0 bg-background z-10 border-b">
                            <div className="relative">
                              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                              <Input 
                                placeholder="ابحث عن مورد..." 
                                className="h-8 pr-9 text-xs rounded-lg"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                              />
                            </div>
                          </div>
                          {entities
                            .filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()))
                            .map(entity => (
                              <SelectItem key={entity.id} value={entity.id!} className="font-bold py-2.5">
                                <div className="flex justify-between items-center w-full gap-8">
                                  <span>{entity.name}</span>
                                  <Badge variant="outline" className="text-[9px] font-black uppercase py-0 leading-none h-4">
                                    {getSupplierTypeLabel(entity.type)}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-2">
                      <Input 
                        value={row.amount}
                        onChange={e => updateRow(row.id, 'amount', formatNumberWithCommas(e.target.value.replace(/,/g, '')))}
                        className="h-10 border-border focus:ring-primary/20 rounded-xl font-mono text-left font-black text-emerald-600"
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input 
                        value={row.vouchedNumber}
                        onChange={e => updateRow(row.id, 'vouchedNumber', e.target.value)}
                        className="h-10 border-border focus:ring-primary/20 rounded-xl font-mono text-center font-bold"
                        placeholder="V-000"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                       <div className="flex flex-col items-center justify-center gap-1">
                          <div className="relative group/img">
                            <input 
                              type="file" 
                              multiple 
                              id={`pay-file-upload-${row.id}`} 
                              className="hidden" 
                              accept="image/*,application/pdf"
                              onChange={e => {
                                const files = Array.from(e.target.files || []);
                                if (files.length > 0) {
                                  updateRow(row.id, 'imageFiles', [...(row.imageFiles || []), ...files]);
                                }
                              }}
                            />
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg relative"
                              onClick={() => document.getElementById(`pay-file-upload-${row.id}`)?.click()}
                              title="إرفاق صور الوصل"
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
                                onClick={() => updateRow(row.id, 'imageFiles', [])}
                                className="absolute -bottom-1 -left-1 bg-rose-500 text-white rounded-full p-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            )}
                          </div>
                          {row.uploadProgress !== undefined && row.uploadProgress > 0 && row.uploadProgress < 100 && (
                             <div className="w-10 h-1 bg-muted rounded-full overflow-hidden">
                               <div className="bg-primary h-full transition-all duration-300" style={{ width: `${row.uploadProgress}%` }} />
                             </div>
                          )}
                        </div>
                    </TableCell>
                    <TableCell className="p-2">
                      <Input 
                        value={row.notes}
                        onChange={e => updateRow(row.id, 'notes', e.target.value)}
                        className="h-10 border-border focus:ring-primary/20 rounded-xl font-bold"
                        placeholder="ملاحظات اختيارية..."
                      />
                    </TableCell>
                    <TableCell className="p-2 text-center">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeRow(row.id)}
                        className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
