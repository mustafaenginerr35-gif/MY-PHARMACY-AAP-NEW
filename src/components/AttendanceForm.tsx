import React, { useState, useEffect } from 'react';
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

  const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId);
  const employeeSalaryType = selectedEmployee?.salaryType || 'hourly';
  const fixedMonthlySalary = selectedEmployee?.fixedMonthlySalary || 0;

  const [amountPaid, setAmountPaid] = useState<number>(() => {
    if (initialData?.amountPaid !== undefined) {
      return initialData.amountPaid;
    }
    return 0;
  });
  const [paymentDate, setPaymentDate] = useState<string>(() => {
    if (initialData?.paymentDate) {
      try {
        const d = new Date(initialData.paymentDate);
        return d.toISOString().split('T')[0];
      } catch (e) {
        return new Date().toISOString().split('T')[0];
      }
    }
    return new Date().toISOString().split('T')[0];
  });
  const [paymentNotes, setPaymentNotes] = useState<string>(initialData?.paymentNotes || '');

  // Keep amountPaid updated with fixedMonthlySalary when employee selection changes and not editing
  useEffect(() => {
    if (!initialData) {
      if (employeeSalaryType === 'lumped') {
        setAmountPaid(fixedMonthlySalary);
      } else {
        setAmountPaid(0);
      }
    }
  }, [selectedEmployeeId, employeeSalaryType, fixedMonthlySalary, initialData]);

  const totalMonthlyHours = employeeSalaryType === 'lumped' ? 0 : days * dailyHours;
  const totalWage = employeeSalaryType === 'lumped' ? fixedMonthlySalary : totalMonthlyHours * rate;

  const remainingWage = Math.max(0, fixedMonthlySalary - amountPaid);

  let calculatedStatus: 'paid' | 'unpaid' | 'partial' = 'unpaid';
  if (employeeSalaryType === 'lumped') {
    if (amountPaid === 0) {
      calculatedStatus = 'unpaid';
    } else if (amountPaid >= fixedMonthlySalary) {
      calculatedStatus = 'paid';
    } else {
      calculatedStatus = 'partial';
    }
  }

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

    if (employeeSalaryType !== 'lumped' && totalMonthlyHours > 400) {
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
      dailyWorkHours: employeeSalaryType === 'lumped' ? 0 : dailyHours,
      hoursWork: employeeSalaryType === 'lumped' ? 0 : totalMonthlyHours,
      hourlyRate: employeeSalaryType === 'lumped' ? 0 : rate,
      dailyWage: employeeSalaryType === 'lumped' ? fixedMonthlySalary : totalWage,
      notes: formData.get('notes') as string,
      salaryType: employeeSalaryType,
      fixedMonthlySalary: employeeSalaryType === 'lumped' ? fixedMonthlySalary : undefined,
      amountPaid: employeeSalaryType === 'lumped' ? amountPaid : undefined,
      amountRemaining: employeeSalaryType === 'lumped' ? remainingWage : undefined,
      paymentDate: employeeSalaryType === 'lumped' ? new Date(paymentDate) : undefined,
      paymentStatus: employeeSalaryType === 'lumped' ? calculatedStatus : undefined,
      paymentNotes: employeeSalaryType === 'lumped' ? paymentNotes : undefined,
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
                    {emp.name} {emp.salaryType === 'lumped' ? '([مقطوعة])' : ''}
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

        {employeeSalaryType === 'lumped' ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 text-right">
                <Label htmlFor="attendanceDays" className="text-xs font-black text-muted-foreground mr-1">أيام الحضور (للمعلومة فقط)</Label>
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
                    className="pr-10 bg-muted/50 border-border rounded-xl h-12 focus:ring-amber-500 focus:border-amber-500 text-right font-mono font-black"
                  />
                </div>
              </div>

              <div className="space-y-2 text-right">
                <Label className="text-xs font-black text-muted-foreground mr-1">الراتب الشهري الثابت</Label>
                <div className="h-12 bg-muted/30 border border-border rounded-xl flex items-center justify-center font-black text-primary text-lg font-mono">
                  {formatIQD(fixedMonthlySalary)}
                </div>
              </div>
            </div>

            <div className="p-5 bg-muted/25 border border-border/70 rounded-2xl space-y-4 text-right">
              <div className="font-black text-sm text-foreground border-b border-border/50 pb-2">صرف الراتب</div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amountPaid" className="text-xs font-black text-muted-foreground mr-1">المبلغ المصروف (د.ع)</Label>
                  <CurrencyInput
                    id="amountPaid"
                    name="amountPaid"
                    value={amountPaid}
                    onChange={(val) => setAmountPaid(Math.min(fixedMonthlySalary, Math.max(0, val)))}
                    required
                    className="bg-muted/50 border-border rounded-xl h-12 focus:ring-emerald-500 focus:border-emerald-500 text-right font-mono font-black text-emerald-600"
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black text-muted-foreground mr-1">المبلغ المتبقي</Label>
                  <div className="h-12 bg-muted/35 border border-border rounded-xl flex items-center justify-center font-black text-rose-500 text-lg font-mono">
                    {formatIQD(remainingWage)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentDate" className="text-xs font-black text-muted-foreground mr-1">تاريخ الصرف</Label>
                  <Input
                    id="paymentDate"
                    name="paymentDate"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                    className="bg-muted/50 border-border rounded-xl h-12 text-right font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black text-muted-foreground mr-1">حالة الراتب</Label>
                  <div className={`h-12 rounded-xl flex items-center justify-center font-black text-sm border ${
                    calculatedStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                    calculatedStatus === 'partial' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                    'bg-rose-500/10 text-rose-600 border-rose-500/20'
                  }`}>
                    {calculatedStatus === 'paid' ? 'مسدد بالكامل' :
                     calculatedStatus === 'partial' ? 'مسدد جزئياً' : 'غير مسدد'}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-right">
                <Label htmlFor="paymentNotes" className="text-xs font-black text-muted-foreground mr-1">ملاحظات الصرف</Label>
                <Input
                  id="paymentNotes"
                  name="paymentNotes"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="bg-muted/50 border-border rounded-xl h-12 text-right font-medium"
                  placeholder="ملاحظات حول طريقة أو تفاصيل عملية الصرف..."
                />
              </div>
            </div>
          </>
        ) : (
          <>
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
          </>
        )}

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
