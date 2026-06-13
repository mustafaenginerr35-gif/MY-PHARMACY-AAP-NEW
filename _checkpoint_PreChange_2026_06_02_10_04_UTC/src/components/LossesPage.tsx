import React from 'react';
import { 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Calendar, 
  Package, 
  Hash, 
  DollarSign, 
  FileText,
  Search,
  ChevronLeft,
  Filter,
  MoreVertical,
  Pencil
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatIQD, safeFormatDate, toValidDate } from '../lib/formatters';
import { type ExpiredDamagedLoss } from '../db';

interface LossesPageProps {
  losses: ExpiredDamagedLoss[];
  onAdd: () => void;
  onEdit: (loss: ExpiredDamagedLoss) => void;
  onDelete: (loss: ExpiredDamagedLoss) => void;
  onViewInvoice: (invoiceId: string) => void;
}

export const LossesPage = ({ losses, onAdd, onEdit, onDelete, onViewInvoice }: LossesPageProps) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState<'all' | 'expired' | 'damaged'>('all');

  const filteredLosses = losses
    .filter(l => {
      const matchesSearch = l.itemName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || l.lossType === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => toValidDate(b.date).getTime() - toValidDate(a.date).getTime());

  const totalLossAmount = filteredLosses.reduce((acc, l) => acc + l.totalLoss, 0);
  const expiredCount = filteredLosses.filter(l => l.lossType === 'expired').length;
  const damagedCount = filteredLosses.filter(l => l.lossType === 'damaged').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 md:pb-0 text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-foreground">خسائر التالف والإكسباير</h2>
          <p className="text-muted-foreground text-sm font-bold">تتبع وإدارة المواد منتهية الصلاحية أو المتضررة</p>
        </div>
        <Button 
          onClick={onAdd}
          className="bg-rose-600 hover:bg-rose-700 text-white gap-2 h-14 px-8 rounded-2xl font-black text-lg shadow-lg shadow-rose-500/20"
        >
          <Plus className="h-6 w-6" />
          تسجيل خسارة جديدة
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-border p-6 rounded-2xl flex flex-col items-center text-center">
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl mb-4">
            <Trash2 className="h-6 w-6" />
          </div>
          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">إجمالي الخسائر</div>
          <div className="text-2xl font-black font-mono text-rose-600 tracking-tighter">
            {formatIQD(totalLossAmount)}
          </div>
        </Card>

        <Card className="bg-card border-border p-6 rounded-2xl flex flex-col items-center text-center">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl mb-4">
            <Trash2 className="h-6 w-6" />
          </div>
          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">المواد المنتهية (إكسباير)</div>
          <div className="text-2xl font-black font-mono text-amber-600 tracking-tighter">
            {expiredCount} مادة
          </div>
        </Card>

        <Card className="bg-card border-border p-6 rounded-2xl flex flex-col items-center text-center">
          <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl mb-4">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">المواد التالفة</div>
          <div className="text-2xl font-black font-mono text-orange-600 tracking-tighter">
            {damagedCount} مادة
          </div>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 bg-muted/20 p-4 rounded-2xl border border-border">
        <div className="relative flex-1">
          <Input 
            placeholder="البحث باسم المادة..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-card border-border text-right h-12 rounded-xl pr-10 font-bold" 
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex gap-2 shrink-0">
          {[
            { id: 'all', label: 'الكل', icon: Filter },
            { id: 'expired', label: 'إكسباير', icon: Trash2 },
            { id: 'damaged', label: 'تالف', icon: AlertTriangle },
          ].map(type => (
            <Button
              key={type.id}
              variant={filterType === type.id ? 'default' : 'outline'}
              onClick={() => setFilterType(type.id as any)}
              className={`h-12 px-4 rounded-xl font-bold border-border ${filterType === type.id ? 'bg-primary shadow-md' : 'bg-card'}`}
            >
              <type.icon className="h-4 w-4 ml-2 opacity-70" />
              {type.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Losses List */}
      <Card className="bg-card border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead className="bg-muted/30 text-[10px] font-black text-muted-foreground uppercase border-b border-border">
              <tr>
                <th className="px-6 py-5">المادة</th>
                <th className="px-6 py-5">النوع</th>
                <th className="px-6 py-5">التاريخ</th>
                <th className="px-6 py-5">الكمية</th>
                <th className="px-6 py-5">سعر الشراء</th>
                <th className="px-6 py-5">إجمالي الخسارة</th>
                <th className="px-6 py-5">الارتباط</th>
                <th className="px-6 py-5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredLosses.length > 0 ? (
                filteredLosses.map((loss) => (
                  <tr key={loss.id} className="group hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-5 text-sm font-black text-foreground">{loss.itemName}</td>
                    <td className="px-6 py-5 text-xs font-bold">
                      <span className={`px-2.5 py-1 rounded-full ${
                        loss.lossType === 'expired' 
                        ? 'bg-rose-500/10 text-rose-600' 
                        : 'bg-orange-500/10 text-orange-600'
                      }`}>
                        {loss.lossType === 'expired' ? 'إكسباير' : 'تالف'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm font-mono font-bold text-muted-foreground">
                      {safeFormatDate(loss.date, 'yyyy/MM/dd')}
                    </td>
                    <td className="px-6 py-5 text-sm font-black font-mono">{loss.quantity}</td>
                    <td className="px-6 py-5 text-sm font-bold font-mono text-slate-500">
                      {formatIQD(loss.purchasePrice)}
                    </td>
                    <td className="px-6 py-5 text-lg font-black font-mono text-rose-600 tracking-tighter">
                      {formatIQD(loss.totalLoss)}
                    </td>
                    <td className="px-6 py-5">
                      {loss.invoiceId ? (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => onViewInvoice(loss.invoiceId!)}
                          className="h-8 px-2 text-[10px] gap-1 font-black bg-blue-500/5 text-blue-600 hover:bg-blue-500/10 rounded-lg"
                        >
                          <FileText className="h-3 w-3" />
                          عرض الفاتورة
                        </Button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-bold italic">غير مرتبطة</span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={() => onEdit(loss)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-rose-500 hover:bg-rose-500/10"
                          onClick={() => onDelete(loss)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-24 text-center">
                    <div className="bg-muted w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 opacity-40">
                      <Trash2 className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground font-bold italic">لا توجد سجلات خسائر مطابقة للبحث</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
