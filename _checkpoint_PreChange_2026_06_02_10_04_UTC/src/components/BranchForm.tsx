import React from 'react';
import { Building2, MapPin, Phone, FileText, User, Mail, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { PharmacyBranch } from '../db';

interface BranchFormProps {
  onSubmit: (data: Partial<PharmacyBranch>) => void;
  onClose: () => void;
  initialData?: PharmacyBranch;
}

export const BranchForm = ({ onSubmit, onClose, initialData }: BranchFormProps) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data: Partial<PharmacyBranch> = {
      name: formData.get('name') as string,
      pharmacyName: formData.get('pharmacyName') as string,
      managerName: formData.get('managerName') as string,
      phone: formData.get('phone') as string,
      city: formData.get('city') as string,
      email: formData.get('email') as string,
      notes: formData.get('notes') as string,
      activationCode: formData.get('activationCode') as string,
      status: (initialData?.status as any) || 'pending',
      isMain: formData.get('isMain') === 'on',
    };
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 text-right">
            <Label htmlFor="pharmacyName" className="text-xs font-black text-muted-foreground mr-1">اسم الصيدلية</Label>
            <div className="relative group">
              <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                id="pharmacyName"
                name="pharmacyName"
                defaultValue={initialData?.pharmacyName}
                required
                className="pr-10 bg-muted/50 border-border rounded-xl h-12 focus:ring-primary focus:border-primary text-right font-bold"
                placeholder="مثلاً: صيدلية المركز الفرع الرئيسي"
              />
            </div>
          </div>

          <div className="space-y-2 text-right">
            <Label htmlFor="name" className="text-xs font-black text-muted-foreground mr-1">اسم الفرع</Label>
            <div className="relative group">
              <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
              <Input
                id="name"
                name="name"
                defaultValue={initialData?.name}
                required
                className="pr-10 bg-muted/50 border-border rounded-xl h-12 focus:ring-blue-500 focus:border-blue-500 text-right font-bold"
                placeholder="مثلاً: فرع الكرادة"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 text-right">
            <Label htmlFor="managerName" className="text-xs font-black text-muted-foreground mr-1">المدير المسؤول</Label>
            <div className="relative group">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-emerald-500 transition-colors" />
              <Input
                id="managerName"
                name="managerName"
                defaultValue={initialData?.managerName}
                required
                className="pr-10 bg-muted/50 border-border rounded-xl h-12 focus:ring-emerald-500 focus:border-emerald-500 text-right font-bold"
                placeholder="اسم الدكتور / المدير"
              />
            </div>
          </div>

          <div className="space-y-2 text-right">
            <Label htmlFor="city" className="text-xs font-black text-muted-foreground mr-1">المدينة</Label>
            <div className="relative group">
              <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-amber-500 transition-colors" />
              <Input
                id="city"
                name="city"
                defaultValue={initialData?.city}
                required
                className="pr-10 bg-muted/50 border-border rounded-xl h-12 focus:ring-amber-500 focus:border-amber-500 text-right font-bold"
                placeholder="بغداد، البصرة، إلخ..."
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 text-right">
            <Label htmlFor="phone" className="text-xs font-black text-muted-foreground mr-1">رقم الهاتف</Label>
            <div className="relative group">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-indigo-500 transition-colors" />
              <Input
                id="phone"
                name="phone"
                defaultValue={initialData?.phone}
                required
                className="pr-10 bg-muted/50 border-border rounded-xl h-12 focus:ring-indigo-500 focus:border-indigo-500 text-right font-mono"
                placeholder="07XXXXXXXXX"
              />
            </div>
          </div>

          <div className="space-y-2 text-right">
            <Label htmlFor="email" className="text-xs font-black text-muted-foreground mr-1">البريد الإلكتروني (اختياري)</Label>
            <div className="relative group">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-purple-500 transition-colors" />
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={initialData?.email}
                className="pr-10 bg-muted/50 border-border rounded-xl h-12 focus:ring-purple-500 focus:border-purple-500 text-left font-sans"
                placeholder="email@example.com"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10">
          <Label htmlFor="isMain" className="text-sm font-black text-foreground cursor-pointer">هل هذا هو الفرع الرئيسي للمؤسسة؟</Label>
          <input
            type="checkbox"
            id="isMain"
            name="isMain"
            defaultChecked={initialData?.isMain}
            className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
          />
        </div>

        {(!initialData || initialData.status === 'pending') && (
          <div className="space-y-2 text-right border-t border-border pt-4 mt-4">
            <Label htmlFor="activationCode" className="text-xs font-black text-primary mr-1">كود التفعيل (اختياري)</Label>
            <div className="relative group">
              <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60 group-focus-within:text-primary transition-colors" />
              <Input
                id="activationCode"
                name="activationCode"
                defaultValue={initialData?.activationCode}
                className="pr-10 bg-primary/5 border-primary/20 rounded-xl h-12 focus:ring-primary focus:border-primary text-center font-mono tracking-widest"
                placeholder="رمز التفعيل المكون من 6 أرقام"
              />
            </div>
          </div>
        )}

        <div className="space-y-2 text-right">
          <Label htmlFor="notes" className="text-xs font-black text-muted-foreground mr-1">ملاحظات إضافية</Label>
          <div className="relative group">
            <FileText className="absolute right-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-slate-500 transition-colors" />
            <Textarea
              id="notes"
              name="notes"
              defaultValue={initialData?.notes}
              className="pr-10 bg-muted/50 border-border rounded-xl min-h-[100px] focus:ring-slate-500 focus:border-slate-500 text-right font-bold"
              placeholder="أي تفاصيل أخرى تخص الفرع..."
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button 
          type="submit" 
          className="flex-1 h-12 rounded-xl font-black bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
        >
          {initialData ? 'حفظ التعديلات' : 'تسجيل الفرع وتفعيله'}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={onClose}
          className="h-12 px-6 rounded-xl font-black border-border hover:bg-muted"
        >
          إلغاء
        </Button>
      </div>
    </form>
  );
};
