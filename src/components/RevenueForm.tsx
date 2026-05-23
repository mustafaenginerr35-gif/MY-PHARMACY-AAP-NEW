import React, { useState, useEffect } from 'react';
import { safeFormatDate } from '../lib/formatters';
import { 
  DollarSign, 
  Calendar, 
  Clock3, 
  TrendingUp,
  User,
  Phone,
  CalendarDays,
  Upload,
  Image as ImageIcon,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { formatNumberWithCommas, parseFormattedNumber } from '@/src/lib/formatters';
import { CurrencyInput } from '@/components/ui/CurrencyInput';

interface RevenueFormProps {
  onSubmit: (data: any) => void;
  onClose: () => void;
  onDelete?: () => void;
  onImagesChange: (files: File[]) => void;
  initialData?: any;
}

export const RevenueForm = ({ onSubmit, onClose, onDelete, onImagesChange, initialData }: RevenueFormProps) => {
  const [revenueClassification, setRevenueClassification] = useState<'operating' | 'non-operating' | 'receive_loan'>(initialData?.revenueClassification || 'operating');
  const [nonOperatingType, setNonOperatingType] = useState<string>(initialData?.nonOperatingType || '');
  const [loanInStatus, setLoanInStatus] = useState<string>(initialData?.loanInStatus || 'open');
  const [incomeType, setIncomeType] = useState<'cash' | 'credit'>(initialData?.incomeType || 'cash');
  const [saleAmount, setSaleAmount] = useState<string>(initialData?.saleAmount ? formatNumberWithCommas(initialData.saleAmount) : '');
  const [profitPercent, setProfitPercent] = useState<string>(initialData?.profitPercent?.toString() || '15');
  const [images, setImages] = useState<{file?: File, preview: string}[]>(
    Array.isArray(initialData?.imageUrls) 
      ? initialData.imageUrls.map((url: string) => ({ preview: url })) 
      : (initialData?.imageUrl ? [{ preview: initialData.imageUrl }] : [])
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const data = Object.fromEntries(formData.entries());
      
      const sAmount = parseFormattedNumber(saleAmount);
      
      if (revenueClassification === 'operating') {
        const pPercent = parseFloat(profitPercent) || 0;
        const profAmount = (sAmount * pPercent) / 100;
        const cAmount = sAmount - profAmount;
        
        const pAmount = incomeType === 'cash' ? sAmount : 0;
        const remAmount = incomeType === 'cash' ? 0 : sAmount;

        await onSubmit({
          ...initialData,
          ...data,
          revenueClassification: 'operating',
          incomeType,
          paymentType: incomeType,
          type: 'income',
          saleAmount: sAmount,
          costAmount: cAmount,
          profitPercent: pPercent,
          profitAmount: profAmount,
          paidAmount: pAmount,
          remainingAmount: remAmount,
          amount: sAmount,
          netProfit: profAmount,
          date: (data.date && !isNaN(new Date(data.date as string).getTime())) ? new Date(data.date as string) : new Date(),
          dueDate: data.dueDate ? new Date(data.dueDate as string) : null,
          updatedAt: new Date()
        });
      } else if (revenueClassification === 'receive_loan') {
         // Receive loan (decreases "Due to Me")
         await onSubmit({
            ...initialData,
            ...data,
            revenueClassification: 'receive_loan',
            type: 'income',
            saleAmount: sAmount,
            amount: sAmount,
            profitAmount: 0,
            profitPercent: 0,
            paidAmount: sAmount,
            incomeType: 'cash',
            date: (data.date && !isNaN(new Date(data.date as string).getTime())) ? new Date(data.date as string) : new Date(),
            updatedAt: new Date()
         });
      } else {
        // Non-operating revenue
        await onSubmit({
          ...initialData,
          ...data,
          revenueClassification: 'non-operating',
          nonOperatingType,
          type: 'income',
          saleAmount: sAmount, // Still use this for cash inflow logic
          amount: sAmount,
          profitAmount: 0, // No profit from non-operating
          profitPercent: 0,
          paidAmount: sAmount, // Non-operating is always assumed cash for simplicity here, unless user wants otherwise
          incomeType: 'cash',
          loanInStatus: nonOperatingType === 'loan_in' ? loanInStatus : undefined,
          date: (data.date && !isNaN(new Date(data.date as string).getTime())) ? new Date(data.date as string) : new Date(),
          returnDate: data.returnDate ? new Date(data.returnDate as string) : null,
          updatedAt: new Date()
        });
      }
      onClose();
    } catch (error: any) {
      console.error("Submission error:", error);
      // Determine error message in Arabic
      let errorMsg = 'حدث خطأ أثناء حفظ البيانات';
      if (error?.message) {
        try {
          const parsed = JSON.parse(error.message);
          if (parsed.error === 'Missing or insufficient permissions.') {
            errorMsg = 'عذراً، ليس لديك الصلاحية الكافية لهذه العملية';
          } else {
            errorMsg = `خطأ: ${parsed.error}`;
          }
        } catch {
          if (error.message.includes('permission')) {
            errorMsg = 'عذراً، فشل الحفظ بسبب الصلاحيات';
          } else {
            errorMsg = error.message;
          }
        }
      }
      import('sonner').then(({ toast }) => toast.error(errorMsg));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImagesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file as any)
    }));
    
    const updatedImages = [...images, ...newImages];
    setImages(updatedImages);
    onImagesChange(updatedImages.filter(img => img.file).map(img => img.file!));
  };

  const removeImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    setImages(updatedImages);
    onImagesChange(updatedImages.filter(img => img.file).map(img => img.file!));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-6">
        {/* Revenue Classification Selection */}
        <div className="space-y-3 p-5 bg-card/10 border border-primary/10 rounded-3xl">
          <Label className="text-primary font-black text-[10px] uppercase tracking-widest block mb-1">نوع الوارد</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Button
              type="button"
              variant={revenueClassification === 'operating' ? 'default' : 'outline'}
              onClick={() => setRevenueClassification('operating')}
              className={`h-12 rounded-xl font-black ${revenueClassification === 'operating' ? 'bg-primary shadow-lg shadow-primary/20' : ''}`}
            >
              وارد مبيعات
            </Button>
            <Button
              type="button"
              variant={revenueClassification === 'non-operating' ? 'default' : 'outline'}
              onClick={() => setRevenueClassification('non-operating')}
              className={`h-12 rounded-xl font-black ${revenueClassification === 'non-operating' ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20' : ''}`}
            >
              وارد غير تشغيلي
            </Button>
            <Button
              type="button"
              variant={revenueClassification === 'receive_loan' ? 'default' : 'outline'}
              onClick={() => setRevenueClassification('receive_loan')}
              className={`h-12 rounded-xl font-black ${revenueClassification === 'receive_loan' ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/20' : ''}`}
            >
              استلام سلفة / جمعية
            </Button>
          </div>
        </div>

        {revenueClassification === 'operating' ? (
          /* Operating Revenue Selection Part */
          <div className="space-y-6">
            <div className="space-y-3 p-5 bg-muted/10 border border-border rounded-2xl">
              <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest block">نوع العملية</Label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setIncomeType('cash')}
                  className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                    incomeType === 'cash' 
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 shadow-lg shadow-emerald-500/5' 
                    : 'border-border bg-muted/30 text-muted-foreground hover:border-border/80'
                  }`}
                >
                  <DollarSign className={`h-6 w-6 ${incomeType === 'cash' ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                  <div className="text-sm font-black uppercase">نقدي</div>
                </button>
                <button
                  type="button"
                  onClick={() => setIncomeType('credit')}
                  className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                    incomeType === 'credit' 
                    ? 'border-amber-500 bg-amber-500/10 text-amber-600 shadow-lg shadow-amber-500/5' 
                    : 'border-border bg-muted/30 text-muted-foreground hover:border-border/80'
                  }`}
                >
                  <Clock3 className={`h-6 w-6 ${incomeType === 'credit' ? 'text-amber-600' : 'text-muted-foreground'}`} />
                  <div className="text-sm font-black uppercase">آجل</div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className="space-y-2 p-5 bg-card/40 border border-border rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-2xl rounded-full" />
                  <Label className="text-primary font-black text-[10px] uppercase tracking-widest block mb-2">إجمالي الوارد</Label>
                  <div className="relative">
                    <CurrencyInput 
                      name="saleAmount" 
                      required 
                      value={parseFormattedNumber(saleAmount)}
                      onChange={(val) => setSaleAmount(formatNumberWithCommas(val))}
                      placeholder="0,000" 
                      className="bg-muted border-primary/20 text-foreground h-14 rounded-xl font-mono text-2xl font-black pr-12 text-right" 
                    />
                    <TrendingUp className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">نسبة الربح %</Label>
                  <div className="relative">
                    <Input 
                      name="profitPercent" 
                      type="number"
                      required
                      value={profitPercent}
                      onChange={(e) => setProfitPercent(e.target.value)}
                      className="bg-muted border-border text-foreground h-12 rounded-xl font-mono font-bold pl-10" 
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">%</span>
                  </div>
                </div>
                
                <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-emerald-700 uppercase">الربح المحسوب:</span>
                    <span className="font-mono font-black text-emerald-600 text-lg">
                      {formatNumberWithCommas(((parseFormattedNumber(saleAmount) * (parseFloat(profitPercent) || 0)) / 100).toFixed(0))}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">التاريخ</Label>
                  <div className="relative">
                    <Input 
                      name="date" 
                      type="date" 
                      defaultValue={initialData?.date ? safeFormatDate(initialData.date, 'yyyy-MM-dd', { useAr: false }) : safeFormatDate(new Date(), 'yyyy-MM-dd', { useAr: false })} 
                      required 
                      className="bg-muted border-border text-foreground h-14 rounded-xl pr-10 font-black" 
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">ملاحظات (اختياري)</Label>
                  <textarea 
                    name="notes" 
                    defaultValue={initialData?.notes || ''}
                    placeholder="اكتب ملاحظات حول العملية..." 
                    className="w-full bg-muted border border-border text-foreground rounded-2xl p-4 h-[7.5rem] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold resize-none" 
                  />
                </div>
              </div>
            </div>
          </div>
        ) : revenueClassification === 'non-operating' ? (
          /* Non-Operating Revenue UI */
          <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-indigo-600 font-black text-[10px] uppercase tracking-widest">نوع الوارد الآخر</Label>
                  <select
                    name="nonOperatingType"
                    required
                    value={nonOperatingType}
                    onChange={(e) => setNonOperatingType(e.target.value)}
                    className="w-full bg-muted border border-border text-foreground h-12 rounded-xl px-4 font-black focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  >
                    <option value="">اختر النوع...</option>
                    <option value="loan_in">سلفة داخلة (التزام)</option>
                    <option value="loan_return">استرجاع سلفة (خارجية)</option>
                    <option value="added_capital">رأس مال مضاف</option>
                    <option value="owner_support">دعم من صاحب الصيدلية</option>
                    <option value="other">وارد آخر</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-indigo-600 font-black text-[10px] uppercase tracking-widest">المبلغ</Label>
                  <div className="relative">
                    <CurrencyInput 
                      name="saleAmount" 
                      required 
                      value={parseFormattedNumber(saleAmount)}
                      onChange={(val) => setSaleAmount(formatNumberWithCommas(val))}
                      placeholder="0,000" 
                      className="bg-muted border-indigo-500/20 text-foreground h-14 rounded-xl font-mono text-2xl font-black pr-12 text-right" 
                    />
                    <DollarSign className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-500" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-indigo-600 font-black text-[10px] uppercase tracking-widest">التاريخ</Label>
                  <div className="relative">
                    <Input 
                      name="date" 
                      type="date" 
                      defaultValue={initialData?.date ? safeFormatDate(initialData.date, 'yyyy-MM-dd', { useAr: false }) : safeFormatDate(new Date(), 'yyyy-MM-dd', { useAr: false })} 
                      required 
                      className="bg-muted border-border text-foreground h-12 rounded-xl pr-10 font-bold" 
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-indigo-600 font-black text-[10px] uppercase tracking-widest">الجهة / الشخص</Label>
                  <div className="relative">
                    <Input 
                      name="entityName" 
                      defaultValue={initialData?.entityName || ''}
                      placeholder="اسم المصدر أو الشخص..." 
                      className="bg-muted border-border h-12 rounded-xl pr-10 font-bold" 
                    />
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-indigo-600 font-black text-[10px] uppercase tracking-widest">سبب الوارد</Label>
                  <Input 
                    name="reason" 
                    defaultValue={initialData?.reason || ''}
                    placeholder="مثال: تمويل للمشتريات..." 
                    className="bg-muted border-border h-12 rounded-xl font-bold" 
                  />
                </div>

                <AnimatePresence>
                  {nonOperatingType === 'loan_in' && (
                    <>
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-2 overflow-hidden"
                      >
                        <Label className="text-rose-500 font-black text-[10px] uppercase tracking-widest italic">موعد الاسترجاع المتوقع (اختياري)</Label>
                        <div className="relative">
                          <Input 
                            name="returnDate" 
                            type="date" 
                            defaultValue={initialData?.returnDate ? safeFormatDate(initialData.returnDate, 'yyyy-MM-dd', { useAr: false }) : ''}
                            className="bg-rose-500/5 border-rose-500/20 text-foreground h-12 rounded-xl pr-10 font-bold" 
                          />
                          <CalendarDays className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-rose-500" />
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-2 overflow-hidden"
                      >
                        <Label className="text-rose-500 font-black text-[10px] uppercase tracking-widest italic">حالة السلفة</Label>
                        <select
                          name="loanInStatus"
                          value={loanInStatus}
                          onChange={(e) => setLoanInStatus(e.target.value)}
                          className="w-full bg-rose-500/5 border border-rose-500/20 text-foreground h-12 rounded-xl px-4 font-black focus:ring-2 focus:ring-rose-500/20 outline-none"
                        >
                          <option value="open">مفتوحة (لم ترجع)</option>
                          <option value="partially_returned">مرجعة جزئياً</option>
                          <option value="fully_returned">مرجعة بالكامل</option>
                        </select>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <Label className="text-indigo-600 font-black text-[10px] uppercase tracking-widest">ملاحظات إضافية</Label>
                  <textarea 
                    name="notes" 
                    defaultValue={initialData?.notes || ''}
                    placeholder="..." 
                    className="w-full bg-muted border border-border text-foreground rounded-2xl p-4 h-[4.5rem] focus:outline-none transition-all font-bold resize-none" 
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Receive Loan UI */
          <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
            <div className="bg-amber-500/5 border border-amber-500/10 p-5 rounded-3xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-500/10 rounded-xl">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-black text-amber-900 uppercase text-xs">استلام سلفة / جمعية</h4>
                  <p className="text-[10px] text-amber-700 font-bold">هذه العملية تخصم من رصيد "السلف المستحقة لي" وتزيد الكاش.</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-amber-800 font-black text-[10px] uppercase tracking-widest">اسم الشخص / الجهة</Label>
                      <Input name="entityName" defaultValue={initialData?.entityName || ''} required={revenueClassification === 'receive_loan'} placeholder="اسم الشخص..." className="bg-background border-amber-500/20 h-12 rounded-xl font-bold" />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-amber-800 font-black text-[10px] uppercase tracking-widest">المبلغ المستلم</Label>
                       <CurrencyInput 
                          name="saleAmount" 
                          required={revenueClassification === 'receive_loan'} 
                          value={parseFormattedNumber(saleAmount)}
                          onChange={(val) => setSaleAmount(formatNumberWithCommas(val))}
                          placeholder="0,000" 
                          className="bg-background border-amber-500/20 h-14 rounded-xl font-mono text-2xl font-black pr-12 text-right" 
                        />
                    </div>
                 </div>
                 <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-amber-800 font-black text-[10px] uppercase tracking-widest">التاريخ</Label>
                      <Input name="date" type="date" defaultValue={safeFormatDate(new Date(), 'yyyy-MM-dd', { useAr: false })} required className="bg-background border-amber-500/20 h-12 rounded-xl font-bold" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-amber-800 font-black text-[10px] uppercase tracking-widest">ملاحظات</Label>
                      <textarea name="notes" defaultValue={initialData?.notes || ''} placeholder="..." className="w-full bg-background border border-amber-500/20 rounded-2xl p-4 h-24 font-bold resize-none" />
                    </div>
                 </div>
              </div>
            </div>
          </div>
        )}

        <AnimatePresence>
          {incomeType === 'credit' && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-4 p-5 bg-amber-500/5 rounded-3xl border border-amber-500/10 shadow-sm relative">
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-amber-700 font-black text-[10px] flex items-center gap-2 uppercase tracking-wide">
                      <User className="h-3 w-3" />
                      اسم الزبون
                    </Label>
                    <Input 
                      name="customerName" 
                      defaultValue={initialData?.customerName || ''}
                      placeholder="الاسم الكامل" 
                      className="bg-background border-amber-500/20 text-foreground h-12 rounded-xl font-bold" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-amber-700 font-black text-[10px] flex items-center gap-2 uppercase tracking-wide">
                      <CalendarDays className="h-3 w-3" />
                      موعد الاستحقاق
                    </Label>
                    <Input 
                      name="dueDate" 
                      type="date" 
                      defaultValue={initialData?.dueDate ? safeFormatDate(initialData.dueDate, 'yyyy-MM-dd', { useAr: false }) : ''}
                      className="bg-background border-amber-500/20 text-foreground h-12 rounded-xl font-bold" 
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attachment Section */}
        <div className="space-y-4 p-5 bg-card/10 border border-border rounded-3xl">
          <Label className="text-muted-foreground font-black text-xs uppercase tracking-widest block">المرفقات والصور</Label>
          
          <div className="flex flex-wrap gap-4">
            {images.map((img, index) => (
              <div key={index} className="relative w-24 h-24 rounded-2xl border-2 border-border overflow-hidden group shadow-lg">
                <img src={img.preview} alt="Attachment" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <TrendingUp className="h-3 w-3 rotate-45" />
                </button>
              </div>
            ))}
            
            <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-all gap-1 group">
              <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all" />
              <span className="text-[10px] font-black text-muted-foreground uppercase">إضافة</span>
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                className="hidden" 
                onChange={handleImagesSelect}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-border">
        {initialData && onDelete && (
          <Button 
            type="button" 
            variant="destructive"
            onClick={onDelete}
            className="flex-1 font-black h-16 rounded-3xl bg-rose-500 hover:bg-rose-600 text-white text-lg"
          >
            <Trash2 className="h-5 w-5 mr-2" />
            حذف السجل
          </Button>
        )}
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="flex-3 font-black text-xl h-16 rounded-3xl shadow-2xl transition-all scale-100 hover:scale-[1.02] active:scale-[0.98] bg-emerald-600 hover:bg-emerald-700"
        >
          {isSubmitting ? 'جاري الحفظ...' : (initialData ? 'تعديل عملية الوارد' : 'حفظ عملية الوارد')}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={onClose}
          className="flex-1 font-black h-16 rounded-3xl border-border text-lg"
        >
          إلغاء
        </Button>
      </div>
    </form>
  );
};
