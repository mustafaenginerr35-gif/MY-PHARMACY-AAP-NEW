import React from 'react';
import * as XLSX from 'xlsx';
import { 
  FileText, 
  Edit, 
  DollarSign, 
  RefreshCcw, 
  Printer, 
  Trash2, 
  ArrowRight,
  Calendar,
  User,
  CreditCard,
  History,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Info,
  ShieldCheck,
  TrendingDown,
  Gift,
  Receipt,
  X,
  Maximize2,
  Upload,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileDown,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { safeFormatDate, formatIQD } from '../lib/formatters';

import { LedgerEntry, Entity } from '../db';
import { motion, AnimatePresence } from 'motion/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { firebaseService } from '../services/firebaseService';
import { toast } from 'sonner';

interface InvoiceDetailsPageProps {
  invoice: LedgerEntry;
  entity: Entity | null;
  paymentHistory: LedgerEntry[];
  appMode?: 'laptop' | 'mobile';
  onBack: () => void;
  onEdit: (invoice: LedgerEntry) => void;
  onPayment: (invoice: LedgerEntry) => void;
  onRefund: (invoice: LedgerEntry) => void;
  onDelete: (invoice: LedgerEntry) => void;
  onPrint: (invoice: LedgerEntry) => void;
  onUpdateImageUrls?: (invoice: LedgerEntry, imageUrls: string[]) => void;
}

export const InvoiceDetailsPage: React.FC<InvoiceDetailsPageProps> = ({
  invoice,
  entity,
  paymentHistory,
  appMode = 'laptop',
  onBack,
  onEdit,
  onPayment,
  onRefund,
  onDelete,
  onPrint,
  onUpdateImageUrls,
}) => {
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);

  const images = React.useMemo(() => {
    const list = Array.isArray(invoice.imageUrls) ? invoice.imageUrls : [];
    if (list.length === 0 && invoice.imageUrl && typeof invoice.imageUrl === 'string') {
      return [invoice.imageUrl];
    }
    return list;
  }, [invoice.imageUrls, invoice.imageUrl]);

  const receiptImages = React.useMemo(() => {
    const allReceipts: string[] = [];
    if (Array.isArray(paymentHistory)) {
      paymentHistory.forEach(p => {
        if (Array.isArray(p.imageUrls) && p.imageUrls.length > 0) {
          allReceipts.push(...p.imageUrls);
        } else if (p.imageUrl && typeof p.imageUrl === 'string') {
          allReceipts.push(p.imageUrl);
        }
      });
    }
    return allReceipts;
  }, [paymentHistory]);

  const allImagesForLightbox = React.useMemo(() => {
    const safeImages = Array.isArray(images) ? images : [];
    const safeReceipts = Array.isArray(receiptImages) ? receiptImages : [];
    return [...safeImages, ...safeReceipts];
  }, [images, receiptImages]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-black ring-1 ring-emerald-500/20">مسدد بالكامل</span>;
      case 'partial':
        return <span className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-xs font-black ring-1 ring-blue-500/20">مسدد جزئياً</span>;
      case 'overdue':
        return <span className="px-3 py-1 bg-rose-500/10 text-rose-500 rounded-full text-xs font-black ring-1 ring-rose-500/20">متأخر</span>;
      default:
        return <span className="px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-xs font-black ring-1 ring-amber-500/20">غير مسدد</span>;
    }
  };

  const handleImageDelete = async (index: number) => {
    if (onUpdateImageUrls && window.confirm('هل أنت متأكد من حذف هذه الصورة؟')) {
      const urlToDelete = images[index];
      if (urlToDelete.startsWith('http')) {
        await firebaseService.deleteImage(urlToDelete);
      }
      const updated = images.filter((_, i) => i !== index);
      onUpdateImageUrls(invoice, updated);
    }
  };

  const handleImageAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length > 0 && onUpdateImageUrls) {
      setIsUploading(true);
      setUploadProgress(0);
      try {
        const newUrls: string[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const url = await firebaseService.uploadFileWithProgress('invoices', file, (percent) => {
            const overall = ((i * 100) + percent) / files.length;
            setUploadProgress(overall);
          });
          newUrls.push(url);
        }
        onUpdateImageUrls(invoice, [...images, ...newUrls]);
        toast.success(`تم اختيار ورفع ${files.length} صور بنجاح`);
      } catch (err) {
        console.error('Upload failed:', err);
        toast.error('فشل في رفع الصور');
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    }
  };

  const handleImageReplace = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpdateImageUrls) {
      setIsUploading(true);
      setUploadProgress(0);
      try {
        const oldUrl = images[index];
        if (oldUrl.startsWith('http')) {
          await firebaseService.deleteImage(oldUrl);
        }
        const url = await firebaseService.uploadFileWithProgress('invoices', file, setUploadProgress);
        const updated = [...images];
        updated[index] = url;
        onUpdateImageUrls(invoice, updated);
        toast.success('تم استبدال الصورة بنجاح');
      } catch (err) {
        console.error('Replace failed:', err);
        toast.error('فشل في استبدال الصورة');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const isPdf = (url: string) => {
    return (url || '').toLowerCase().includes('.pdf') || (url || '').toLowerCase().includes('application%2fpdf');
  };

  const renderImageContent = (url: string, alt: string) => {
    if (isPdf(url)) {
      return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-slate-100 gap-2">
          <FileText className="h-10 w-10 text-rose-500" />
          <span className="text-[10px] font-bold text-slate-500">ملف PDF</span>
        </div>
      );
    }
    return (
      <img 
        src={url} 
        alt={alt} 
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" 
        referrerPolicy="no-referrer" 
      />
    );
  };

  const handleFullView = (index: number) => {
    const url = allImagesForLightbox[index];
    if (isPdf(url)) {
      window.open(url, '_blank');
    } else {
      setLightboxIndex(index);
    }
  };

  const downloadImage = (url: string, index: number) => {
    const link = document.createElement('a');
    link.href = url;
    const extension = isPdf(url) ? 'pdf' : 'jpg';
    link.download = `attachment-${invoice.invoiceNumber || 'file'}-${index + 1}.${extension}`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    const data = [
      ['تفاصيل الفاتورة', '', ''],
      ['رقم الفاتورة:', invoice.invoiceNumber, ''],
      ['التاريخ:', safeFormatDate(invoice.date, 'yyyy-MM-dd'), ''],
      ['المورد:', invoice.accountName, ''],
      [''],
      ['البند', 'القيمة', 'التفاصيل'],
      ['المبلغ الإجمالي', invoice.amount, formatIQD(invoice.amount)],
      ['الخصم', invoice.discount, invoice.discountType === 'percentage' ? `${invoice.discountValue}%` : 'مبلغ ثابت'],
      ['المبلغ الصافي', invoice.netAmount, formatIQD(invoice.netAmount)],
      ['المسدد', invoice.paidAmount || 0, formatIQD(invoice.paidAmount)],
      ['المتبقي', invoice.remainingAmount || 0, formatIQD(invoice.remainingAmount)],
      [''],
      ['تاريخ الاستحقاق', invoice.dueDate ? safeFormatDate(invoice.dueDate, 'yyyy-MM-dd') : 'لا يوجد', ''],
      ['الحالة', invoice.paymentStatus === 'paid' ? 'مسددة' : invoice.paymentStatus === 'overdue' ? 'متجاوزة للوقت' : 'قيد الانتظار', ''],
      [''],
      ['ملاحظات:', invoice.notes || 'لا يوجد', '']
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "تفاصيل الفاتورة");
    XLSX.writeFile(wb, `Invoice_${invoice.invoiceNumber}.xlsx`);
  };

  const [isExportingPDF, setIsExportingPDF] = React.useState(false);
  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.getElementById('invoice-printable-content');
      if (element) {
        const opt = {
          margin: 0.5,
          filename: `Invoice_${invoice.invoiceNumber}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' as const }
        };
        html2pdf().from(element).set(opt).save();
      }
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const nextImage = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % allImagesForLightbox.length);
    }
  };

  const prevImage = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + allImagesForLightbox.length) % allImagesForLightbox.length);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-10"
      dir="rtl"
    >
      {/* Lightbox Dialog */}
      <Dialog open={lightboxIndex !== null} onOpenChange={(open) => !open && setLightboxIndex(null)}>
        <DialogContent className="max-w-4xl bg-slate-950 border-white/5 p-2 flex flex-col items-center justify-center min-h-[50vh]" dir="rtl">
          <DialogHeader className="sr-only">
             <DialogTitle>عرض الصورة كاملة</DialogTitle>
          </DialogHeader>
          
          <div className="relative w-full aspect-auto max-h-[80vh] flex items-center justify-center overflow-hidden rounded-lg group">
            {lightboxIndex !== null && allImagesForLightbox[lightboxIndex] ? (
              <>
                <img 
                  src={allImagesForLightbox[lightboxIndex]} 
                  alt={`Image ${lightboxIndex + 1}`} 
                  className="max-w-full max-h-full object-contain mx-auto"
                  referrerPolicy="no-referrer"
                />
                
                {allImagesForLightbox.length > 1 && (
                  <>
                    <button 
                      onClick={(e) => { e.stopPropagation(); prevImage(); }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 bg-black/40 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-10"
                    >
                      <ChevronRight className="h-8 w-8" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); nextImage(); }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 bg-black/40 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-10"
                    >
                      <ChevronLeft className="h-8 w-8" />
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-20 text-muted-foreground gap-4">
                <AlertTriangle className="h-12 w-12 text-amber-500" />
                <span className="font-bold text-lg">الصورة غير متوفرة</span>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between w-full px-6 text-white bg-black/40 p-4 rounded-xl">
             <div className="font-black text-sm text-white/80">
                صورة {lightboxIndex !== null ? lightboxIndex + 1 : 0} من {allImagesForLightbox.length}
             </div>
             <div className="flex gap-4">
                <Button 
                  variant="ghost" 
                  className="text-white hover:bg-white/10 gap-2 font-bold"
                  onClick={() => lightboxIndex !== null && downloadImage(allImagesForLightbox[lightboxIndex], lightboxIndex)}
                >
                  <Download className="h-4 w-4" />
                  تحميل
                </Button>
                <Button 
                  variant="ghost" 
                  className="text-white hover:bg-white/10 font-bold"
                  onClick={() => setLightboxIndex(null)}
                >
                  إغلاق
                </Button>
             </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full h-10 w-10 hover:bg-muted">
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div className="h-10 w-px bg-border mx-2" />
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-foreground">قائمة رقم: {invoice.invoiceNumber}</h2>
              {getStatusBadge(invoice.paymentStatus || 'pending')}
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-muted-foreground font-bold">
              <User className="h-3.5 w-3.5" />
              <span>المورد: {invoice.accountName}</span>
              <span className="mx-2">•</span>
              <Calendar className="h-3.5 w-3.5" />
              <span>بتاريخ: {safeFormatDate(invoice.date, 'yyyy/MM/dd')}</span>
            </div>
          </div>
        </div>

        <div className={`flex items-center gap-2 flex-wrap ${appMode === 'mobile' ? 'w-full grid grid-cols-2 md:flex md:w-auto' : ''}`}>
          <Button variant="outline" className={`gap-2 h-11 px-5 rounded-xl font-bold border-amber-500/20 bg-amber-500/5 text-amber-600 hover:bg-amber-500/10 ${appMode === 'mobile' ? 'flex-1' : ''}`} onClick={() => onEdit(invoice)}>
            <Edit className="h-4 w-4" />
            تعديل
          </Button>
          <Button variant="outline" className={`gap-2 h-11 px-5 rounded-xl font-bold border-emerald-500/20 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-700 hover:text-white transition-all shadow-sm ${appMode === 'mobile' ? 'flex-1' : ''}`} onClick={() => onPayment(invoice)}>
            <DollarSign className="h-4 w-4" />
            تسديد
          </Button>
          <Button variant="outline" className={`gap-2 h-11 px-5 rounded-xl font-bold border-rose-500/20 bg-rose-500/5 text-rose-600 hover:bg-rose-500/10 ${appMode === 'mobile' ? 'flex-1' : ''}`} onClick={() => onRefund(invoice)}>
            <RefreshCcw className="h-4 w-4" />
            مرتجع
          </Button>
          <Button variant="outline" className={`gap-2 h-11 px-5 rounded-xl font-bold border-border bg-muted/50 text-foreground hover:bg-muted ${appMode === 'mobile' ? 'flex-1' : ''}`} onClick={() => onPrint(invoice)}>
            <Printer className="h-4 w-4" />
            طباعة
          </Button>
          <Button variant="outline" className={`gap-2 h-11 px-5 rounded-xl font-bold border-emerald-500/20 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/10 ${appMode === 'mobile' ? 'flex-1' : ''}`} onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" className={`gap-2 h-11 px-5 rounded-xl font-bold border-blue-500/20 bg-blue-500/5 text-blue-600 hover:bg-blue-500/10 ${appMode === 'mobile' ? 'flex-1' : ''}`} onClick={handleExportPDF} disabled={isExportingPDF}>
            <FileDown className="h-4 w-4" />
            {isExportingPDF ? 'جاري التصدير...' : 'PDF'}
          </Button>
          <Button variant="ghost" className={`gap-2 h-11 px-5 rounded-xl font-bold text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 ${appMode === 'mobile' ? 'col-span-2' : ''}`} onClick={() => onDelete(invoice)}>
            <Trash2 className="h-4 w-4" />
            حذف
          </Button>
        </div>
      </div>

      <div id="invoice-printable-content" className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-8">
          {/* Section 1: Financial Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'المبلغ الكلي', value: invoice.amount, color: 'text-foreground', bg: 'bg-muted/50' },
              { 
                label: 'الخصم', 
                value: invoice.discount || 0, 
                color: 'text-rose-500', 
                bg: 'bg-rose-500/5', 
                prefix: '-',
                subValue: invoice.discountValue && invoice.discountType === 'percentage' ? `${invoice.discountValue}%` : null
              },
              { label: 'البونص', value: invoice.bonus || 0, color: 'text-emerald-500', bg: 'bg-emerald-500/5', icon: Gift },
              { label: 'الصافي المطلوب', value: invoice.netAmount, color: 'text-primary', bg: 'bg-primary/5', emphasize: true },
              { label: 'المدفوع', value: invoice.paidAmount || 0, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
              { label: 'المتبقي', value: invoice.remainingAmount || 0, color: 'text-rose-600', bg: 'bg-rose-500/10 font-bold' },
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <Card key={idx} className={`border-border ${stat.bg} ${stat.emphasize ? 'ring-2 ring-primary/20 shadow-lg shadow-primary/5' : ''} rounded-2xl overflow-hidden group`}>
                  <CardContent className="p-4 flex flex-col items-center justify-center min-h-[100px] text-center">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5 line-clamp-1">
                      {Icon && <Icon className="h-3 w-3" />}
                      {stat.label}
                    </span>
                    <div className={`text-lg font-black font-mono tracking-tighter ${stat.color} flex flex-col items-center`}>
                      <div className="flex items-center">
                        {stat.prefix}{stat.value.toLocaleString()}
                        <span className="text-[9px] mr-1 font-sans">د.ع</span>
                      </div>
                      {stat.subValue && (
                        <span className="text-[10px] bg-rose-500 text-white px-1.5 rounded-full mt-1 font-bold">
                          {stat.subValue}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Section 2: Invoice Line Items */}
          <Card className="bg-card border-border rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border py-6 px-8">
              <CardTitle className="text-lg font-black text-foreground flex items-center gap-3">
                <Receipt className="h-5 w-5 text-primary" />
                تفاصيل المواد في القائمة
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {appMode === 'laptop' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                   <thead>
                     <tr className="bg-muted/20">
                       <th className="px-8 py-4 text-xs font-black text-muted-foreground uppercase tracking-wider border-b border-border">المادة / البيان</th>
                       <th className="px-8 py-4 text-xs font-black text-muted-foreground uppercase tracking-wider border-b border-border">الكمية</th>
                       <th className="px-8 py-4 text-xs font-black text-muted-foreground uppercase tracking-wider border-b border-border">السعر</th>
                       <th className="px-8 py-4 text-xs font-black text-muted-foreground uppercase tracking-wider border-b border-border text-left">الإجمالي</th>
                     </tr>
                   </thead>
                   <tbody>
                     <tr className="border-b border-border/50 hover:bg-muted/5 transition-colors">
                       <td className="px-8 py-5">
                         <div className="font-black text-foreground">توريد أدوية ومستلزمات طبية متنوعة</div>
                         <div className="text-[10px] text-muted-foreground mt-1 font-bold">حسب القائمة المرفقة</div>
                       </td>
                       <td className="px-8 py-5 font-mono font-bold text-foreground">1</td>
                       <td className="px-8 py-5 font-mono font-bold text-foreground">{invoice.amount.toLocaleString()}</td>
                       <td className="px-8 py-5 font-mono font-black text-primary text-left">{invoice.amount.toLocaleString()}</td>
                     </tr>
                   </tbody>
                   <tfoot>
                     <tr className="bg-muted/10 font-black">
                       <td colSpan={3} className="px-8 py-4 text-muted-foreground text-left italic">المجموع الكلي</td>
                       <td className="px-8 py-4 font-mono text-foreground text-left text-lg">{invoice.amount.toLocaleString()} د.ع</td>
                     </tr>
                   </tfoot>
                </table>
              </div>
              ) : (
                <div className="p-4 space-y-4">
                  <div className="p-4 bg-muted/20 border border-border rounded-xl space-y-3">
                    <div className="font-black text-foreground text-sm">توريد أدوية ومستلزمات طبية متنوعة</div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>الكمية: 1</span>
                      <span>السعر: {invoice.amount.toLocaleString()}</span>
                    </div>
                    <div className="pt-2 border-t border-border/50 flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-muted-foreground">الإجمالي</span>
                      <span className="font-black text-primary font-mono">{invoice.amount.toLocaleString()} د.ع</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Payment History Ledger */}
          <Card className="bg-card border-border rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border py-4 px-6 md:py-6 md:px-8">
              <div className="flex justify-between items-center w-full">
                <CardTitle className="text-base md:text-lg font-black text-foreground flex items-center gap-3">
                  <History className="h-5 w-5 text-emerald-500" />
                  سجل التسديدات والدفعات
                </CardTitle>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full font-black">
                  إجمالي المسدد: {invoice.paidAmount?.toLocaleString()} د.ع
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
               {appMode === 'laptop' ? (
               <div className="overflow-x-auto">
                 <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-muted/10">
                        <th className="px-8 py-4 text-xs font-extrabold text-muted-foreground border-b border-border">التاريخ</th>
                        <th className="px-8 py-4 text-xs font-extrabold text-muted-foreground border-b border-border">البيان</th>
                        <th className="px-8 py-4 text-xs font-extrabold text-muted-foreground border-b border-border text-left">المبلغ المسدد</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.map((payment) => (
                        <tr key={payment.id} className="border-b border-border/50 hover:bg-muted/5 transition-colors">
                          <td className="px-8 py-4 text-xs font-mono font-bold text-muted-foreground italic">
                            {safeFormatDate(payment.date, 'yyyy/MM/dd HH:mm')}
                          </td>
                          <td className="px-8 py-4">
                            <div className="font-bold text-foreground text-sm flex items-center gap-2">
                              {payment.operationType === 'payment' ? (
                                <ArrowRight className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <RefreshCcw className="h-3 w-3 text-rose-500" />
                              )}
                              {payment.notes || (payment.operationType === 'payment' ? 'دفعة نقدية مسددة' : 'مرتجع فاتورة')}
                            </div>
                          </td>
                          <td className={`px-8 py-4 font-mono font-black text-left ${payment.operationType === 'payment' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {payment.operationType === 'payment' ? '+' : '-'}{payment.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {paymentHistory.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-12 text-center text-muted-foreground font-bold italic text-sm">
                            لا توجد دفعات مسجلة لهذه القائمة بعد
                          </td>
                        </tr>
                      )}
                    </tbody>
                 </table>
               </div>
               ) : (
                <div className="p-4 space-y-3">
                   {paymentHistory.map((payment) => (
                    <div key={payment.id} className="p-4 bg-muted/20 border border-border rounded-xl flex justify-between items-center">
                      <div className="space-y-1">
                        <div className="text-[10px] text-muted-foreground font-mono italic">{safeFormatDate(payment.date, 'yyyy/MM/dd HH:mm')}</div>
                        <div className="font-bold text-foreground text-xs flex items-center gap-2">
                           {payment.operationType === 'payment' ? (
                              <ArrowRight className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <RefreshCcw className="h-3 w-3 text-rose-500" />
                            )}
                            {payment.notes || (payment.operationType === 'payment' ? 'دفعة نقدية مسددة' : 'مرتجع فاتورة')}
                        </div>
                      </div>
                      <div className={`font-black font-mono text-base ${payment.operationType === 'payment' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {payment.operationType === 'payment' ? '+' : '-'}{payment.amount.toLocaleString()}
                      </div>
                    </div>
                   ))}
                   {paymentHistory.length === 0 && (
                    <div className="py-8 text-center text-muted-foreground font-bold italic text-xs">
                      لا توجد دفعات مسجلة بعد
                    </div>
                   )}
                </div>
               )}
            </CardContent>
          </Card>
        </div>

        {/* Section 6 & 4 & 5: Right Sidebar */}
        <div className="space-y-8">
          {/* Quick Actions Sidebar */}
          <Card className="bg-primary/5 border-primary/20 rounded-2xl overflow-hidden">
             <CardHeader className="p-6 pb-4">
                <CardTitle className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  إجراءات سريعة
                </CardTitle>
             </CardHeader>
             <CardContent className="p-6 pt-0 space-y-3">
               <Button variant="default" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl h-12 shadow-lg shadow-emerald-600/20 gap-3" onClick={() => onPayment(invoice)}>
                 <DollarSign className="h-4 w-4" />
                 تسديد دفعة جديدة
               </Button>
               <Button variant="outline" className="w-full border-primary/20 bg-white dark:bg-muted/50 text-foreground font-bold rounded-xl h-11 transition-all hover:bg-primary/5 hover:border-primary/50 gap-3" onClick={() => onEdit(invoice)}>
                 <Edit className="h-4 w-4" />
                 تعديل بيانات الفاتورة
               </Button>
               <Button variant="outline" className="w-full border-rose-500/20 bg-white dark:bg-rose-500/5 text-rose-600 font-bold rounded-xl h-11 transition-all hover:bg-rose-500/10 gap-3" onClick={() => onRefund(invoice)}>
                 <RefreshCcw className="h-4 w-4" />
                 إرجاع مادة (مرتجع)
               </Button>
             </CardContent>
          </Card>

          {/* Section 4: Attachments */}
          <Card className="bg-card border-border rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="p-6 pb-2">
               <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                 <ImageIcon className="h-4 w-4" />
                 المرفقات والصور ({allImagesForLightbox.length})
               </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
               <div className="space-y-8">
                  {/* Invoice Images */}
                  <div className="space-y-4">
                     {images.length > 0 && (
                        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-wider bg-muted/50 px-2 py-1 rounded inline-block">
                           صور الفاتورة / القائمة
                        </div>
                     )}
                     
                     {images.length > 0 ? (
                       <div className="grid grid-cols-1 gap-4">
                         {images.map((url, index) => (
                           <div key={index} className="space-y-2 border-b border-border/50 pb-4 last:border-0 last:pb-0">
                             <div 
                               className="group relative rounded-xl overflow-hidden border border-border bg-muted cursor-pointer aspect-video" 
                               onClick={() => setLightboxIndex(index)}
                             >
                               <img 
                                 src={url} 
                                 alt={`Invoice ${index + 1}`} 
                                 className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" 
                                 referrerPolicy="no-referrer" 
                               />
                               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                 <span className="text-white text-[10px] font-bold bg-black/50 px-3 py-1.5 rounded-full flex items-center gap-2 backdrop-blur-sm">
                                   <Maximize2 className="h-3 w-3" />
                                   عرض بالحجم الكامل
                                 </span>
                               </div>
                             </div>
                             
                             <div className="flex items-center justify-between gap-2">
                               <div className="flex gap-2">
                                 <Button 
                                   variant="outline" 
                                   size="sm" 
                                   className="text-[10px] font-black h-8 rounded-lg border-rose-500/20 text-rose-500 hover:bg-rose-500/10 gap-2"
                                   onClick={() => handleImageDelete(index)}
                                 >
                                   <Trash2 className="h-3 w-3" />
                                   حذف
                                 </Button>
                                 <div className="relative">
                                   <input 
                                     type="file" 
                                     id={`replace-image-${index}`} 
                                     className="hidden" 
                                     accept="image/*" 
                                     onChange={(e) => handleImageReplace(index, e)}
                                   />
                                   <Button 
                                     variant="outline" 
                                     size="sm" 
                                     className="text-[10px] font-black h-8 rounded-lg border-blue-500/20 text-blue-500 hover:bg-blue-500/10 gap-2"
                                     onClick={() => document.getElementById(`replace-image-${index}`)?.click()}
                                   >
                                     <Upload className="h-3 w-3" />
                                     استبدال
                                   </Button>
                                 </div>
                               </div>
                               <Button 
                                 variant="ghost" 
                                 size="sm" 
                                 className="text-[10px] font-black h-8 rounded-lg hover:bg-muted gap-2"
                                 onClick={() => downloadImage(url, index)}
                               >
                                 <Download className="h-3 w-3" />
                                 تحميل
                               </Button>
                             </div>
                           </div>
                         ))}
                       </div>
                     ) : null}
                  </div>

                  {/* Receipt Images */}
                  {receiptImages.length > 0 && (
                     <div className="space-y-4 pt-4 border-t-2 border-dashed border-border/40">
                        <div className="text-[10px] font-black text-blue-600 uppercase tracking-wider bg-blue-50/50 px-2 py-1 rounded inline-block">
                           صور وصولات التسديد
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                          {receiptImages.map((url, index) => (
                            <div key={index} className="space-y-2 border-b border-border/50 pb-4 last:border-0 last:pb-0">
                              <div 
                                className="group relative rounded-xl overflow-hidden border border-border bg-muted cursor-pointer aspect-video" 
                                onClick={() => handleFullView(images.length + index)}
                              >
                                {renderImageContent(url, `Receipt ${index + 1}`)}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="text-white text-[10px] font-bold bg-black/50 px-3 py-1.5 rounded-full flex items-center gap-2 backdrop-blur-sm">
                                    <Maximize2 className="h-3 w-3" />
                                    {isPdf(url) ? 'فتح ملف PDF' : 'عرض بالحجم الكامل'}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-end">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-[10px] font-black h-8 rounded-lg hover:bg-muted gap-2"
                                  onClick={() => downloadImage(url, images.length + index)}
                                >
                                  <Download className="h-3 w-3" />
                                  تحميل
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                     </div>
                  )}

                  {allImagesForLightbox.length === 0 && (
                    <div className="py-12 text-center bg-muted/30 border-2 border-dashed border-border rounded-2xl flex flex-col items-center gap-3">
                      <ImageIcon className="h-10 w-10 text-muted-foreground opacity-20" />
                      <div className="text-[10px] text-muted-foreground font-black uppercase">لا توجد صور مرفقة لهذه الفاتورة</div>
                    </div>
                  )}

                  <div className="pt-2">
                    <input 
                      type="file" 
                      id="add-images-input-detail" 
                      className="hidden" 
                      accept="image/*" 
                      multiple
                      onChange={handleImageAdd}
                    />
                    <Button 
                      variant="outline" 
                      className="w-full h-11 border-dashed border-2 border-primary/20 text-primary font-black hover:bg-primary/5 gap-3 rounded-xl disabled:opacity-50"
                      onClick={() => document.getElementById('add-images-input-detail')?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          جاري الرفع... ({uploadProgress.toFixed(0)}%)
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          إضافة المزيد من الصور
                        </>
                      )}
                    </Button>
                  </div>
               </div>
            </CardContent>
          </Card>

          {/* Section 5: Notes & Audit Log */}
          <Card className="bg-card border-border rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="p-6 pb-2">
               <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                 <Info className="h-4 w-4" />
                 ملاحظات وتفاصيل النظام
               </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <span className="text-[10px] font-black text-muted-foreground uppercase italic px-2 bg-muted rounded">ملاحظات المسؤؤل</span>
                <p className="text-sm text-foreground font-bold leading-relaxed pr-2 border-r-2 border-primary/20">
                  {invoice.notes || 'لا توجد ملاحظات إضافية مسجلة لهذه الفاتورة.'}
                </p>
              </div>

              <div className="pt-4 border-t border-border space-y-4">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-black text-muted-foreground">AD</div>
                   <div>
                     <div className="text-xs font-black text-foreground">تم الإنشاء بواسطة: {invoice.username || 'System'}</div>
                     <div className="text-[9px] text-muted-foreground font-bold">{safeFormatDate(invoice.createdAt, 'yyyy/MM/dd HH:mm')}</div>
                   </div>
                </div>
                {invoice.paymentStatus === 'paid' && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-emerald-600">القائمة مسددة وحالة النظام خضراء</div>
                      <div className="text-[9px] text-muted-foreground font-bold">معالجة التدقيق مكتملة</div>
                    </div>
                  </div>
                )}
                {invoice.paymentStatus === 'pending' && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-amber-600">القائمة بانتظار السداد</div>
                      <div className="text-[9px] text-muted-foreground font-bold">بذمة الصيدلية</div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};
