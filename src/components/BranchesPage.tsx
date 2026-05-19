import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  Archive, 
  MapPin, 
  Phone, 
  ArrowRightLeft,
  LayoutDashboard,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { BranchForm } from './BranchForm';
import type { PharmacyBranch } from '../db';
import { safeFormatDate } from '../lib/formatters';

interface BranchesPageProps {
  branches: PharmacyBranch[];
  currentBranchId: string | null;
  onSelectBranch: (id: string | null) => void;
  onAddBranch: (data: Partial<PharmacyBranch>) => void;
  onUpdateBranch: (id: string, data: Partial<PharmacyBranch>) => void;
  onDeleteBranch: (id: string) => void;
  onArchiveBranch: (id: string) => void;
}

export const BranchesPage = ({
  branches,
  currentBranchId,
  onSelectBranch,
  onAddBranch,
  onUpdateBranch,
  onDeleteBranch,
  onArchiveBranch
}: BranchesPageProps) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<PharmacyBranch | null>(null);

  const activeBranches = branches.filter(b => b.status === 'active');
    const archivedBranches = branches.filter(b => b.status === 'archived');
  const otherBranches = branches.filter(b => b.status !== 'archived');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="text-[10px] font-black text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">فعال</span>;
      case 'pending':
        return <span className="text-[10px] font-black text-amber-600 bg-amber-500/10 px-2 py-1 rounded-full border border-amber-500/20">معلق</span>;
      case 'inactive':
        return <span className="text-[10px] font-black text-rose-600 bg-rose-500/10 px-2 py-1 rounded-full border border-rose-500/20">غير مفعل</span>;
      default:
        return <span className="text-[10px] font-black text-slate-600 bg-slate-500/10 px-2 py-1 rounded-full border border-slate-500/20">مؤرشف</span>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1 text-right">
          <h1 className="text-3xl font-black tracking-tighter text-foreground flex items-center justify-end gap-3">
            إدارة الصيدليات والفروع
            <Building2 className="h-8 w-8 text-primary" />
          </h1>
          <p className="text-muted-foreground font-bold text-sm">إدارة فروع المؤسسة والتبديل بينها - نظام Enterprise</p>
        </div>
        <Button 
          className="rounded-xl font-black bg-primary text-primary-foreground h-12 px-6 gap-2 shadow-lg shadow-primary/20"
          onClick={() => setIsAddOpen(true)}
        >
          <Plus className="h-5 w-5" />
          تسجيل فرع جديد
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Master Vision Card */}
        <Card 
          className={`bg-card border-border rounded-3xl overflow-hidden shadow-sm transition-all border-2 ${
            currentBranchId === null ? 'border-primary ring-4 ring-primary/10' : 'border-transparent'
          }`}
        >
          <CardContent className="p-0">
             <button 
              onClick={() => onSelectBranch(null)}
              className="w-full p-6 text-right space-y-4 group"
             >
                <div className="flex justify-between items-start">
                   <div className="p-3 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                      <LayoutDashboard className="h-6 w-6" />
                   </div>
                   {currentBranchId === null && (
                     <span className="flex items-center gap-1 text-[10px] font-black text-primary bg-primary/10 px-2 py-1 rounded-full uppercase">
                       المعرض حالياً
                       <CheckCircle2 className="h-3 w-3" />
                     </span>
                   )}
                </div>
                <div className="space-y-1">
                   <h3 className="text-xl font-black text-foreground">العرض الموحد</h3>
                   <p className="text-xs text-muted-foreground font-bold">عرض إحصائيات مجمعة لكل الفروع</p>
                </div>
                <div className="pt-4 flex justify-end">
                   <span className="text-[10px] font-black text-primary flex items-center gap-2 group-hover:gap-4 transition-all">
                      اذهب للوحة الشاملة
                      <ArrowRightLeft className="h-4 w-4" />
                   </span>
                </div>
             </button>
          </CardContent>
        </Card>

        {otherBranches.map((branch) => (
          <Card 
            key={branch.id} 
            className={`bg-card border-border rounded-3xl overflow-hidden shadow-sm transition-all border-2 ${
              currentBranchId === branch.id ? 'border-primary ring-4 ring-primary/10' : 'border-transparent'
            } ${branch.status === 'inactive' ? 'opacity-70' : ''}`}
          >
            <CardContent className="p-0">
              <div className="p-6 text-right space-y-4">
                <div className="flex justify-between items-start">
                  <DropdownActions 
                    status={branch.status}
                    onEdit={() => {
                      setEditingBranch(branch);
                      setIsAddOpen(true);
                    }}
                    onDelete={() => onDeleteBranch(branch.id!)}
                    onArchive={() => onArchiveBranch(branch.id!)}
                    onToggleStatus={() => {
                        if (branch.status === 'pending') {
                            const code = window.prompt('يرجى إدخال كود التفعيل لتنشيط الفرع:');
                            if (code) {
                                onUpdateBranch(branch.id!, { status: 'active', activationCode: code });
                            }
                        } else {
                            const nextStatus = branch.status === 'active' ? 'inactive' : 'active';
                            onUpdateBranch(branch.id!, { status: nextStatus });
                        }
                    }}
                  />
                  <div className="flex flex-col items-end gap-2">
                     <div className={`p-3 rounded-2xl ${branch.isMain ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600'}`}>
                        <Building2 className="h-6 w-6" />
                     </div>
                     <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-mono font-black text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
                            {branch.code}
                        </span>
                        {branch.isMain && (
                          <span className="flex items-center gap-1 text-[8px] font-black text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 uppercase">
                            الفرع الرئيسي
                          </span>
                        )}
                     </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => onSelectBranch(branch.id!)}
                  className="w-full text-right block group"
                  disabled={branch.status === 'inactive' || branch.status === 'pending'}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-end gap-2">
                       {getStatusBadge(branch.status)}
                       <h3 className="text-xl font-black text-foreground group-hover:text-primary transition-colors">{branch.name}</h3>
                    </div>
                    <div className="text-[10px] font-bold text-muted-foreground">صيدلية: {branch.pharmacyName}</div>
                    <div className="flex items-center justify-end gap-2 text-[10px] font-bold text-muted-foreground">
                      <span>{branch.city} - {branch.managerName}</span>
                      <MapPin className="h-3 w-3" />
                    </div>
                  </div>
                </button>

                <div className="pt-4 border-t border-border flex justify-between items-center">
                   <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span className="text-[10px] font-mono font-bold">{branch.phone}</span>
                   </div>
                   {currentBranchId === branch.id ? (
                      <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full uppercase">
                        الفرع الحالي
                      </span>
                   ) : (
                      <button 
                        onClick={() => onSelectBranch(branch.id!)}
                        disabled={branch.status === 'inactive' || branch.status === 'pending'}
                        className={`text-[10px] font-black transition-colors ${
                            (branch.status === 'inactive' || branch.status === 'pending') 
                            ? 'text-muted-foreground cursor-not-allowed' 
                            : 'text-muted-foreground hover:text-primary'
                        }`}
                      >
                        {branch.status === 'pending' ? 'بانتظار التفعيل' : 'تبديل لهذا الفرع'}
                      </button>
                   )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {archivedBranches.length > 0 && (
        <div className="space-y-4">
           <h2 className="text-lg font-black text-muted-foreground mr-1">الفروع المؤرشفة</h2>
           <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
             {archivedBranches.map((branch) => (
                <Card key={branch.id} className="bg-muted/50 border-border rounded-3xl overflow-hidden shadow-sm">
                   <CardContent className="p-6 text-right flex justify-between items-center">
                      <Button 
                        variant="ghost" 
                        className="text-xs font-black text-emerald-600 h-8 gap-2"
                        onClick={() => onUpdateBranch(branch.id!, { status: 'active' })}
                      >
                         <CheckCircle2 className="h-4 w-4" />
                         استعادة
                      </Button>
                      <div className="space-y-1">
                         <div className="flex items-center justify-end gap-2">
                             <span className="text-[10px] font-mono text-muted-foreground">{branch.code}</span>
                             <h4 className="font-black text-foreground">{branch.name}</h4>
                         </div>
                         <p className="text-[10px] font-bold text-muted-foreground">تاريخ الأرشفة: {safeFormatDate(branch.createdAt, 'yyyy/MM/dd')}</p>
                      </div>
                   </CardContent>
                </Card>
             ))}
           </div>
        </div>
      )}

      {/* Form Modal */}
      <Dialog 
        open={isAddOpen} 
        onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) setEditingBranch(null);
        }}
      >
        <DialogContent className="sm:max-w-[600px] bg-card border-border rounded-3xl p-8 max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <Building2 className="h-6 w-6 text-primary" />
              {editingBranch ? 'تعديل بيانات الفرع' : 'تسجيل فرع صيدلية جديد'}
            </DialogTitle>
            <DialogDescription className="text-right font-bold">
                أدخل تفاصيل الفرع الجديد للنظام. سيتم إنشاء رمز فريد وبيئة مالية مستقلة.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6">
            <BranchForm 
              initialData={editingBranch || undefined}
              onClose={() => setIsAddOpen(false)}
              onSubmit={(data) => {
                if (editingBranch) {
                  onUpdateBranch(editingBranch.id!, data);
                } else {
                  onAddBranch(data);
                }
                setIsAddOpen(false);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DropdownActions = ({ 
    status,
    onEdit, 
    onDelete, 
    onArchive,
    onToggleStatus
}: { 
    status: string;
    onEdit: () => void; 
    onDelete: () => void; 
    onArchive: () => void;
    onToggleStatus: () => void;
}) => {
  return (
    <div className="flex gap-1">
       <Button 
         variant="ghost" 
         size="icon" 
         className="h-8 w-8 rounded-lg hover:bg-white/10" 
         onClick={onToggleStatus}
         title={status === 'active' ? 'تعطيل' : 'تفعيل'}
       >
          <CheckCircle2 className={`h-4 w-4 ${status === 'active' ? 'text-emerald-500' : 'text-slate-400'}`} />
       </Button>
       <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white/10" onClick={onEdit}>
          <Edit className="h-4 w-4 text-blue-500" />
       </Button>
       <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white/10" onClick={onArchive}>
          <Archive className="h-4 w-4 text-amber-500" />
       </Button>
       <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white/10" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-rose-500" />
       </Button>
    </div>
  );
};
