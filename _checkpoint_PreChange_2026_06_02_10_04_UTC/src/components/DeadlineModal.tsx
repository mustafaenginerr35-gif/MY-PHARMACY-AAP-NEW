import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Bell, 
  BellOff, 
  Save, 
  Trash2, 
  X, 
  AlertCircle 
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '../../components/ui/dialog';
import { Switch } from '../../components/ui/switch';
import { formatNumberWithCommas, safeFormatDate, toValidDate } from '@/src/lib/formatters';
import { Deadline } from '@/src/db';

interface DeadlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (deadline: Partial<Deadline>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  target: {
    id: string; // Invoice ID or Opening Balance ID
    number: string; // Invoice Number or "رصيد افتتاحي"
    amount: number; // Remaining amount
    accountId: string;
    accountName: string;
  } | null;
  currentDeadline: Deadline | null;
}

export const DeadlineModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  onDelete, 
  target, 
  currentDeadline 
}: DeadlineModalProps) => {
  const [dueDate, setDueDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [alertEnabled, setAlertEnabled] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentDeadline) {
      const vDate = toValidDate(currentDeadline.dueDate);
      setDueDate(!isNaN(vDate.getTime()) ? vDate.toISOString().split('T')[0] : '');
      setNotes(currentDeadline.notes || '');
      // Assuming we'll use a field in Deadline for alert toggle if needed, 
      // otherwise defaulting to true. Let's stick to true for now since it's not in the DB schema yet but requested.
      // I'll add an internal flag for now.
    } else {
      setDueDate('');
      setNotes('');
      setAlertEnabled(true);
    }
  }, [currentDeadline, isOpen]);

  if (!target) return null;

  const handleSave = async () => {
    if (!dueDate) return;
    
    setIsSaving(true);
    try {
      await onSave({
        ...currentDeadline,
        accountId: target.accountId,
        accountName: target.accountName,
        invoiceId: target.id,
        invoiceNumber: target.number,
        amount: target.amount,
        dueDate: new Date(dueDate),
        notes,
        status: 'pending'
      });
      onClose();
    } catch (error) {
      console.error('Failed to save deadline:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentDeadline?.id) return;
    
    setIsSaving(true);
    try {
      await onDelete?.(currentDeadline.id);
      onClose();
    } catch (error) {
      console.error('Failed to delete deadline:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-right flex items-center justify-between">
            <span>تحديد موعد تسديد</span>
            <CalendarIcon className="h-5 w-5 text-primary" />
          </DialogTitle>
          <DialogDescription className="text-right font-bold">
            {target.number === 'رصيد افتتاحي' ? 'للرصيد الافتتاحي' : `للفاتورة رقم ${target.number}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="p-4 bg-muted/50 rounded-2xl border border-border flex justify-between items-center">
            <span className="text-sm font-bold text-muted-foreground">المبلغ المتبقي</span>
            <span className="text-lg font-black text-rose-600 font-mono tracking-tighter">
              {formatNumberWithCommas(target.amount)}
            </span>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest block text-right pr-1">تاريخ موعد التسديد</Label>
            <div className="relative">
              <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input 
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-card border-border h-12 pr-10 rounded-xl font-bold focus:ring-primary/20 text-right"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest block text-right pr-1">ملاحظات</Label>
            <Textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: التسديد قبل نهاية الشهر..."
              className="bg-card border-border rounded-xl font-bold min-h-[100px] text-right"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${alertEnabled ? 'bg-amber-500/10 text-amber-500' : 'bg-muted text-muted-foreground'}`}>
                {alertEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              </div>
              <div className="text-right">
                <div className="text-sm font-bold">تفعيل التنبيه</div>
                <div className="text-[10px] text-muted-foreground">تذكير بالموقع قبل الموعد</div>
              </div>
            </div>
            <Switch 
              checked={alertEnabled}
              onCheckedChange={setAlertEnabled}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          {currentDeadline && (
            <Button 
              variant="ghost" 
              className="h-12 px-6 rounded-xl font-black text-rose-600 hover:bg-rose-500/10 gap-2 flex-1"
              onClick={handleDelete}
              disabled={isSaving}
            >
              <Trash2 className="h-4 w-4" />
              حذف الموعد
            </Button>
          )}
          <Button 
            className="h-12 px-8 rounded-xl font-black bg-primary hover:bg-primary/90 gap-2 flex-[2] shadow-lg shadow-primary/20"
            onClick={handleSave}
            disabled={!dueDate || isSaving}
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'جاري الحفظ...' : 'حفظ الموعد'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
