import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MoreVertical,
  Edit,
  Trash2,
  DollarSign,
  Filter,
  ArrowLeft,
  Info,
  History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  formatNumberWithCommas, 
  safeFormatDate, 
  toValidDate 
} from '../lib/formatters';
import { Deadline, LedgerEntry, Entity, PharmacyBranch } from '../db';
import { motion, AnimatePresence } from 'framer-motion';
import { isSameDay, isBefore, isAfter, startOfDay, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

interface PaymentDeadlinesPageProps {
  deadlines: Deadline[];
  entities: Entity[];
  allLedgerEntries: LedgerEntry[];
  branches: PharmacyBranch[];
  currentBranchId: string | null;
  currentCash: number;
  onAdd: () => void;
  onEdit: (deadline: Deadline) => void;
  onDelete: (id: string) => void;
  onPayNow: (deadline: Deadline) => void;
}

export const PaymentDeadlinesPage = ({
  deadlines,
  entities,
  allLedgerEntries,
  branches,
  currentBranchId,
  currentCash,
  onAdd,
  onEdit,
  onDelete,
  onPayNow
}: PaymentDeadlinesPageProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'today' | 'overdue' | 'paid'>('all');
  const [readinessFilter, setReadinessFilter] = useState<'today' | '3days' | 'week' | 'month' | 'all'>('all');

  const now = startOfDay(new Date());

  const processedDeadlines = useMemo(() => {
    let filtered = deadlines.filter(d => 
      !currentBranchId || currentBranchId === 'all' || d.branchId === currentBranchId
    );

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(d => 
        d.accountName.toLowerCase().includes(s) || 
        d.invoiceNumber.toLowerCase().includes(s)
      );
    }

    return filtered.map(d => {
      const dueDate = startOfDay(toValidDate(d.dueDate));
      let logicalStatus: 'paid' | 'today' | 'overdue' | 'upcoming' = 'upcoming';

      if (d.status === 'paid') {
        logicalStatus = 'paid';
      } else if (isSameDay(dueDate, now)) {
        logicalStatus = 'today';
      } else if (isBefore(dueDate, now)) {
        logicalStatus = 'overdue';
      }

      return { ...d, logicalStatus };
    }).filter(d => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'pending') return d.status === 'pending';
      if (statusFilter === 'today') return d.logicalStatus === 'today';
      if (statusFilter === 'overdue') return d.logicalStatus === 'overdue';
      if (statusFilter === 'paid') return d.status === 'paid';
      return true;
    }).sort((a, b) => {
      if (a.status === 'paid' && b.status !== 'paid') return 1;
      if (a.status !== 'paid' && b.status === 'paid') return -1;
      return toValidDate(a.dueDate).getTime() - toValidDate(b.dueDate).getTime();
    });
  }, [deadlines, currentBranchId, searchTerm, statusFilter, now]);

  const readinessStats = useMemo(() => {
    const pendingDeadlines = deadlines.filter(d => 
      d.status === 'pending' && 
      (!currentBranchId || currentBranchId === 'all' || d.branchId === currentBranchId)
    );

    let filtered = pendingDeadlines;
    const today = startOfDay(new Date());

    if (readinessFilter === 'today') {
      filtered = pendingDeadlines.filter(d => isSameDay(toValidDate(d.dueDate), today));
    } else if (readinessFilter === '3days') {
      const limit = addDays(today, 3);
      filtered = pendingDeadlines.filter(d => {
        const date = toValidDate(d.dueDate);
        return isSameDay(date, today) || (isAfter(date, today) && isBefore(date, addDays(limit, 1)));
      });
    } else if (readinessFilter === 'week') {
      const start = startOfWeek(today, { weekStartsOn: 6 }); // Assuming Saturday start
      const end = endOfWeek(today, { weekStartsOn: 6 });
      filtered = pendingDeadlines.filter(d => {
        const date = toValidDate(d.dueDate);
        return isAfter(date, addDays(start, -1)) && isBefore(date, addDays(end, 1));
      });
    } else if (readinessFilter === 'month') {
      const start = startOfMonth(today);
      const end = endOfMonth(today);
      filtered = pendingDeadlines.filter(d => {
        const date = toValidDate(d.dueDate);
        return isAfter(date, addDays(start, -1)) && isBefore(date, addDays(end, 1));
      });
    }

    const totalDue = filtered.reduce((sum, d) => sum + (d.requiredPayment || 0), 0);
    const difference = currentCash - totalDue;
    const isSufficient = difference >= 0;

    return { totalDue, difference, isSufficient };
  }, [deadlines, currentCash, readinessFilter, currentBranchId]);

  const stats = useMemo(() => {
    const pending = deadlines.filter(d => d.status === 'pending');
    return {
      total: pending.reduce((sum, d) => sum + (d.requiredPayment || 0), 0),
      today: processedDeadlines.filter(d => d.logicalStatus === 'today' && d.status === 'pending').length,
      overdue: processedDeadlines.filter(d => d.logicalStatus === 'overdue' && d.status === 'pending').length,
      upcoming: processedDeadlines.filter(d => d.logicalStatus === 'upcoming' && d.status === 'pending').length,
    };
  }, [deadlines, processedDeadlines]);

  const getStatusBadge = (status: string, logical: string) => {
    if (status === 'paid') return <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-black">تم التسديد</span>;
    if (logical === 'today') return <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 text-[10px] font-black">يستحق اليوم</span>;
    if (logical === 'overdue') return <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 text-[10px] font-black">متأخر</span>;
    return <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-black">قادم</span>;
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-foreground flex items-center gap-3">
            <Calendar className="h-6 w-6 text-primary" />
            مواعيد التسديد
          </h2>
          <p className="text-muted-foreground text-sm font-bold mt-1">إدارة جدولة تسديد القوائم والديون القادمة.</p>
        </div>
        <Button 
          onClick={onAdd}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-black h-12 px-6 rounded-xl shadow-lg shadow-primary/20 gap-2"
        >
          <Plus className="h-5 w-5" />
          إضافة موعد تسديد
        </Button>
      </div>

      {/* Cash Flow Readiness Card */}
      <Card className="bg-card border-border shadow-md overflow-hidden rounded-3xl border-r-8 border-r-primary">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">
            <div className="flex-1 p-6 border-b md:border-b-0 md:border-l border-border/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <h3 className="font-black text-lg">جاهزية التسديد</h3>
                </div>
                
                <div className="flex bg-muted/50 p-1 rounded-xl border border-border">
                  {[
                    { id: 'today', label: 'اليوم' },
                    { id: '3days', label: '3 أيام' },
                    { id: 'week', label: 'أسبوع' },
                    { id: 'month', label: 'شهر' },
                    { id: 'all', label: 'الكل' }
                  ].map(f => (
                    <button 
                      key={f.id}
                      onClick={() => setReadinessFilter(f.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${readinessFilter === f.id ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:bg-background/40'}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <div className="text-[10px] font-black text-muted-foreground uppercase mb-1">الرصيد النقدي الحالي</div>
                  <div className="text-xl font-black text-foreground font-mono tracking-tighter">{formatNumberWithCommas(currentCash)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-black text-muted-foreground uppercase mb-1">إجمالي المبالغ المطلوبة للتسديد</div>
                  <div className="text-xl font-black text-rose-600 font-mono tracking-tighter">{formatNumberWithCommas(readinessStats.totalDue)}</div>
                </div>
                <div className="col-span-2 lg:col-span-1 border-t lg:border-t-0 lg:border-r border-border/50 pt-4 lg:pt-0 lg:pr-6">
                  <div className="text-[10px] font-black text-muted-foreground uppercase mb-1">الفرق</div>
                  <div className={`text-xl font-black font-mono tracking-tighter ${readinessStats.isSufficient ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatNumberWithCommas(Math.abs(readinessStats.difference))}
                    <span className="text-xs mr-1">{readinessStats.isSufficient ? '(فائض)' : '(عجز)'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className={`w-full md:w-64 p-6 flex flex-col items-center justify-center text-center gap-3 ${readinessStats.isSufficient ? 'bg-emerald-500/5' : 'bg-rose-500/5'}`}>
              <div className="text-[10px] font-black text-muted-foreground uppercase mb-1">الحالة</div>
              <div className={`p-4 rounded-full ${readinessStats.isSufficient ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                {readinessStats.isSufficient ? <CheckCircle2 className="h-10 w-10" /> : <AlertCircle className="h-10 w-10" />}
              </div>
              <div>
                <div className={`text-sm font-black ${readinessStats.isSufficient ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {readinessStats.isSufficient ? 'الكاش يكفي للتسديد' : `يوجد عجز بقيمة: ${formatNumberWithCommas(Math.abs(readinessStats.difference))}`}
                </div>
                <p className="text-[10px] text-muted-foreground font-bold mt-1">بناءً على الفلتر المختار</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-sm overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 blur-2xl rounded-full" />
          <CardContent className="p-4">
            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">المبلغ المطلوب تسديده</div>
            <div className="text-xl font-black text-blue-600 font-mono tracking-tighter">{formatNumberWithCommas(stats.total)}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 blur-2xl rounded-full" />
          <CardContent className="p-4">
            <div className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">يستحق اليوم</div>
            <div className="text-2xl font-black text-foreground">{stats.today} <span className="text-[10px] text-muted-foreground font-bold italic">موعد</span></div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 blur-2xl rounded-full" />
          <CardContent className="p-4">
            <div className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">متأخر عن الموعد</div>
            <div className="text-2xl font-black text-rose-600">{stats.overdue} <span className="text-[10px] text-muted-foreground font-bold italic">موعد</span></div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 blur-2xl rounded-full" />
          <CardContent className="p-4">
            <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">قادم قريباً</div>
            <div className="text-2xl font-black text-foreground">{stats.upcoming} <span className="text-[10px] text-muted-foreground font-bold italic">موعد</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-card/40 border border-border p-4 rounded-2xl shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث باسم المورد أو رقم القائمة..." 
            className="bg-background border-border pr-10 h-11 rounded-xl text-sm font-bold"
          />
        </div>
        <div className="flex bg-muted/50 p-1 rounded-xl border border-border w-full md:w-auto">
          <button 
            onClick={() => setStatusFilter('all')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all ${statusFilter === 'all' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:bg-background/40'}`}
          >الكل</button>
          <button 
            onClick={() => setStatusFilter('pending')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all ${statusFilter === 'pending' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:bg-background/40'}`}
          >المعلّقة</button>
          <button 
            onClick={() => setStatusFilter('overdue')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all ${statusFilter === 'overdue' ? 'bg-background text-rose-500 shadow-sm' : 'text-muted-foreground hover:bg-background/40'}`}
          >المتأخرة</button>
          <button 
            onClick={() => setStatusFilter('paid')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all ${statusFilter === 'paid' ? 'bg-background text-emerald-600 shadow-sm' : 'text-muted-foreground hover:bg-background/40'}`}
          >تم تسديدها</button>
        </div>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 gap-4">
        {processedDeadlines.length > 0 ? (
          processedDeadlines.map((deadline) => (
            <motion.div
              layout
              key={deadline.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-card border-border border rounded-2xl overflow-hidden hover:shadow-lg transition-all group ${deadline.status === 'paid' ? 'opacity-70 grayscale-[0.3]' : ''}`}
            >
              <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-2xl shrink-0 ${
                    deadline.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600' :
                    deadline.logicalStatus === 'overdue' ? 'bg-rose-500/10 text-rose-600' :
                    deadline.logicalStatus === 'today' ? 'bg-blue-500/10 text-blue-600' : 'bg-amber-500/10 text-amber-600'
                  }`}>
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-black text-lg text-foreground">{deadline.accountName}</h4>
                      {getStatusBadge(deadline.status, deadline.logicalStatus)}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        قائمة: <span className="text-foreground">{deadline.invoiceNumber}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        بتاريخ: <span className="text-foreground font-mono">{safeFormatDate(toValidDate(deadline.dueDate), 'yyyy/MM/dd')}</span>
                      </div>
                      {deadline.notes && (
                         <div className="flex items-center gap-1 italic text-[11px] opacity-70">
                            <Info className="h-3.5 w-3.5" />
                            <span>{deadline.notes}</span>
                         </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-12 bg-muted/30 md:bg-transparent p-4 md:p-0 rounded-xl">
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground font-black uppercase mb-1">المبلغ المتبقي</div>
                    <div className="text-lg font-black text-rose-600 font-mono tracking-tighter">{formatNumberWithCommas(deadline.amount)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground font-black uppercase mb-1">تأثيره على الكاش</div>
                    <div className="text-sm font-black text-muted-foreground font-mono italic">-{formatNumberWithCommas(deadline.requiredPayment)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-primary font-black uppercase mb-1">المتوقع تسديده</div>
                    <div className="text-xl font-black text-primary font-mono tracking-tighter">{formatNumberWithCommas(deadline.requiredPayment)}</div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {deadline.status !== 'paid' && (
                      <Button 
                        size="sm"
                        onClick={() => onPayNow(deadline)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black h-10 rounded-xl px-4 gap-2 shadow-sm"
                      >
                        <DollarSign className="h-4 w-4" />
                        تسديد الآن
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-10 w-10 flex items-center justify-center text-muted-foreground hover:bg-muted rounded-xl transition-colors outline-none">
                        <MoreVertical className="h-5 w-5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card border-border rounded-xl p-1 w-48 shadow-2xl">
                        <DropdownMenuItem 
                          onClick={() => onEdit(deadline)}
                          className="gap-3 p-3 cursor-pointer hover:bg-muted rounded-lg font-bold"
                        >
                          <Edit className="h-4 w-4 text-blue-500" />
                          <span>تعديل الموعد</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDelete(deadline.id!)}
                          className="gap-3 p-3 cursor-pointer hover:bg-muted rounded-lg font-bold text-rose-500"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>حذف الموعد</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="py-24 text-center text-muted-foreground bg-card/40 border-2 border-dashed border-border rounded-3xl flex flex-col items-center">
            <div className="bg-muted p-6 rounded-full mb-4">
              <History className="h-10 w-10 opacity-40 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-black text-foreground">لا توجد مواعيد تسديد مجدولة</h3>
            <p className="text-sm font-bold text-muted-foreground mt-2 max-w-md mx-auto">
              {searchTerm ? 'لم نجد أي مواعيد تطابق بحثك الحالي.' : 'قم بإضافة مواعيد تسديد للقوائم الآجلة لتتمكن من متابعتها لاحقاً.'}
            </p>
            {searchTerm && (
              <Button variant="ghost" onClick={() => setSearchTerm('')} className="mt-4 text-primary font-bold">إلغاء البحث</Button>
            )}
            {!searchTerm && (
               <Button variant="outline" onClick={onAdd} className="mt-6 font-black border-primary/20 text-primary hover:bg-primary/5 h-11 rounded-xl">إضافة أول موعد</Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const FileText = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>;
