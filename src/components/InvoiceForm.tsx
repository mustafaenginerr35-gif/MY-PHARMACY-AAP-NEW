import React, { useState, useMemo } from 'react';
import { safeFormatDate } from '../lib/formatters';
import { 
  Building2, 
  Calendar, 
  DollarSign, 
  FileText, 
  Clock3,
  Gift,
  Upload,
  Image as ImageIcon,
  AlertCircle,
  Plus,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
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
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { Entity } from '../db';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { parseFormattedNumber } from '@/src/lib/formatters';

interface InvoiceFormProps {
  entities: Entity[];
  selectedEntity: Entity | null;
  onSubmit: (data: any) => void;
  onClose: () => void;
  onImagesChange: (files: File[]) => void;
  onAddEntityClick?: () => void;
  initialData?: any;
}

export const InvoiceForm = ({ entities, selectedEntity: initialEntity, onSubmit, onClose, onImagesChange, onAddEntityClick, initialData }: InvoiceFormProps) => {
  const [purchaseType, setPurchaseType] = useState<'cash' | 'credit'>(initialData?.purchaseType || 'credit');
  const [bonusLater, setBonusLater] = useState(initialData?.bonusLater || false);
  const [selectedEntityId, setSelectedEntityId] = useState<string>(initialData?.accountId || initialEntity?.id || '');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState<string>(initialData?.invoiceNumber || '');
  const [invoiceDate, setInvoiceDate] = useState<string>(
    initialData?.date 
      ? safeFormatDate(initialData.date, 'yyyy-MM-dd', { useAr: false }) 
      : safeFormatDate(new Date(), 'yyyy-MM-dd', { useAr: false })
  );
  const [notes, setNotes] = useState<string>(initialData?.notes || '');
  
  // Auto-update selectedEntityId if initialEntity changes (e.g. newly added from modal)
  React.useEffect(() => {
    if (initialEntity?.id && initialEntity.id !== selectedEntityId) {
      setSelectedEntityId(initialEntity.id);
    }
  }, [initialEntity, selectedEntityId]);
  const [amount, setAmount] = useState<number>(initialData?.amount || 0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>(initialData?.discountType || 'fixed');
  const [discount, setDiscount] = useState<number>(initialData?.discount || 0);
  const [discountPercentage, setDiscountPercentage] = useState<number>(
    initialData?.discountPercentage || (initialData?.amount && initialData?.discount ? (initialData.discount / initialData.amount) * 100 : 0)
  );

  const netAmount = useMemo(() => {
    return Math.max(0, amount - discount);
  }, [amount, discount]);

  const handleAmountChange = (val: number) => {
    setAmount(val);
    if (discountType === 'percentage') {
      const newDiscount = (val * discountPercentage) / 100;
      setDiscount(newDiscount);
    } else {
      if (val > 0) {
        setDiscountPercentage((discount / val) * 100);
      }
    }
  };

  const handleDiscountChange = (val: number) => {
    setDiscount(val);
    if (amount > 0) {
      setDiscountPercentage((val / amount) * 100);
    }
  };

  const handlePercentageChange = (val: number) => {
    setDiscountPercentage(val);
    const newDiscount = (amount * val) / 100;
    setDiscount(newDiscount);
  };
  const [images, setImages] = useState<{file?: File, preview: string}[]>(
    Array.isArray(initialData?.imageUrls) 
      ? initialData.imageUrls.map((url: string) => ({ preview: url })) 
      : (initialData?.imageUrl ? [{ preview: initialData.imageUrl }] : [])
  );

  const currentEntity = entities.find(e => e.id === selectedEntityId) || initialEntity;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const data = Object.fromEntries(formData.entries());
      
      await onSubmit({
        ...initialData,
        ...data,
        accountId: selectedEntityId,
        purchaseType,
        bonusLater,
        amount,
        discount,
        discountType,
        discountPercentage,
        netAmount,
        bonus: parseFormattedNumber(data.bonus as string || '0'),
        date: (data.date && !isNaN(new Date(data.date as string).getTime())) ? new Date(data.date as string) : new Date(),
        dueDate: purchaseType === 'credit' && data.dueDate ? (isNaN(new Date(data.dueDate as string).getTime()) ? null : new Date(data.dueDate as string)) : null,
        bonusArrivalDate: bonusLater && data.bonusArrivalDate ? (isNaN(new Date(data.bonusArrivalDate as string).getTime()) ? null : new Date(data.bonusArrivalDate as string)) : null,
        updatedAt: new Date()
      });
      // Component will likely be unmounted by parent on success, 
      // but let's keep it safe.
    } catch (error) {
      console.error("Submission error:", error);
      setIsSubmitting(false);
    }
  };

  const handleAIInvoiceImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    console.log("[Client OCR] Starting invoice image analysis for file:", file.name);
    console.log("[Client OCR] File type:", file.type);
    console.log("[Client OCR] File size:", file.size, "bytes");

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const fullBase64 = reader.result as string;
        const base64Data = fullBase64.split(',')[1];
        const mimeType = file.type;

        console.log("[Client OCR] Base64 string length:", base64Data.length);
        console.log("[Client OCR] Sending analysis POST request to /api/invoice/analyze...");

        const response = await fetch("/api/invoice/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            image: base64Data,
            mimeType: mimeType,
            entities: entities.map(e => ({ id: e.id, name: e.name }))
          })
        });

        console.log("[Client OCR] HTTP Response Status:", response.status);
        const result = await response.json();
        console.log("[Client OCR] Response JSON Payload:", result);

        if (result.success && result.data) {
          const extracted = result.data;
          console.log("[Client OCR] Data extraction successful. Extracted fields:", extracted);
          
          if (extracted.supplierId) {
            setSelectedEntityId(extracted.supplierId);
          } else if (extracted.supplierName) {
            const matched = entities.find(e => 
              e.name.trim().toLowerCase() === extracted.supplierName.trim().toLowerCase()
            );
            if (matched) {
              setSelectedEntityId(matched.id!);
            } else {
              toast.info(`اسم المورد المستخرج: "${extracted.supplierName}"، يرجى تحديده يدوياً.`);
            }
          }

          if (extracted.invoiceNumber) {
            setInvoiceNumber(extracted.invoiceNumber);
          }

          if (extracted.date) {
            setInvoiceDate(extracted.date);
          }

          let extractedAmount = 0;
          if (extracted.amount !== undefined) {
            extractedAmount = Number(extracted.amount);
            setAmount(extractedAmount);
          }
          
          let extractedDiscount = 0;
          if (extracted.discount !== undefined) {
            extractedDiscount = Number(extracted.discount);
            setDiscount(extractedDiscount);
          }

          if (extractedAmount > 0) {
            const pct = (extractedDiscount / extractedAmount) * 100;
            setDiscountPercentage(pct);
          }

          if (extracted.notes) {
            setNotes(extracted.notes);
          }

          const newImg = {
            file,
            preview: URL.createObjectURL(file as any)
          };
          const updatedImages = [...images, newImg];
          setImages(updatedImages);
          onImagesChange(updatedImages.filter(img => img.file).map(img => img.file!));

          toast.success("تم استيراد تفاصيل القائمة بنجاح!");
        } else {
          const errMsg = result.error || "لم يتم التعرف على تفاصيل القائمة بدقة، يرجى إدخالها يدوياً.";
          console.error("[Client OCR] Extraction error reported by API:", errMsg);
          toast.error(`فشل الاستخراج: ${errMsg}`);
        }
      } catch (err: any) {
        console.error("[Client OCR] Network/Execution error during analysis:", err);
        toast.error(`حدث خطأ أثناء الاتصال بالخادم: ${err.message || err}`);
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
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
      <div className="space-y-4">
        {/* AI Multi-modal OCR Extraction */}
        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-xs font-black text-primary">استيراد تفاصيل القائمة بالذكاء الاصطناعي</span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            قم برفع صورة الفاتورة لاستخراج اسم المورد، رقم القائمة، التاريخ، والأسعار تلقائياً وتعبئة الحقول.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isAnalyzing}
              onClick={() => document.getElementById('ai-invoice-input')?.click()}
              className="w-full bg-background border-primary/20 hover:bg-primary/5 text-primary text-xs font-black h-11 rounded-xl gap-2 transition-all shadow-sm"
            >
              {isAnalyzing ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  جاري استخراج البيانات...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Upload className="h-4 w-4" />
                  استيراد من صورة
                </div>
              )}
            </Button>
            <input 
              id="ai-invoice-input"
              type="file" 
              className="hidden" 
              onChange={handleAIInvoiceImport}
              accept="image/*"
              disabled={isAnalyzing}
            />
          </div>
        </div>

        {/* Supplier Selection */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-muted-foreground font-bold">المورد / المذخر</Label>
            {onAddEntityClick && !initialEntity && (
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={onAddEntityClick}
                className="h-8 text-primary font-black gap-1 hover:bg-primary/10 rounded-lg"
              >
                <Plus className="h-3 w-3" />
                مورد جديد
              </Button>
            )}
          </div>
          {initialEntity && !initialData ? (
            <div className="bg-muted p-4 rounded-xl border border-border flex items-center gap-3">
              <Building2 className="h-5 w-5 text-primary" />
              <span className="font-black text-foreground">{initialEntity.name}</span>
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">محدد مسبقاً</span>
            </div>
          ) : (
            <Select value={selectedEntityId} onValueChange={setSelectedEntityId} required name="entityId" disabled={!!initialData}>
              <SelectTrigger className="bg-muted border-border text-foreground h-12 rounded-xl font-bold">
                <SelectValue placeholder="اختر المورد" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground">
                {entities.map(e => (
                  <SelectItem key={e.id} value={e.id!}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Purchase Type */}
        <div className="space-y-2">
          <Label className="text-muted-foreground font-bold text-xs uppercase tracking-wider">نوع الشراء</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPurchaseType('cash')}
              className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                purchaseType === 'cash' 
                ? 'border-emerald-600 bg-emerald-500/10 text-emerald-600 shadow-sm' 
                : 'border-border bg-muted/30 text-muted-foreground hover:border-border/80'
              }`}
            >
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-bold">نقدي (واصـل)</span>
            </button>
            <button
              type="button"
              onClick={() => setPurchaseType('credit')}
              className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                purchaseType === 'credit' 
                ? 'border-amber-500 bg-amber-500/10 text-amber-600 shadow-sm' 
                : 'border-border bg-muted/30 text-muted-foreground hover:border-border/80'
              }`}
            >
              <Clock3 className="h-4 w-4" />
              <span className="text-xs font-bold">آجل (برسم السداد)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground font-bold text-xs uppercase">رقم القائمة</Label>
            <div className="relative">
              <Input 
                name="invoiceNumber" 
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                required 
                placeholder="0000" 
                className="bg-muted border-border text-foreground h-11 rounded-xl pr-10" 
              />
              <FileText className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground font-bold text-xs uppercase">تاريخ القائمة</Label>
            <div className="relative">
              <Input 
                name="date" 
                type="date" 
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                required 
                className="bg-muted border-border text-foreground h-11 rounded-xl pr-10" 
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        <div className="bg-muted/30 p-5 rounded-2xl border border-border/50 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground font-bold text-xs uppercase">المبلغ الكلي (قبل الخصم)</Label>
              <CurrencyInput 
                name="amount" 
                required 
                value={amount}
                onChange={handleAmountChange}
                placeholder="0,000" 
                className="bg-card border-border text-foreground h-12 rounded-xl font-mono text-lg font-black" 
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-1">
                <Label className="text-rose-600 font-bold text-xs uppercase">الخصم</Label>
                <div className="flex bg-muted/80 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setDiscountType('fixed')}
                    className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${discountType === 'fixed' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  >د.ع</button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('percentage')}
                    className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${discountType === 'percentage' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  >%</button>
                </div>
              </div>
              <div className="flex gap-2">
                {discountType === 'percentage' ? (
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      step="0.01"
                      value={discountPercentage}
                      onChange={(e) => handlePercentageChange(parseFloat(e.target.value) || 0)}
                      className="bg-card border-rose-500/20 text-rose-600 h-12 rounded-xl font-mono text-lg font-black pl-8 text-left"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-500 font-bold">%</span>
                  </div>
                ) : (
                  <CurrencyInput 
                    name="discount" 
                    value={discount}
                    onChange={handleDiscountChange}
                    className="flex-1 bg-card border-rose-500/20 text-rose-600 h-12 rounded-xl font-mono text-lg font-black" 
                  />
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/50 flex items-center justify-between">
             <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
               <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
               المبلغ الصافي (السداد الفعلي):
             </div>
             <div className="text-3xl font-black text-emerald-600 font-mono tracking-tighter">
               {netAmount.toLocaleString()} <span className="text-xs text-muted-foreground mr-1 font-sans">د.ع</span>
             </div>
          </div>
          
          {discount > 0 && (
            <div className="text-[10px] font-bold text-rose-500/80 bg-rose-500/5 px-3 py-2 rounded-lg border border-rose-500/10 flex justify-between items-center">
              <span>قيمة التوفير من الخصم:</span>
              <span className="font-black font-mono">{discount.toLocaleString()} د.ع ({discountPercentage.toFixed(2)}%)</span>
            </div>
          )}
        </div>

        <AnimatePresence>
          {purchaseType === 'credit' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-2 p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 mt-2">
                <Label className="text-amber-700 font-bold text-xs flex items-center gap-2">
                  <AlertCircle className="h-3 w-3" />
                  موعد استحقاق الدين (سداد المورد)
                </Label>
                <Input 
                  name="dueDate" 
                  type="date" 
                  defaultValue={initialData?.dueDate ? safeFormatDate(initialData.dueDate, 'yyyy-MM-dd', { useAr: false }) : ''}
                  className="bg-background border-amber-500/20 text-foreground h-10 rounded-lg" 
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bonus Section */}
        <div className="space-y-3 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
          <div className="flex items-center justify-between">
            <Label className="text-blue-700 dark:text-blue-400 font-bold text-xs uppercase tracking-widest">البونص والهدايا</Label>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground">انتظار وصول البونص؟</span>
              <button
                type="button"
                onClick={() => setBonusLater(!bonusLater)}
                className={`w-10 h-5 rounded-full transition-all relative ${bonusLater ? 'bg-blue-500' : 'bg-muted'}`}
              >
                <div className={`absolute top-0.5 h-4 w-4 bg-white rounded-full shadow-sm transition-all ${bonusLater ? 'right-5.5' : 'right-0.5'}`} />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">قيمة البونص (د.ع)</Label>
              <CurrencyInput 
                name="bonus" 
                defaultValue={initialData?.bonus || 0} 
                className="bg-background border-blue-500/20 text-blue-500 font-bold font-mono h-10 rounded-lg" 
              />
            </div>
            {bonusLater ? (
              <div className="space-y-1 animate-in slide-in-from-right-2">
                <Label className="text-[10px] text-muted-foreground">موعد الوصول المتوقع</Label>
                <Input 
                  name="bonusArrivalDate" 
                  type="date" 
                  defaultValue={initialData?.bonusArrivalDate ? safeFormatDate(initialData.bonusArrivalDate, 'yyyy-MM-dd', { useAr: false }) : ''}
                  className="bg-background border-blue-500/20 text-foreground h-10 rounded-lg" 
                />
              </div>
            ) : (
              <div className="space-y-1 flex flex-col justify-end">
                <div className="h-10 flex items-center gap-2 text-emerald-500 text-[10px] font-bold bg-emerald-500/5 px-3 rounded-lg border border-emerald-500/10">
                   <Gift className="h-3 w-3" />
                   تم استلام البونص مع القائمة
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground font-bold">صور الفاتورة</Label>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
            <AnimatePresence>
              {images.map((img, index) => (
                <motion.div 
                  key={img.preview} 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="group relative aspect-square rounded-xl overflow-hidden border border-border"
                >
                  <img src={img.preview} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <AlertCircle className="h-3 w-3 rotate-45" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            <button
              type="button"
              onClick={() => document.getElementById('inv-images-input')?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:bg-muted/50 transition-all text-muted-foreground hover:text-primary"
            >
              <Upload className="h-6 w-6" />
              <span className="text-[10px] font-bold text-center px-1">إضافة صور</span>
            </button>
          </div>
          <input 
            id="inv-images-input"
            type="file" 
            className="hidden" 
            onChange={handleImagesSelect}
            accept="image/*"
            multiple
          />
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground font-bold text-xs uppercase">ملاحظات إضافية</Label>
          <Input 
            name="notes" 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ملاحظات على هذه القائمة..." 
            className="bg-muted border-border text-foreground rounded-xl h-11" 
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="flex-1 font-black text-xl h-14 rounded-2xl shadow-xl transition-all bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
        >
          {isSubmitting ? 'جاري الحفظ...' : (initialData ? 'حفظ التعديلات' : 'حفظ الفاتورة')}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={onClose}
          className="px-8 font-bold h-14 rounded-2xl border-border hover:bg-muted"
        >
          إلغاء
        </Button>
      </div>
    </form>
  );
};
