import React from 'react';
import { 
  Building2, 
  Phone, 
  MapPin, 
  Info,
  DollarSign,
  Image as ImageIcon,
  X
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
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { parseFormattedNumber, SUPPLIER_TYPE_MAPPING, safeFormatDate } from '@/src/lib/formatters';
import { ImageCapture } from './ImageCapture';

interface EntityFormProps {
  onSubmit: (data: any) => Promise<string | void>;
  onClose: () => void;
  entity?: any;
  onImagesChange?: (files: File[]) => void;
}

export const EntityForm = ({ onSubmit, onClose, entity, onImagesChange }: EntityFormProps) => {
  const [imageFiles, setImageFiles] = React.useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  const removeImage = (index: number) => {
    const updated = imageFiles.filter((_, i) => i !== index);
    setImageFiles(updated);
    if (onImagesChange) onImagesChange(updated);
  };

  const handleImageCaptured = (file: File) => {
    const updated = [...imageFiles, file];
    setImageFiles(updated);
    if (onImagesChange) onImagesChange(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());
    
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...data,
        initialBalance: parseFormattedNumber(data.initialBalance as string || entity?.initialBalance?.toString() || '0'),
        initialBalanceDate: data.initialBalanceDate ? new Date(data.initialBalanceDate as string) : new Date(),
        initialBalanceNotes: data.initialBalanceNotes as string || '',
        limit: parseFormattedNumber(data.limit as string || entity?.limit?.toString() || '0'),
        updatedAt: new Date()
      });
      
      // Reset form on success
      if (!entity) {
        formRef.current?.reset();
        setImageFiles([]);
        if (onImagesChange) onImagesChange([]);
      }

      // Automatically close the dialog on success
      if (onClose) {
        onClose();
        // Give a small delay to ensure any parent state updates complete
        setTimeout(() => {
           if (onClose) onClose(); 
        }, 100);
      }
    } catch (error) {
      console.error("EntityForm submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-6">
        {/* Name: Full Width on top */}
        <div className="space-y-2 p-5 bg-muted/20 border border-border rounded-2xl">
          <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest block mb-2">اسم المورد أو المكتب العلمي الكامل</Label>
          <div className="relative group">
             <div className="absolute inset-0 bg-primary/5 blur-xl group-hover:blur-2xl transition-all rounded-full opacity-0 group-hover:opacity-100" />
            <Input 
              name="name" 
              required 
              defaultValue={entity?.name}
              placeholder="مثلاً: شركة التفاح لتجارة الأدوية" 
              className="bg-muted border-border text-foreground h-16 rounded-2xl pr-12 font-black text-xl relative z-10 shadow-sm transition-all focus:h-18" 
            />
            <Building2 className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-primary relative z-20" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest text-right block">تصنيف المنشأة</Label>
            <Select name="type" defaultValue={entity?.type || "office"}>
              <SelectTrigger className="bg-muted border-border text-foreground h-14 rounded-xl font-black text-lg shadow-sm w-full text-right px-4">
                <SelectValue placeholder="اختر النوع" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground" align="end">
                {Object.entries(SUPPLIER_TYPE_MAPPING).map(([value, label]) => (
                  <SelectItem key={value} value={value} className="py-4 font-bold text-right cursor-pointer hover:bg-primary/10 transition-colors">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
              <Phone className="h-3 w-3" />
              أرقام التواصل والتلفون
            </Label>
            <Input 
              name="phone" 
              defaultValue={entity?.phone}
              placeholder="07xx xxx xxxx" 
              className="bg-muted border-border text-foreground h-14 rounded-xl font-mono text-lg font-bold shadow-sm" 
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest text-right block">حالة الحساب</Label>
          <Select name="status" defaultValue={entity?.status || "نشط"}>
            <SelectTrigger className="bg-muted border-border text-foreground h-14 rounded-xl font-black text-lg shadow-sm w-full text-right px-4">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground" align="end">
              <SelectItem value="نشط" className="py-4 font-bold text-right cursor-pointer hover:bg-emerald-500/10 transition-colors">نشط (فعال)</SelectItem>
              <SelectItem value="مؤرشف" className="py-4 font-bold text-right cursor-pointer hover:bg-slate-500/10 transition-colors">مؤرشف</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-card border border-border rounded-2xl shadow-inner group">
          <div className="space-y-4 col-span-1 md:col-span-2">
             <div className="flex items-center gap-2 mb-2">
               <DollarSign className="h-5 w-5 text-emerald-600" />
               <h3 className="font-black text-emerald-600 text-sm">بيانات الرصيد الافتتاحي</h3>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                  <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">المبلغ المتبقي بذمتك للمورد حالياً</Label>
                  <CurrencyInput 
                    name="initialBalance" 
                    defaultValue={entity?.initialBalance || 0} 
                    className="bg-muted border-emerald-500/20 text-emerald-600 h-14 rounded-xl font-mono text-xl font-black shadow-sm" 
                  />
               </div>
               <div className="space-y-2">
                  <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">تاريخ هذا الرصيد</Label>
                  <Input 
                    name="initialBalanceDate" 
                    type="date"
                    defaultValue={safeFormatDate(entity?.initialBalanceDate || new Date(), 'yyyy-MM-dd', { useAr: false })}
                    className="bg-muted border-border text-foreground h-14 rounded-xl font-bold"
                  />
               </div>
             </div>
             <div className="space-y-2">
                <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">ملاحظات الرصيد الافتتاحي</Label>
                <Input 
                  name="initialBalanceNotes"
                  defaultValue={entity?.initialBalanceNotes}
                  placeholder="مثلاً: رصيد مرحل من الدفاتر القديمة..."
                  className="bg-muted border-border text-foreground h-12 rounded-xl font-bold"
                />
             </div>
          </div>
          
          <div className="space-y-2 col-span-1 md:col-span-2 pt-4 border-t border-border/50">
            <Label className="text-rose-500 font-black text-[10px] uppercase tracking-widest">تحذير سقف الدين (الحد الائتماني)</Label>
            <CurrencyInput 
              name="limit" 
              defaultValue={entity?.limit || 0} 
              className="bg-muted border-rose-500/20 text-rose-500 h-14 rounded-xl font-mono text-xl font-black shadow-sm" 
            />
          </div>
        </div>

        <div className="space-y-4">
           <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              صور المرفقات أو عقد التوريد
           </Label>
           
           <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
             {imageFiles.map((file, index) => (
               <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-border group">
                 <img 
                   src={URL.createObjectURL(file)} 
                   alt={`Attachment ${index + 1}`} 
                   className="w-full h-full object-cover" 
                 />
                 <button
                   type="button"
                   onClick={() => removeImage(index)}
                   className="absolute top-1 right-1 bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                 >
                   <X className="h-3 w-3" />
                 </button>
               </div>
             ))}
             
             {imageFiles.length < 3 && (
               <ImageCapture 
                 id="entity-image-upload"
                 label=""
                 onImageCaptured={handleImageCaptured}
                 renderTrigger={(open) => (
                   <button
                     type="button"
                     onClick={open}
                     className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-all text-muted-foreground hover:text-primary"
                   >
                     <ImageIcon className="h-6 w-6" />
                     <span className="text-[10px] font-bold">إضافة صورة</span>
                   </button>
                 )}
               />
             )}
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
              <MapPin className="h-3 w-3" />
              الموقع الجغرافي / العنوان
            </Label>
            <Input 
              name="address" 
              defaultValue={entity?.address}
              placeholder="مثلاً: بغداد - المشتل - مجمع الأدوية" 
              className="bg-muted border-border text-foreground h-14 rounded-xl font-bold font-sm shadow-sm" 
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
              <Info className="h-4 w-4" />
              معلومات إضافية ونبذة
            </Label>
            <Input 
              name="notes" 
              defaultValue={entity?.notes}
              placeholder="ملاحظات حول التعامل أو وقت التجهيز..." 
              className="bg-muted border-border text-foreground rounded-xl h-14 font-bold shadow-sm" 
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-border">
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="flex-3 font-black text-2xl h-16 rounded-3xl shadow-2xl transition-all scale-100 hover:scale-[1.02] active:scale-[0.98] bg-purple-600 hover:bg-purple-700 shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>جاري الحفظ...</span>
            </div>
          ) : (
            entity ? 'تحديث السجل المالي' : 'تأسيس حساب مورد جديد'
          )}
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
