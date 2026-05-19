import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Save, 
  X, 
  Plus,
  ArrowRight,
  FileText,
  User,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  formatNumberWithCommas, 
  safeFormatDate, 
  toValidDate 
} from '../lib/formatters';
import { Deadline, LedgerEntry, Entity } from '../db';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { AnimatePresence } from 'framer-motion';

interface PaymentDeadlineFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (deadline: Partial<Deadline>) => Promise<void>;
  entities: Entity[];
  allLedgerEntries: LedgerEntry[];
  initialData?: Deadline | null;
  currentBranchId: string | null;
}

export const PaymentDeadlineForm = ({ 
  isOpen, 
  onClose, 
  onSave, 
  entities,
  allLedgerEntries,
  initialData,
  currentBranchId
}: PaymentDeadlineFormProps) => {
  const [supplierId, setSupplierId] = useState<string>('');
  const [invoiceId, setInvoiceId] = useState<string>('');
  const [expectedAmount, setExpectedAmount] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Filtered invoices based on supplier selection
  const availableInvoices = useMemo(() => {
    if (!supplierId) return [];
    return allLedgerEntries.filter(entry => 
      (entry.accountId === supplierId || entry.entityId === supplierId) &&
      (entry.operationType === 'invoice' || entry.type === 'purchase_invoice') &&
      entry.paymentStatus !== 'paid' &&
      !entry.isDeleted
    );
  }, [supplierId, allLedgerEntries]);

  const selectedInvoice = useMemo(() => {
    return availableInvoices.find(inv => inv.id === invoiceId);
  }, [invoiceId, availableInvoices]);

  useEffect(() => {
    if (initialData) {
      setSupplierId(initialData.accountId);
      setInvoiceId(initialData.invoiceId);
      setExpectedAmount(String(initialData.requiredPayment));
      const vDate = toValidDate(initialData.dueDate);
      setDueDate(!isNaN(vDate.getTime()) ? vDate.toISOString().split('T')[0] : '');
      setNotes(initialData.notes || '');
    } else {
      setSupplierId('');
      setInvoiceId('');
      setExpectedAmount('');
      setDueDate('');
      setNotes('');
    }
  }, [initialData, isOpen]);

  // If a new invoice is selected, default expected amount to its remaining
  useEffect(() => {
    if (selectedInvoice && !initialData) {
      setExpectedAmount(String(selectedInvoice.remainingAmount ?? selectedInvoice.amount));
    }
  }, [selectedInvoice, initialData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !invoiceId || !dueDate || !expectedAmount) return;
    
    setIsSaving(true);
    try {
      const supplier = entities.find(e => e.id === supplierId);
      const invoice = availableInvoices.find(i => i.id === invoiceId);
      
      await onSave({
        ...initialData,
        accountId: supplierId,
        accountName: supplier?.name || '',
        invoiceId: invoiceId,
        invoiceNumber: invoice?.invoiceNumber || '',
        amount: invoice?.remainingAmount ?? (invoice?.amount || 0),
        requiredPayment: Number(expectedAmount),
        dueDate: new Date(dueDate),
        notes,
        status: initialData?.status || 'pending',
        branchId: initialData?.branchId || currentBranchId || 'all'
      });
      onClose();
    } catch (error) {
      console.error('Failed to save deadline:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent dir="rtl" className="bg-card border-border text-foreground sm:max-w-xl rounded-3xl overflow-hidden p-0">
        <DialogHeader className="bg-primary/5 p-8 border-b border-border">
          <DialogTitle className="text-2xl font-black flex items-center gap-3">
            <div className="size-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <CalendarIcon className="h-6 w-6" />
            </div>
            {initialData ? 'تعديل موعد تسديد' : 'جدولة موعد تسديد جديد'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground pt-2 font-bold">
            قم بتحديد المورد والقائمة وتاريخ التسديد المتوقع.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Supplier Select */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mr-1">المورد / المذخر</Label>
              <Select value={supplierId} onValueChange={setSupplierId} disabled={!!initialData}>
                <SelectTrigger className="bg-muted border-border h-14 rounded-xl font-bold text-lg">
                  <SelectValue placeholder="اختر المورد..." />
                </SelectTrigger>
                <SelectContent dir="rtl" className="bg-card border-border">
                   {entities.map(e => (
                     <SelectItem key={e.id} value={e.id || ''} className="py-2.5 font-bold">
                        {e.name}
                     </SelectItem>
                   ))}
                </SelectContent>
              </Select>
            </div>

            {/* Invoice Select */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mr-1">القائمة / الفاتورة</Label>
              <Select value={invoiceId} onValueChange={setInvoiceId} disabled={!supplierId || !!initialData}>
                <SelectTrigger className="bg-muted border-border h-14 rounded-xl font-bold text-lg">
                  <SelectValue placeholder={supplierId ? "اختر القائمة..." : "اختر المورد أولاً"} />
                </SelectTrigger>
                <SelectContent dir="rtl" className="bg-card border-border">
                   {availableInvoices.map(inv => (
                     <SelectItem key={inv.id} value={inv.id || ''} className="py-3 font-bold">
                        <div className="flex flex-col text-right">
                          <span>قائمة رقم: {inv.invoiceNumber}</span>
                          <span className="text-[10px] text-muted-foreground">التاريخ: {safeFormatDate(toValidDate(inv.date || inv.createdAt), 'yyyy/MM/dd')} | المتبقي: {formatNumberWithCommas(inv.remainingAmount ?? inv.amount)}</span>
                        </div>
                     </SelectItem>
                   ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <AnimatePresence>
            {selectedInvoice && (
              <div className="p-5 bg-primary/5 border border-primary/10 rounded-2xl animate-in fade-in slide-in-from-top-2">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-right">
                  <div>
                    <Label className="text-[9px] font-black text-muted-foreground uppercase">مبلغ القائمة</Label>
                    <div className="text-lg font-black font-mono">{formatNumberWithCommas(selectedInvoice.totalAmount || selectedInvoice.amount)}</div>
                  </div>
                  <div>
                    <Label className="text-[9px] font-black text-emerald-600 uppercase">المسدد سابقاً</Label>
                    <div className="text-lg font-black font-mono text-emerald-600">{formatNumberWithCommas(selectedInvoice.paidAmount || 0)}</div>
                  </div>
                  <div>
                    <Label className="text-[9px] font-black text-rose-600 uppercase">المتبقي حالياً</Label>
                    <div className="text-lg font-black font-mono text-rose-600">{formatNumberWithCommas(selectedInvoice.remainingAmount ?? selectedInvoice.amount)}</div>
                  </div>
                </div>
              </div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mr-1">المبلغ المتوقع تسديده</Label>
              <div className="relative">
                <CurrencyInput
                  value={expectedAmount}
                  onValueChange={setExpectedAmount}
                  placeholder="0"
                  className="bg-muted border-border h-14 rounded-xl font-black text-xl pr-12"
                />
                <DollarSign className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
              </div>
              <p className="text-[10px] text-muted-foreground font-bold italic pr-1">يمكنك جدولة تسديد جزء من المتبقي فقط</p>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mr-1">تاريخ التسديد المحدد</Label>
              <div className="relative">
                <Input 
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-muted border-border h-14 rounded-xl font-bold pr-10"
                />
                <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mr-1">ملاحظات إضافية</Label>
            <Textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثلاً: بانتظار وصول الحوالة..."
              className="bg-muted border-border rounded-2xl min-h-[100px] font-bold text-right"
            />
          </div>

          <DialogFooter className="gap-3 pt-4">
             <Button type="button" variant="ghost" onClick={onClose} className="rounded-2xl h-14 flex-1 font-bold">إلغاء</Button>
             <Button 
                type="submit" 
                disabled={!supplierId || !invoiceId || !dueDate || isSaving}
                className="rounded-2xl h-14 flex-[2] bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
             >
               {isSaving ? 'جاري الحفظ...' : 
                <>
                  <Save className="h-5 w-5 ml-2" />
                  حفظ الموعد
                </>
               }
             </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
