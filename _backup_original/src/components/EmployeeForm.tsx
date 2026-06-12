import React from 'react';
import { User, Phone, Briefcase, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Employee } from '../db';

interface EmployeeFormProps {
  onSubmit: (data: Partial<Employee>) => void;
  onClose: () => void;
  initialData?: Employee;
}

export const EmployeeForm = ({ onSubmit, onClose, initialData }: EmployeeFormProps) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data: Partial<Employee> = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      jobTitle: formData.get('jobTitle') as string,
      notes: formData.get('notes') as string,
    };
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="space-y-4">
            <div className="space-y-2 text-right">
              <Label htmlFor="name" className="text-[10px] font-black text-muted-foreground mr-1 uppercase tracking-widest">الاسم الكامل للموظف</Label>
              <div className="relative group">
                <User className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-all scale-100 group-focus-within:scale-110" />
                <Input
                  id="name"
                  name="name"
                  defaultValue={initialData?.name}
                  required
                  className="pr-12 bg-muted/30 border-border rounded-2xl h-14 focus:ring-2 focus:ring-primary/20 focus:border-primary text-right font-black text-lg transition-all"
                  placeholder="مثلاً: د. أحمد التميمي"
                />
              </div>
            </div>

            <div className="space-y-2 text-right">
              <Label htmlFor="phone" className="text-[10px] font-black text-muted-foreground mr-1 uppercase tracking-widest">رقم الهاتف النشط</Label>
              <div className="relative group">
                <Phone className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-emerald-500 transition-all scale-100 group-focus-within:scale-110" />
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={initialData?.phone}
                  required
                  className="pr-12 bg-muted/30 border-border rounded-2xl h-14 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-right font-mono text-lg font-black tracking-wider transition-all"
                  placeholder="07XXXXXXXXX"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2 text-right">
              <Label htmlFor="jobTitle" className="text-[10px] font-black text-muted-foreground mr-1 uppercase tracking-widest">الوظيفة أو المسمى المهني</Label>
              <div className="relative group">
                <Briefcase className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-blue-500 transition-all scale-100 group-focus-within:scale-110" />
                <Input
                  id="jobTitle"
                  name="jobTitle"
                  defaultValue={initialData?.jobTitle}
                  required
                  className="pr-12 bg-muted/30 border-border rounded-2xl h-14 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-right font-black text-lg transition-all"
                  placeholder="مثلاً: صيدلي مسؤول"
                />
              </div>
            </div>

            <div className="space-y-2 text-right h-full">
              <Label htmlFor="notes" className="text-[10px] font-black text-muted-foreground mr-1 uppercase tracking-widest">ملاحظات وملخص مهني</Label>
              <div className="relative group h-full">
                <FileText className="absolute right-4 top-4 h-5 w-5 text-muted-foreground group-focus-within:text-amber-500 transition-all" />
                <Textarea
                  id="notes"
                  name="notes"
                  defaultValue={initialData?.notes}
                  className="pr-12 bg-muted/30 border-border rounded-2xl min-h-[5.5rem] focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-right font-bold text-sm leading-relaxed transition-all resize-none"
                  placeholder="أدخل أي ملاحظات حول الموظف أو شروط العمل..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-border">
        <Button 
          type="submit" 
          className="flex-3 h-16 rounded-3xl font-black text-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl shadow-primary/20 transition-all scale-100 hover:scale-[1.02] active:scale-[0.98]"
        >
          {initialData ? 'حفظ وتحديث بيانات الموظف' : 'تسجيل وانضمام الموظف'}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={onClose}
          className="flex-1 h-16 px-10 rounded-3xl font-black border-border hover:bg-muted text-lg"
        >
          إلغاء
        </Button>
      </div>
    </form>
  );
};
