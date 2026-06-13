import React, { useState } from 'react';
import { Calendar, Clock, DollarSign, FileText, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Employee, EmployeeAttendance } from '../db';
import { format } from 'date-fns';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { formatIQD, safeFormatDate } from '@/src/lib/formatters';

interface AttendanceFormProps {
  onSubmit: (data: Partial<EmployeeAttendance>) => void;
  onClose: () => void;
  employees: Employee[];
  initialData?: EmployeeAttendance;
}

export const AttendanceForm = ({ onSubmit, onClose, employees, initialData }: AttendanceFormProps) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(initialData?.employeeId || '');
  const [days, setDays] = useState<number>(initialData?.attendanceDays || 0);
  const [dailyHours, setDailyHours] = useState<number>(initialData?.dailyWorkHours || 8);
  const [rate, setRate] = useState<number>(initialData?.hourlyRate || 0);
  const [month, setMonth] = useState<string>(initialData?.month?.toString() || (new Date().getMonth() + 1).toString());
  const [year, setYear] = useState<number>(initialData?.year || new Date().getFullYear());

  const totalMonthlyHours = days * dailyHours;
  const totalWage = totalMonthlyHours * rate;

  const months = [
    { label: 'يناير', value: '1' },
    { label: 'فبراير', value: '2' },
    { label: 'مارس', value: '3' },
    { label: 'أبريل', value: '4' },
    { label: 'مايو', value: '5' },
    { label: 'يونيو', value: '6' },
    { label: 'يوليو', value: '7' },
    { label: 'أغسطس', value: '8' },
    { label: 'سبتمبر', value: '9' },
    { label: 'أكتوبر', value: '10' },
    { label: 'نوفمبر', value: '11' },
    { label: 'ديسمبر', value: '12' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const employee = employees.find(emp => emp.id === selectedEmployeeId);
    
    if (!employee) return;

    if (totalMonthlyHours > 400) {
      if (!window.confirm('عدد الساعات المدخل غير طبيعي (أكثر من 400 ساعة)، هل أنت متأكد من الحفظ؟')) {
        return;
      }
    }

    const data: Partial<EmployeeAttendance> = {
      employeeId: selectedEmployeeId,
      employeeName: employee.name,
      date: new Date(year, Number(month) - 1, 1),
      month: Number(month),
      year: year,
      attendanceDays: days,
      dailyWorkHours: dailyHours,
      hoursWork: totalMonthlyHours,
      hourlyRate: rate,
      dailyWage: totalWage,
      notes: formData.get('notes') as string,
    };
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 text-right">
            <Label className="text-xs font-black text-muted-foreground mr-1">الموظف</Label>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId} disabled={!!initialData}>
              <SelectTrigger className="bg-muted/50 border-border rounded-xl h-12 text-right font-black">
                <div className="flex items-center gap-2 pr-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="اختر الموظف" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground">
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id!} className="text-right flex-row-reverse">
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2 text-right">
              <Label className="text-xs font-black text-muted-foreground mr-1">الشهر</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="bg-muted/50 border-border rounded-xl h-12 text-right font-black">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  {months.map(m => (
                    <SelectItem key={m.value} value={m.value} className="text-right">{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 text-right">
              <Label className="text-xs font-black text-muted-foreground mr-1">السنة</Label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="bg-muted/50 border-border rounded-xl h-12 text-right font-bold"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 text-right">
            <Label htmlFor="attendanceDays" className="text-xs font-black text-muted-foreground mr-1">أيام الحضور</Label>
            <div className="relative group">
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-amber-500 transition-colors" />
              <Input
                id="attendanceDays"
                name="attendanceDays"
                type="number"
                value={days}
                onChange={(e) => setDays(Math.max(0, Number(e.target.value)))}
                min="0"
                required
                className="pr-10 bg-muted/50 border-border rounded-xl h-12 focus:ring-amber-500 focus:border-amber-500 text-right font-mono"
              />
            </div>
          </div>

          <div className="space-y-2 text-right">
            <Label htmlFor="dailyHours" className="text-xs font-black text-muted-foreground mr-1">ساعات العمل اليومية</Label>
            <div className="relative group">
              <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
              <Input
                id="dailyHours"
                name="dailyHours"
                type="number"
                value={dailyHours}
                onChange={(e) => setDailyHours(Math.max(0, Number(e.target.value)))}
                min="0"
                required
                className="pr-10 bg-muted/50 border-border rounded-xl h-12 focus:ring-blue-500 focus:border-blue-500 text-right font-mono"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 text-right">
            <Label htmlFor="hourlyRate" className="text-xs font-black text-muted-foreground mr-1">أجر الساعة (د.ع)</Label>
            <div className="relative group">
              <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-emerald-500 transition-colors" />
              <CurrencyInput
                id="hourlyRate"
                name="hourlyRate"
                value={rate}
                onChange={(val) => setRate(Math.max(0, val))}
                required
                className="pr-10 bg-muted/50 border-border rounded-xl h-12 focus:ring-emerald-500 focus:border-emerald-500 text-right font-mono"
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2 text-right">
            <Label className="text-xs font-black text-muted-foreground mr-1">أجر الشهر الإجمالي</Label>
            <div className="h-12 bg-muted/30 border border-border rounded-xl flex items-center justify-center font-black text-emerald-600 text-lg">
              {formatIQD(totalWage)}
            </div>
          </div>
        </div>

        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 text-center">
            <div className="text-[10px] font-black text-muted-foreground uppercase mb-1">إحصائيات العمل</div>
            <div className="text-sm font-bold text-primary">
                إجمالي ساعات الشهر = {days} أيام × {dailyHours} ساعة = <span className="font-black underline">{totalMonthlyHours} ساعة</span>
            </div>
        </div>

        <div className="space-y-2 text-right">
          <Label htmlFor="notes" className="text-xs font-black text-muted-foreground mr-1">ملاحظات</Label>
          <div className="relative group">
            <FileText className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-amber-500 transition-colors" />
            <Input
              id="notes"
              name="notes"
              defaultValue={initialData?.notes}
              className="pr-10 bg-muted/50 border-border rounded-xl h-12 focus:ring-amber-500 focus:border-amber-500 text-right font-bold"
              placeholder="وصف إضافي..."
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button 
          type="submit" 
          disabled={!selectedEmployeeId}
          className="flex-1 h-12 rounded-xl font-black bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
        >
          {initialData ? 'حفظ التعديلات' : 'تسجيل الحضور'}
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
