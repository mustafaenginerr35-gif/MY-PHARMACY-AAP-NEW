import React, { useState, useMemo } from 'react';
import { 
  PackageSearch, 
  Plus, 
  Search, 
  Filter, 
  MessageCircle, 
  CheckCircle2, 
  Trash2, 
  Clock, 
  AlertCircle,
  MoreVertical,
  Phone,
  User,
  Pill,
  Hash,
  StickyNote,
  CalendarDays,
  Camera,
  X,
  Image as ImageIcon,
  Maximize2,
  Pencil
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { firebaseService } from '../services/firebaseService';
import { useFirebaseQuery } from '../hooks/useFirebaseQuery';
import { where, orderBy } from 'firebase/firestore';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { MedicineRequest } from '../db';
import { safeFormatDate, toValidDate } from '../lib/formatters';
import { ImageCapture } from './ImageCapture';

interface MedicineRequestsPageProps {
  branchId: string | null;
  ownerId: string;
  onDeleteRequest: (id: string) => void;
  onDeleteImage: (id: string) => void;
}

export const MedicineRequestsPage: React.FC<MedicineRequestsPageProps> = ({ branchId, ownerId, onDeleteRequest, onDeleteImage }) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<MedicineRequest | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    patientName: '',
    phone: '',
    medicineName: '',
    quantity: '',
    notes: '',
    imageUrl: ''
  });

  React.useEffect(() => {
    if (editingRequest) {
      setFormData({
        patientName: editingRequest.patientName,
        phone: editingRequest.phone,
        medicineName: editingRequest.medicineName,
        quantity: editingRequest.quantity,
        notes: editingRequest.notes || '',
        imageUrl: editingRequest.imageUrl || ''
      });
    } else {
      setFormData({
        patientName: '',
        phone: '',
        medicineName: '',
        quantity: '',
        notes: '',
        imageUrl: ''
      });
    }
  }, [editingRequest]);

  const constraints = useMemo(() => [
    where('ownerId', '==', ownerId)
  ], [ownerId]);

  const { data: medicineRequestsRaw = [] } = useFirebaseQuery<MedicineRequest>('medicineRequests', constraints);

  const medicineRequests = useMemo(() => {
    const sortedRaw = [...medicineRequestsRaw].sort((a, b) => {
      const da = toValidDate(a.createdAt || Date.now());
      const db = toValidDate(b.createdAt || Date.now());
      const ta = isNaN(da.getTime()) ? 0 : da.getTime();
      const tb = isNaN(db.getTime()) ? 0 : db.getTime();
      return tb - ta;
    });
    if (!branchId) return sortedRaw;
    return sortedRaw.filter(r => r.branchId === branchId);
  }, [medicineRequestsRaw, branchId]);

  const filteredRequests = useMemo(() => {
    return medicineRequests.filter(req => {
      const matchesSearch = 
        req.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.phone.includes(searchTerm) ||
        req.medicineName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [medicineRequests, searchTerm, statusFilter]);

  const formatIraqiPhone = (phone: string) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('07')) {
      cleaned = '964' + cleaned.substring(1);
    } else if (cleaned.startsWith('7') && cleaned.length === 10) {
      cleaned = '964' + cleaned;
    }
    return cleaned;
  };

  const handleImageCaptured = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleAddRequest = async () => {
    if (!formData.patientName || !formData.phone || !formData.medicineName) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      if (editingRequest) {
        await firebaseService.updateDocument('medicineRequests', editingRequest.id!, {
          patientName: formData.patientName,
          phone: formData.phone,
          medicineName: formData.medicineName,
          quantity: formData.quantity || '1',
          notes: formData.notes,
          imageUrl: formData.imageUrl || null,
          updatedAt: new Date()
        });
        toast.success('تم تحديث الطلب بنجاح');
        setEditingRequest(null);
      } else {
        const newRequest: Omit<MedicineRequest, 'id'> = {
          patientName: formData.patientName,
          phone: formData.phone,
          medicineName: formData.medicineName,
          quantity: formData.quantity || '1',
          status: 'waiting',
          notes: formData.notes,
          imageUrl: formData.imageUrl || null,
          branchId: branchId || null,
          ownerId,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await firebaseService.addDocument('medicineRequests', newRequest as MedicineRequest);
        toast.success('تم تسجيل الطلب بنجاح');
        setIsAddDialogOpen(false);
      }
      
      setFormData({
        patientName: '',
        phone: '',
        medicineName: '',
        quantity: '',
        notes: '',
        imageUrl: ''
      });
    } catch (err) {
      toast.error('حدث خطأ أثناء حفظ الطلب');
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: MedicineRequest['status']) => {
    try {
      await firebaseService.updateDocument('medicineRequests', id, { status: newStatus });
      toast.success('تم تحديث حالة الطلب');
    } catch (err) {
      toast.error('حدث خطأ أثناء تحديث الحالة');
    }
  };

  const sendWhatsApp = async (req: MedicineRequest) => {
    const formattedPhone = formatIraqiPhone(req.phone);
    const message = `السلام عليكم \nعلاجك المطلوب [${req.medicineName}] صار متوفر في الصيدلية. \nيمكنك مراجعتنا في أي وقت. \nتحياتنا.`;
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
    
    if (req.status !== 'notified' && req.id) {
      await handleUpdateStatus(req.id, 'notified');
    }
  };

  const getStatusInfo = (status: MedicineRequest['status']) => {
    switch (status) {
      case 'waiting':
        return { label: 'بانتظار', color: 'bg-amber-500/10 text-amber-500', icon: Clock };
      case 'provided':
        return { label: 'تم التوفير', color: 'bg-blue-500/10 text-blue-500', icon: CheckCircle2 };
      case 'notified':
        return { label: 'تم الإبلاغ', color: 'bg-emerald-500/10 text-emerald-500', icon: MessageCircle };
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Lightbox for Images */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 md:p-8"
            onClick={() => setLightboxImage(null)}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20 transition-colors z-[110]"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxImage(null);
              }}
            >
              <X className="h-8 w-8" />
            </Button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={lightboxImage}
              alt=" العلاج"
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-foreground flex items-center gap-3">
            <PackageSearch className="h-6 w-6 text-primary" />
            طلبات العلاجات غير المتوفرة
          </h2>
          <p className="text-muted-foreground font-bold text-sm">تسجيل ومتابعة طلبات المراجعين للأدوية غير المتوفرة</p>
        </div>

      <Dialog open={isAddDialogOpen || !!editingRequest} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false);
          setEditingRequest(null);
        }
      }}>
        <DialogContent className="max-w-xl rounded-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-right">
              {editingRequest ? 'تعديل طلب العلاج' : 'إضافة طلب علاج جديد'}
            </DialogTitle>
          </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    اسم المراجع
                  </Label>
                  <Input 
                    placeholder="مثال: أحمد علي"
                    value={formData.patientName}
                    onChange={e => setFormData({...formData, patientName: e.target.value})}
                    className="h-11 rounded-xl shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    رقم الهاتف
                  </Label>
                  <Input 
                    placeholder="07xxxxxxxxx"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="h-11 rounded-xl font-mono text-left shadow-sm"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold flex items-center gap-2">
                    <Pill className="h-4 w-4 text-primary" />
                    اسم العلاج
                  </Label>
                  <Input 
                    placeholder="مثال: Panadol 500mg"
                    value={formData.medicineName}
                    onChange={e => setFormData({...formData, medicineName: e.target.value})}
                    className="h-11 rounded-xl shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold flex items-center gap-2">
                    <Hash className="h-4 w-4 text-primary" />
                    الكمية المطلوبة
                  </Label>
                  <Input 
                    placeholder="1"
                    value={formData.quantity}
                    onChange={e => setFormData({...formData, quantity: e.target.value})}
                    className="h-11 rounded-xl shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-bold flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-primary" />
                  ملاحظات
                </Label>
                <Textarea 
                  placeholder="أي ملاحظات إضافية..."
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="rounded-xl min-h-[80px] shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-bold flex items-center gap-2">
                  <Camera className="h-4 w-4 text-primary" />
                  صورة العلاج (اختياري)
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ImageCapture 
                    id="medicine-image"
                    label="التقاط أو رفع صورة"
                    onImageCaptured={handleImageCaptured}
                  />
                  {formData.imageUrl && (
                    <div className="relative rounded-xl overflow-hidden border-2 border-primary/20 aspect-video group">
                      <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                        className="absolute top-2 left-2 bg-destructive text-destructive-foreground p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => {
                setIsAddDialogOpen(false);
                setEditingRequest(null);
              }} className="rounded-xl h-11 font-black">إلغاء</Button>
              <Button onClick={handleAddRequest} className="rounded-xl h-11 font-black px-8">
                {editingRequest ? 'حفظ التغييرات' : 'حفظ الطلب'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex justify-end mb-4">
        {!isAddDialogOpen && !editingRequest && (
          <Button 
            className="rounded-xl px-6 h-11 font-black gap-2 shadow-lg shadow-primary/20"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="h-5 w-5" />
            تسجيل طلب جديد
          </Button>
        )}
      </div>

      {/* Filters & Search */}
      <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="ابحث باسم المراجع، العلاج، أو رقم الهاتف..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pr-10 h-10 rounded-xl border-border/50"
              />
            </div>
            <div className="flex gap-2 min-w-[200px]">
              <div className="relative w-full">
                <Filter className="absolute right-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10 pr-10 rounded-xl border-border/50 font-bold bg-background">
                    <SelectValue placeholder="الفلترة حسب الحالة" />
                  </SelectTrigger>
                  <SelectContent className="font-bold" dir="rtl">
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="waiting">بانتظار</SelectItem>
                    <SelectItem value="provided">تم التوفير</SelectItem>
                    <SelectItem value="notified">تم الإبلاغ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredRequests.map((req) => {
            const status = getStatusInfo(req.status);
            const StatusIcon = status.icon;
            
            return (
              <motion.div
                key={req.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="group relative overflow-hidden border-border/50 hover:border-primary/30 transition-all hover:shadow-xl bg-card">
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${status.color.split(' ')[0]}`}></div>
                  
                  {/* Card Thumbnail */}
                      {req.imageUrl && (
                    <div className="relative aspect-video w-full overflow-hidden bg-muted group/img">
                      <img 
                        src={req.imageUrl} 
                        alt={req.medicineName} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110 cursor-pointer"
                        onClick={() => setLightboxImage(req.imageUrl!)}
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <Maximize2 className="h-8 w-8 text-white drop-shadow-lg" />
                      </div>
                      <button 
                         onClick={() => onDeleteImage(req.id!)}
                         className="absolute top-2 left-2 bg-destructive/80 text-white p-1.5 rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity z-10"
                      >
                         <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black ${status.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-black">
                        <CalendarDays className="h-3 w-3" />
                        {safeFormatDate(req.createdAt, 'yyyy/MM/dd')}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-black text-foreground line-clamp-1">{req.patientName}</h3>
                        <p className="text-sm font-mono text-muted-foreground flex items-center gap-2 mt-1">
                          <Phone className="h-3.5 w-3.5 text-primary" />
                          {req.phone}
                        </p>
                      </div>

                      <div className="bg-muted/50 p-3 rounded-xl border border-border/30">
                        <div className="flex items-center gap-2 text-primary">
                          <Pill className="h-4 w-4" />
                          <span className="text-sm font-black">{req.medicineName}</span>
                          <span className="text-xs bg-primary/10 px-2 py-0.5 rounded-lg mr-auto">الكمية: {req.quantity}</span>
                        </div>
                        {req.notes && (
                          <p className="mt-2 text-xs text-muted-foreground font-bold line-clamp-2 italic">
                            "{req.notes}"
                          </p>
                        )}
                        {!req.imageUrl && (
                          <div className="mt-2 text-[10px] text-muted-foreground/60 flex items-center gap-1 font-bold">
                            <ImageIcon className="h-3 w-3" />
                            لا توجد صورة مرفقة
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2">
                        {req.status === 'waiting' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-[10px] font-black h-9 border-blue-500/20 text-blue-500 hover:bg-blue-500/10 gap-1.5"
                            onClick={() => handleUpdateStatus(req.id!, 'provided')}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            تم توفيره
                          </Button>
                        )}
                        
                        {(req.status === 'provided' || req.status === 'notified') && (
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black h-9 gap-1.5 shadow-md shadow-emerald-500/10"
                            onClick={() => sendWhatsApp(req)}
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            إرسال واتساب
                          </Button>
                        )}

                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-[10px] font-black h-9 border-primary/20 text-primary hover:bg-primary/10 gap-1.5"
                          onClick={() => setEditingRequest(req)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          تعديل
                        </Button>

                        <Button 
                          variant="outline" 
                          size="sm" 
                          className={`text-[10px] font-black h-9 border-rose-500/20 text-rose-500 hover:bg-rose-500/10 gap-1.5 ${req.status === 'waiting' ? 'col-span-1' : ''}`}
                          onClick={() => onDeleteRequest(req.id!)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          حذف الطلب
                        </Button>
                        
                        {req.status !== 'waiting' && (
                           <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-[10px] font-black h-9 text-muted-foreground gap-1.5"
                            onClick={() => handleUpdateStatus(req.id!, 'waiting')}
                          >
                            <Clock className="h-3.5 w-3.5" />
                            إعادة للانتظار
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredRequests.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-3xl border-2 border-dashed border-border/50">
            <PackageSearch className="h-16 w-16 mb-4 opacity-10" />
            <h3 className="text-xl font-black">لا توجد طلبات مسجلة</h3>
            <p className="font-bold text-sm mt-1">ابدأ بتسجيل طلبات المراجعين للأدوية غير المتوفرة مع صورها</p>
            <Button 
              variant="outline" 
              className="mt-6 rounded-xl font-black gap-2 border-primary text-primary hover:bg-primary/5"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              أضف أول طلب الآن
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
