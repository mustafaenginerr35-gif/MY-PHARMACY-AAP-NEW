import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Calendar, 
  FileText, 
  Info, 
  Camera, 
  Upload,
  CheckCircle,
  X,
  AlertCircle
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
  formatNumberWithCommas, 
  safeFormatDate, 
  toValidDate 
} from '../lib/formatters';
import { Deadline, LedgerEntry } from '../db';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { toast } from 'sonner';

interface ExecutePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  deadline: Deadline | null;
  currentCash: number;
  onConfirm: (data: {
    amount: number;
    date: Date;
    notes: string;
    images: File[];
  }) => Promise<void>;
}

export const ExecutePaymentModal = ({ 
  isOpen, 
  onClose, 
  deadline, 
  currentCash,
  onConfirm 
}: ExecutePaymentModalProps) => {
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const numAmount = Number(amount) || 0;
  const balanceAfter = currentCash - numAmount;
  const isInsufficient = numAmount > currentCash;

  useEffect(() => {
    if (deadline && isOpen) {
      setAmount(String(deadline.requiredPayment));
      setDate(new Date().toISOString().split('T')[0]);
      setNotes(deadline.notes || '');
      setImages([]);
    }
  }, [deadline, isOpen]);

  if (!deadline) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file as any)
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onConfirm({
        amount: Number(amount),
        date: new Date(date),
        notes,
        images: images.map(img => img.file)
      });
      toast.success('تم تنفيذ التسديد وتحديث الحسابات بنجاح');
      onClose();
    } catch (error) {
      console.error('Failed to execute payment:', error);
      toast.error('حدث خطأ أثناء تنفيذ التسديد');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent dir="rtl" className="bg-card border-border text-foreground sm:max-w-2xl rounded-3xl overflow-hidden p-0">
        <DialogHeader className="bg-emerald-500/5 p-8 border-b border-border">
          <DialogTitle className="text-2xl font-black flex items-center gap-3">
            <div className="size-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600">
              <CheckCircle className="h-6 w-6" />
            </div>
            تأكيد وتسديد القائمة الآن
          </DialogTitle>
          <DialogDescription className="text-emerald-700 pt-2 font-bold">
            سيتم إنشاء وصل سداد حقيقي وخصمه من رصيد المورد {deadline.accountName}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleConfirm} className="p-8 space-y-8">
          {/* Summary Info */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
             <div className="bg-muted/30 p-4 rounded-2xl border border-border">
                <Label className="text-[10px] font-black text-muted-foreground uppercase mb-1 block">رقم القائمة</Label>
                <div className="font-black text-lg">{deadline.invoiceNumber}</div>
             </div>
             <div className="bg-muted/30 p-4 rounded-2xl border border-border">
                <Label className="text-[10px] font-black text-muted-foreground uppercase mb-1 block">المتبقي في القائمة</Label>
                <div className="font-black text-lg text-rose-600 font-mono tracking-tighter">{formatNumberWithCommas(deadline.amount)}</div>
             </div>
             <div className="col-span-2 md:col-span-1 bg-primary/5 p-4 rounded-2xl border border-primary/10">
                <Label className="text-[10px] font-black text-primary uppercase mb-1 block">الرصيد النقدي الحالي</Label>
                <div className="font-black text-lg text-primary font-mono tracking-tighter">{formatNumberWithCommas(currentCash)}</div>
             </div>
          </div>

          {/* Cash flow impact */}
          <div className="p-4 rounded-2xl border border-border bg-muted/20 space-y-3">
             <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-muted-foreground">الرصيد بعد هذا التسديد:</span>
                <span className={`font-black font-mono tracking-tighter ${balanceAfter >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatNumberWithCommas(balanceAfter)} د.ع
                </span>
             </div>
             {isInsufficient && (
               <div className="flex items-center gap-2 p-3 bg-rose-500/10 text-rose-600 rounded-xl animate-pulse">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs font-black">تحذير: الرصيد النقدي لا يكفي لهذا التسديد</span>
               </div>
             )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-xs font-black uppercase text-muted-foreground mr-1">مبلغ التسديد الفعلي</Label>
              <div className="relative group">
                <div className="absolute inset-0 bg-emerald-500/5 blur-xl group-hover:blur-2xl transition-all rounded-full opacity-0 group-hover:opacity-100" />
                <CurrencyInput 
                  value={amount}
                  onValueChange={setAmount}
                  placeholder="0"
                  className="bg-muted border-border h-16 rounded-xl font-black text-3xl pr-14 text-emerald-600 relative z-10"
                />
                <DollarSign className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-emerald-600 relative z-20" />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-muted-foreground z-20 text-lg">د.ع</div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-black uppercase text-muted-foreground mr-1">تاريخ التسديد الفعلي</Label>
              <div className="relative">
                <Input 
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-muted border-border h-16 rounded-xl font-black text-xl pr-12"
                />
                <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-black uppercase text-muted-foreground mr-1">ملاحظات الوصل</Label>
            <Textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثلاً: تم التسديد كاش عبر المندوب..."
              className="bg-muted border-border rounded-2xl min-h-[100px] font-bold text-lg"
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black uppercase text-muted-foreground mr-1 tracking-widest">صورة وصل السداد (اختياري)</Label>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                className="h-8 rounded-lg border-primary/20 text-primary font-bold hover:bg-primary/5 gap-2"
                onClick={() => document.getElementById('payment_receipt_upload')?.click()}
              >
                <Camera className="h-4 w-4" />
                التقاط / رفع صورة
              </Button>
              <input 
                id="payment_receipt_upload"
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 pt-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border-2 border-border group">
                    <img src={img.preview} alt="Receipt" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-4 pt-4">
             <Button type="button" variant="ghost" onClick={onClose} className="rounded-2xl h-16 flex-1 font-bold text-lg border border-border">إلغاء</Button>
             <Button 
                type="submit" 
                disabled={!amount || isSubmitting}
                className="rounded-2xl h-16 flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white font-black text-2xl shadow-xl shadow-emerald-500/30 transition-all hover:scale-[1.01] active:scale-[0.98] ring-4 ring-emerald-500/10"
             >
               {isSubmitting ? 'جاري التنفيذ...' : 'تأكيد التسديد الآن'}
             </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
