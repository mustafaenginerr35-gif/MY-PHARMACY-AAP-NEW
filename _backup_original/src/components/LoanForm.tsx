import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  User, 
  DollarSign, 
  FileText, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Clock,
  AlertCircle,
  X,
  Plus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { formatNumberWithCommas, safeFormatDate } from '@/src/lib/formatters';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { ImageCapture } from './ImageCapture';
import { Loan } from '../db';

interface LoanFormProps {
  onSubmit: (data: Partial<Loan>) => void;
  onClose: () => void;
  openLoans?: Loan[]; // Required for returns
  onImagesChange?: (files: File[]) => void;
}

export const LoanForm: React.FC<LoanFormProps> = ({ 
  onSubmit, 
  onClose, 
  openLoans = [],
  onImagesChange 
}) => {
  const [type, setType] = useState<'outgoing' | 'returned'>('outgoing');
  const [formData, setFormData] = useState<any>({
    date: safeFormatDate(new Date(), 'yyyy-MM-dd', { useAr: false }),
    partyName: '',
    amount: 0,
    reason: '',
    expectedReturnDate: '',
    notes: '',
    parentLoanId: '',
  });

  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  useEffect(() => {
    if (type === 'returned' && formData.parentLoanId) {
      const loan = openLoans.find(l => l.id === formData.parentLoanId);
      if (loan) {
        setSelectedLoan(loan);
        setFormData(prev => ({ 
          ...prev, 
          partyName: loan.partyName,
          amount: loan.amount - (loan.status === 'partially_returned' ? 0 : 0) // This logic needs careful handling of previous returns
        }));
      }
    }
  }, [formData.parentLoanId, type, openLoans]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submissionData: any = {
      ...formData,
      type,
      date: new Date(formData.date),
      amount: Number(formData.amount),
    };

    if (type === 'outgoing') {
      submissionData.expectedReturnDate = formData.expectedReturnDate ? new Date(formData.expectedReturnDate) : null;
      submissionData.status = 'open';
    } else {
      submissionData.status = 'fully_returned'; // Default to full, logic in App.tsx will handle partial
    }

    onSubmit(submissionData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Type Selector */}
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setType('outgoing')}
          className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all font-black ${
            type === 'outgoing' 
            ? 'border-primary bg-primary/5 text-primary shadow-lg shadow-primary/10' 
            : 'border-muted bg-muted/20 text-muted-foreground hover:bg-muted/30'
          }`}
        >
          <ArrowUpCircle className="h-5 w-5" />
          سلفة صادرة
        </button>
        <button
          type="button"
          onClick={() => setType('returned')}
          className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all font-black ${
            type === 'returned' 
            ? 'border-emerald-600 bg-emerald-600/5 text-emerald-600 shadow-lg shadow-emerald-600/10' 
            : 'border-muted bg-muted/20 text-muted-foreground hover:bg-muted/30'
          }`}
        >
          <ArrowDownCircle className="h-5 w-5" />
          استرجاع سلفة
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Date */}
        <div className="space-y-2">
          <Label className="text-sm font-black flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            التاريخ
          </Label>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="h-12 rounded-xl font-bold"
            required
          />
        </div>

        {/* Amount */}
        <div className="space-y-2">
          <Label className="text-sm font-black flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            المبلغ
          </Label>
          <CurrencyInput
            value={formData.amount}
            onChange={(val) => setFormData({ ...formData, amount: val })}
            className="h-12 rounded-xl font-bold border-emerald-600/20 focus-visible:ring-emerald-600"
          />
        </div>

        {type === 'outgoing' ? (
          <>
            {/* Party Name */}
            <div className="space-y-2">
              <Label className="text-sm font-black flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                اسم الجهة أو الشخص
              </Label>
              <Input
                value={formData.partyName}
                onChange={(e) => setFormData({ ...formData, partyName: e.target.value })}
                placeholder="أدخل اسم الجهة..."
                className="h-12 rounded-xl font-bold"
                required
              />
            </div>

            {/* Expected Return Date */}
            <div className="space-y-2">
              <Label className="text-sm font-black flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                موعد الاسترجاع المتوقع (اختياري)
              </Label>
              <Input
                type="date"
                value={formData.expectedReturnDate}
                onChange={(e) => setFormData({ ...formData, expectedReturnDate: e.target.value })}
                className="h-12 rounded-xl font-bold"
              />
            </div>

            {/* Reason */}
            <div className="md:col-span-2 space-y-2">
              <Label className="text-sm font-black flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-indigo-500" />
                سبب السلفة
              </Label>
              <Input
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="الغرض من السلفة..."
                className="h-12 rounded-xl font-bold"
              />
            </div>
          </>
        ) : (
          <>
            {/* Select Original Loan */}
            <div className="md:col-span-2 space-y-2">
              <Label className="text-sm font-black flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                ربط بالسلفة الأصلية
              </Label>
              <Select 
                value={formData.parentLoanId} 
                onValueChange={(val) => setFormData({ ...formData, parentLoanId: val })}
              >
                <SelectTrigger className="h-12 rounded-xl font-bold">
                  <SelectValue placeholder="اختر سلفة لاسترجاعها" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {openLoans.map(loan => (
                    <SelectItem key={loan.id} value={loan.id!} className="font-bold">
                      {loan.partyName} - {loan.amount.toLocaleString()} د.ع ({safeFormatDate(loan.date, 'yyyy/MM/dd')})
                    </SelectItem>
                  ))}
                  {openLoans.length === 0 && (
                    <div className="p-4 text-center text-sm text-muted-foreground font-bold">
                      لا يوجد سلف مفتوحة حالياً
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Notes */}
        <div className="md:col-span-2 space-y-2">
          <Label className="text-sm font-black flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            ملاحظات
          </Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="ملاحظات إضافية..."
            className="min-h-[100px] rounded-2xl font-bold resize-none"
          />
        </div>

        {/* Image Attachment */}
        <div className="md:col-span-2">
          <Label className="text-sm font-black mb-3 block">صورة الوصل (اختياري)</Label>
          <ImageCapture 
            id="loan-image-upload"
            label=""
            onImageCaptured={(file) => {
              if (onImagesChange) onImagesChange([file]);
            }}
          />
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <Button
          type="submit"
          className="flex-1 h-14 rounded-2xl text-lg font-black bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20"
        >
          حفظ العملية
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="h-14 px-8 rounded-2xl text-lg font-black border-2"
        >
          إلغاء
        </Button>
      </div>
    </form>
  );
};
