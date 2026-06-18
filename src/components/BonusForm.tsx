import React, { useState } from 'react';
import { 
  Building2, 
  Gift, 
  Calendar, 
  FileText, 
  CheckCircle2,
  Clock3,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { format } from 'date-fns';
import { Entity } from '../db';
import { motion } from 'motion/react';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { parseFormattedNumber } from '@/src/lib/formatters';

import { safeFormatDate, toValidDate } from '@/src/lib/formatters';

interface BonusFormProps {
  entities: Entity[];
  selectedEntity?: Entity | null;
  onSubmit: (data: any) => void;
  onClose: () => void;
}

export const BonusForm = ({ entities, selectedEntity: initialEntity, onSubmit, onClose }: BonusFormProps) => {
  const [selectedEntityId, setSelectedEntityId] = useState<string>(initialEntity?.id || '');
  const [status, setStatus] = useState<'pending' | 'received'>('pending');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());
    
    // Fallback logic as requested
    const finalDate = toValidDate(data.dueDate as string || new Date());

    onSubmit({
      ...data,
      entityId: selectedEntityId,
      status,
      amount: parseFormattedNumber(data.amount as string),
      quantity: Number(data.quantity || 0),
      dueDate: finalDate,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left Column: Supplier & Status */}
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest block">المورد المانح للبونص</Label>
              <Select value={selectedEntityId} onValueChange={setSelectedEntityId} required name="entityId">
                <SelectTrigger className="bg-muted border-border text-foreground h-16 rounded-2xl font-black text-xl shadow-sm">
                  <SelectValue placeholder="اختر المورد المستحق" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground max-h-80">
                  {entities.map(e => (
                    <SelectItem key={e.id} value={e.id!} className="py-3 font-bold text-lg">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        {e.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest block">حالة استلام البونص</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setStatus('pending')}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                    status === 'pending' 
                    ? 'border-amber-500 bg-amber-500/10 text-amber-600 shadow-lg scale-105 z-10' 
                    : 'border-border bg-muted/30 text-muted-foreground hover:border-border/80'
                  }`}
                >
                  <Clock3 className="h-6 w-6" />
                  <span className="text-sm font-black">قيد الانتظار</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('received')}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                    status === 'received' 
                    ? 'border-emerald-600 bg-emerald-500/10 text-emerald-600 shadow-lg scale-105 z-10' 
                    : 'border-border bg-muted/30 text-muted-foreground hover:border-border/80'
                  }`}
                >
                  <CheckCircle2 className="h-6 w-6" />
                  <span className="text-sm font-black">تم الاستلام</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Bonus Details */}
          <div className="space-y-6 p-6 bg-card border border-border rounded-3xl shadow-inner">
            <div className="space-y-2">
              <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">وصف البونص وتفاصيل المادة</Label>
              <div className="relative group">
                <Input 
                  name="description" 
                  required 
                  placeholder="مثلاً: 25 علبة باراسيتامول مجانية" 
                  className="bg-muted border-border text-foreground h-16 rounded-2xl pr-14 font-black text-xl shadow-sm transition-all focus:h-20" 
                />
                <Gift className="absolute right-4 top-1/2 -translate-y-1/2 h-7 w-7 text-amber-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">قيمة البونص التقريبية</Label>
                <div className="relative">
                  <CurrencyInput name="amount" placeholder="0" className="bg-muted border-border text-foreground h-14 rounded-xl font-mono text-xl font-black pr-10 shadow-sm" />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground">د.ع</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">رقم القائمة المرتبطة</Label>
                <div className="relative">
                  <Input name="linkedInvoiceNumber" placeholder="رقم القائمة" className="bg-muted border-border text-foreground h-14 rounded-xl pr-10 font-bold shadow-sm" />
                  <FileText className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">عدد القطع / الوحدات</Label>
                <Input name="quantity" type="number" placeholder="0" className="bg-muted border-border text-foreground h-14 rounded-xl font-mono text-xl font-black shadow-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">تاريخ الاستحقاق المتوقع</Label>
                <div className="relative">
                  <Input name="dueDate" type="date" defaultValue={safeFormatDate(new Date(), 'yyyy-MM-dd', { useAr: false })} required className="bg-muted border-border text-foreground h-14 rounded-xl pr-10 font-bold shadow-sm" />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
            <Info className="h-4 w-4" />
            ملاحظات وتفاصيل إضافية حول البونص
          </Label>
          <Input name="notes" placeholder="اكتب أي تفاصيل أخرى هنا..." className="bg-muted border-border text-foreground rounded-2xl h-14 font-bold shadow-sm" />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-border">
        <Button 
          type="submit" 
          className="flex-3 font-black text-2xl h-16 rounded-3xl shadow-2xl transition-all scale-100 hover:scale-[1.02] active:scale-[0.98] bg-amber-600 hover:bg-amber-700 shadow-amber-500/30"
        >
          حفظ وتأكيد استحقاق البونص
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={onClose}
          className="flex-1 font-black h-16 rounded-3xl border-border hover:bg-muted text-lg"
        >
          إلغاء
        </Button>
      </div>
    </form>
  );
};
