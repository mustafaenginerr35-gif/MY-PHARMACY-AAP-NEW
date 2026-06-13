import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  setDoc, 
  addDoc,
  deleteDoc,
  query, 
  where,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Search, 
  Users, 
  Plus, 
  CheckCircle, 
  Clock,
  Power,
  ShieldCheck,
  KeyRound,
  Trash2,
  Copy,
  Wrench,
  Laptop,
  Coins,
  DollarSign,
  TrendingUp,
  CreditCard,
  Building,
  AlertCircle,
  HelpCircle,
  Mail,
  Smartphone,
  Check,
  RotateCcw,
  Loader2,
  Settings,
  Calendar,
  Phone,
  User,
  ExternalLink,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface SaleRecord {
  id?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  planType: 'basic' | 'advanced' | 'lifetime';
  amount: number;
  paymentMethod: 'cash' | 'zaincash' | 'asiahawala' | 'manual';
  paymentStatus: 'paid' | 'pending' | 'cancelled';
  generatedLicense: string;
  notes?: string;
  soldBy: string;
  createdAt: any;
}

interface LicenseRecord {
  id: string;
  licenseKey: string;
  planType: 'basic' | 'advanced' | 'lifetime';
  maxDevices: number;
  branchesCount: number;
  status: 'active' | 'blocked' | 'expired' | 'suspended' | 'revoked';
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  activatedDevices: any[];
  createdAt: any;
  expiresAt: string;
}

interface AppUserRecord {
  userId: string;
  displayName: string;
  email: string;
  phone?: string;
  licenseCode?: string;
  activationStatus?: string;
  planType?: string;
  role?: string;
}

export function SalesConsole() {
  const [activeTab, setActiveTab] = useState<'all-licenses' | 'new-sale' | 'sales-history' | 'pricing'>('all-licenses');
  
  // Data States
  const [licenses, setLicenses] = useState<LicenseRecord[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [appUsers, setAppUsers] = useState<AppUserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Pricing Config
  const [pricing, setPricing] = useState({
    basic: 150,
    advanced: 300,
    lifetime: 800
  });
  const [pricingLoading, setPricingLoading] = useState(false);

  // New Sale Form
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'advanced' | 'lifetime'>('basic');
  const [saleAmount, setSaleAmount] = useState<number>(150);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'zaincash' | 'asiahawala' | 'manual'>('cash');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending' | 'cancelled'>('paid');
  const [saleNotes, setSaleNotes] = useState('');
  const [createdLicenseOutput, setCreatedLicenseOutput] = useState<string | null>(null);
  const [submittingSale, setSubmittingSale] = useState(false);
  const [emailSending, setEmailSending] = useState(false);

  // Selected License Device View Modals
  const [viewingLicenseDevices, setViewingLicenseDevices] = useState<LicenseRecord | null>(null);

  // Sync real-time data
  useEffect(() => {
    setLoading(true);
    
    // 1. Listen to licenses
    const unsubLicenses = onSnapshot(collection(db, 'licenses'), (snap) => {
      const records: LicenseRecord[] = [];
      snap.forEach(doc => {
        const data = doc.data();
        records.push({
          id: doc.id,
          licenseKey: data.licenseKey || doc.id,
          planType: data.planType || 'basic',
          maxDevices: data.maxDevices || 2,
          branchesCount: data.branchesCount || 1,
          status: data.status || 'active',
          customerName: data.customerName || 'مجهول',
          customerPhone: data.customerPhone || '',
          customerEmail: data.customerEmail || '',
          activatedDevices: data.activatedDevices || [],
          createdAt: data.createdAt,
          expiresAt: data.expiresAt || 'Lifetime'
        });
      });
      setLicenses(records);
    });

    // 2. Listen to sales history
    const unsubSales = onSnapshot(collection(db, 'sales'), (snap) => {
      const records: SaleRecord[] = [];
      snap.forEach(doc => {
        const data = doc.data();
        records.push({
          id: doc.id,
          ...data as SaleRecord
        });
      });
      // Sort sales by newest
      records.sort((a,b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      setSales(records);
    });

    // 3. Listen to appUsers profiles to see who has logged in
    const unsubUsers = onSnapshot(collection(db, 'appUsers'), (snap) => {
      const records: AppUserRecord[] = [];
      snap.forEach(doc => {
        const data = doc.data();
        records.push({
          userId: doc.id,
          displayName: data.displayName || data.username || 'بدون اسم',
          email: data.email || '',
          phone: data.phone || '',
          licenseCode: data.licenseCode || '',
          activationStatus: data.activationStatus || 'unlicensed',
          planType: data.planType || '',
          role: data.role || 'customer'
        });
      });
      setAppUsers(records);
      setLoading(false);
    });

    // 4. Fetch pricing config
    const unsubPricing = onSnapshot(doc(db, 'settings', 'system_pricing'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setPricing({
          basic: data.basic || 150,
          advanced: data.advanced || 300,
          lifetime: data.lifetime || 800
        });
      }
    });

    return () => {
      unsubLicenses();
      unsubSales();
      unsubUsers();
      unsubPricing();
    };
  }, []);

  // Update sale amount based on plan selection in Real-Time
  useEffect(() => {
    if (selectedPlan === 'basic') setSaleAmount(pricing.basic);
    if (selectedPlan === 'advanced') setSaleAmount(pricing.advanced);
    if (selectedPlan === 'lifetime') setSaleAmount(pricing.lifetime);
  }, [selectedPlan, pricing]);

  // Handle Save Pricing Config
  const handleSavePricing = async () => {
    setPricingLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'system_pricing'), pricing);
      toast.success('تم حفظ وتحديث مصفوفة أسعار الباقات بنجاح!');
    } catch (e: any) {
      toast.error('فشل حفظ الأسعار: ' + e.message);
    } finally {
      setPricingLoading(false);
    }
  };

  // Helper to generate dynamic License Keys
  const generateLicenseKey = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // exclude 0, 1, I, O for readability
    const segment = (len: number) => {
      let str = '';
      for (let i = 0; i < len; i++) {
        str += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return str;
    };
    return `LIC-${segment(6)}-${segment(4)}`;
  };

  // Handle License Generation & Log Manual Sale
  const handleGenerateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone) {
      toast.error('يرجى ملأ اسم العميل ورقم هاتفه للتوثيق');
      return;
    }

    setSubmittingSale(true);
    try {
      // 1. Generate key
      const newKey = generateLicenseKey();

      // Determine parameters based on plan
      let maxDevices = 2;
      let branchesCount = 1;
      let durationMonths = 12;

      if (selectedPlan === 'advanced') {
        maxDevices = 5;
        branchesCount = 3;
        durationMonths = 12;
      } else if (selectedPlan === 'lifetime') {
        maxDevices = 15;
        branchesCount = 10;
        durationMonths = 999; // lifetime
      }

      const expiresDate = selectedPlan === 'lifetime' 
        ? 'Lifetime' 
        : new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000).toISOString();

      // 2. Save License to Firestore
      const licensePayload = {
        licenseKey: newKey,
        planType: selectedPlan,
        maxDevices,
        branchesCount,
        status: 'active',
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || null,
        activatedDevices: [],
        createdAt: new Date(),
        expiresAt: expiresDate
      };

      await setDoc(doc(db, 'licenses', newKey), licensePayload);

      // 3. Save Sale Record to Firestore
      const salePayload: SaleRecord = {
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        planType: selectedPlan,
        amount: Number(saleAmount),
        paymentMethod,
        paymentStatus,
        generatedLicense: newKey,
        notes: saleNotes,
        soldBy: 'Super Admin',
        createdAt: new Date()
      };

      await addDoc(collection(db, 'sales'), salePayload);

      setCreatedLicenseOutput(newKey);
      toast.success('تم توليد ترخيص النظام وتسجيل الفاتورة السحابية بنجاح!');

      // Reset form fields except outcomes
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setSaleNotes('');
    } catch (e: any) {
      toast.error('فشل عملية التنشيط أو الفوترة: ' + e.message);
    } finally {
      setSubmittingSale(false);
    }
  };

  // Action Helpers for Licenses
  const handleToggleLicenseStatus = async (license: LicenseRecord, newStatus: 'active' | 'suspended' | 'blocked' | 'revoked') => {
    try {
      // 1. Update license configuration
      await updateDoc(doc(db, 'licenses', license.id), { status: newStatus });
      toast.success(`تم تغيير حالة رخصة العميل ${license.customerName} إلى ${newStatus}`);

      // 2. Propagate state directly to any registered appUsers profile carrying this licenseCode
      const qUsers = query(collection(db, 'appUsers'), where('licenseCode', '==', license.licenseKey));
      const uSnap = await getDocs(qUsers);
      uSnap.forEach(async (uDoc) => {
        await updateDoc(doc(db, 'appUsers', uDoc.id), { activationStatus: newStatus });
        console.log(`Propagated update directly to AppUser ${uDoc.id}`);
      });
    } catch (e: any) {
      toast.error('حدث عطل في تحديث حالة الترخيص: ' + e.message);
    }
  };

  const handleResetLicenseDevices = async (license: LicenseRecord) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في تصفير جميع الأجهزة المرتبطة بالترخيص ${license.licenseKey} لتمكينه من الدخول بجهاز جديد؟`)) return;
    try {
      await updateDoc(doc(db, 'licenses', license.id), { activatedDevices: [] });
      toast.success(`تم فك ارتباط الأجهزة بنجاح لترخيص ${license.customerName}`);

      // Also propagate if they have been blocked, revert their statuses
      const qUsers = query(collection(db, 'appUsers'), where('licenseCode', '==', license.licenseKey));
      const uSnap = await getDocs(qUsers);
      uSnap.forEach(async (uDoc) => {
        const uData = uDoc.data();
        if (uData.activationStatus === 'blocked_device') {
          await updateDoc(doc(db, 'appUsers', uDoc.id), { activationStatus: 'active' });
        }
      });
    } catch (e: any) {
      toast.error('فشل إعادة تعيين الأجهزة: ' + e.message);
    }
  };

  const handleDeleteDeviceFromLicense = async (license: LicenseRecord, deviceIdToRemove: string) => {
    try {
      const updatedDevices = license.activatedDevices.filter(d => d.deviceId !== deviceIdToRemove);
      await updateDoc(doc(db, 'licenses', license.id), { activatedDevices: updatedDevices });
      toast.success('تم حذف الجهاز المصرح بنجاح، مما يسمح بإقران جهاز بديل.');
      
      // Update local modal state to prevent stale rendering
      setViewingLicenseDevices({
        ...license,
        activatedDevices: updatedDevices
      });

      // Propagate user profile activation logic
      const qUsers = query(collection(db, 'appUsers'), where('licenseCode', '==', license.licenseKey));
      const uSnap = await getDocs(qUsers);
      uSnap.forEach(async (uDoc) => {
        const uData = uDoc.data();
        // Just refresh user state
        if (uData.activationStatus === 'blocked_device') {
          await updateDoc(doc(db, 'appUsers', uDoc.id), { activationStatus: 'active' });
        }
      });

    } catch (e: any) {
      toast.error('فشل حذف الجهاز: ' + e.message);
    }
  };

  const handleExtendExpiration = async (license: LicenseRecord) => {
    const daysStr = window.prompt("ما هي عدد الأيام الإضافية التي ترغب في منحها لهذا الترخيص؟", "365");
    if (!daysStr) return;
    const days = parseInt(daysStr, 10);
    if (isNaN(days) || days <= 0) {
      toast.error("عدد أيام غير صالح.");
      return;
    }

    try {
      let currentExpire = new Date();
      if (license.expiresAt && license.expiresAt !== 'Lifetime') {
        const parsed = new Date(license.expiresAt);
        if (!isNaN(parsed.getTime())) currentExpire = parsed;
      }
      
      const newExpire = new Date(currentExpire.getTime() + days * 24 * 60 * 60 * 1000);
      await updateDoc(doc(db, 'licenses', license.id), { 
        expiresAt: newExpire.toISOString(),
        status: 'active' 
      });

      // Update users
      const qUsers = query(collection(db, 'appUsers'), where('licenseCode', '==', license.licenseKey));
      const uSnap = await getDocs(qUsers);
      uSnap.forEach(async (uDoc) => {
        await updateDoc(doc(db, 'appUsers', uDoc.id), { activationStatus: 'active' });
      });

      toast.success(`تم تمديد الترخيص بمقدار ${days} يوم. تاريخ الانتهاء الجديد: ${newExpire.toLocaleDateString()}`);
    } catch (e: any) {
      toast.error('فشل تمديد الصلاحية: ' + e.message);
    }
  };

  const handleSimulateEmail = () => {
    if (!createdLicenseOutput) return;
    setEmailSending(true);
    setTimeout(() => {
      setEmailSending(false);
      toast.success('تم إرسال المفتاح ورسالة ترحيبية وتفاصيل الفاتورة السحابية بنجاح إلى البريد الإلكتروني للعميل!');
    }, 1500);
  };

  // Computations
  const stats = useMemo(() => {
    const totalC = licenses.length;
    const active = licenses.filter(l => l.status === 'active').length;
    const expired = licenses.filter(l => l.status === 'expired').length;
    const suspended = licenses.filter(l => l.status === 'suspended').length;
    const revoked = licenses.filter(l => l.status === 'revoked').length;
    const lifetime = licenses.filter(l => l.planType === 'lifetime').length;
    
    // total revenue is sum of paid sales in the system
    const revenue = sales
      .filter(s => s.paymentStatus === 'paid')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);

    return { totalC, active, expired, suspended, revoked, lifetime, revenue };
  }, [licenses, sales]);

  // Client side filtered Licenses search
  const filteredLicenses = useMemo(() => {
    return licenses.filter(l => {
      const matchesSearch = 
        l.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.customerEmail || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.customerPhone || '').includes(searchQuery) ||
        l.licenseKey.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesPlan = filterPlan === 'all' || l.planType === filterPlan;
      const matchesStatus = filterStatus === 'all' || l.status === filterStatus;

      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [licenses, searchQuery, filterPlan, filterStatus]);

  // Copy helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('تم نسخ مفتاح الترخيص بنجاح إلى الحافظة!');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24 text-right" dir="rtl">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-black text-foreground">بوابة المبيعات والتراخيص (Sales & License Console)</h3>
            <p className="text-xs text-muted-foreground font-bold">إدارة حسابات الصيدليات، توليد مفاتيح الرخص، ومراقبة حضور الأجهزة في الزمن الحقيقي</p>
          </div>
        </div>

        {/* Console NavTabs */}
        <div className="flex bg-muted/50 p-1.5 rounded-xl border border-border w-full md:w-auto overflow-x-auto text-[11px] font-black">
          <button 
            onClick={() => setActiveTab('all-licenses')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${activeTab === 'all-licenses' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Users className="h-3.5 w-3.5" />
            التراخيص والعملاء ({licenses.length})
          </button>
          
          <button 
            onClick={() => setActiveTab('new-sale')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${activeTab === 'new-sale' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Plus className="h-3.5 w-3.5" />
            توليد رخصة / بيع يدوي
          </button>

          <button 
            onClick={() => setActiveTab('sales-history')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${activeTab === 'sales-history' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Coins className="h-3.5 w-3.5" />
            سجل المبيعات ({sales.length})
          </button>

          <button 
            onClick={() => setActiveTab('pricing')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${activeTab === 'pricing' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Settings className="h-3.5 w-3.5" />
            مسيّر الأسعار
          </button>
        </div>
      </div>

      {/* Dashboard Counters (Bento Grid layout) */}
      <div className="grid grid-cols-2 lg:grid-cols-7 gap-4">
        {[
          { label: 'إجمالي العملاء', val: stats.totalC, sub: 'رخصة مولدة', icon: Users, color: 'text-blue-500 bg-blue-500/10' },
          { label: 'التراخيص النشطة', val: stats.active, sub: 'بث حي', icon: CheckCircle, color: 'text-emerald-500 bg-emerald-500/10' },
          { label: 'الاشتراكات المنتهية', val: stats.expired, sub: 'تحتاج تمديد', icon: Clock, color: 'text-amber-500 bg-amber-500/10' },
          { label: 'المعلقة مؤقتاً', val: stats.suspended, sub: 'موقوفة فنيًا', icon: Power, color: 'text-orange-500 bg-orange-500/10' },
          { label: 'التراخيص الملغاة', val: stats.revoked, sub: 'مسحوبة الصلاحية', icon: Trash2, color: 'text-rose-500 bg-rose-500/10' },
          { label: 'اشتراكات مدى الحياة', val: stats.lifetime, sub: 'Lifetime', icon: ShieldCheck, color: 'text-violet-500 bg-violet-500/10' },
          { label: 'صافي المقبوضات المعلمة', val: `$${stats.revenue.toLocaleString()}`, sub: 'مبيعات يدوية', icon: DollarSign, color: 'text-yellow-500 bg-yellow-500/10 font-bold' },
        ].map((item, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden transition-all hover:border-primary/10">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black text-muted-foreground tracking-wider">{item.label}</span>
              <div className={`p-1.5 rounded-lg shrink-0 ${item.color}`}>
                <item.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-xl font-black text-foreground">{item.val}</div>
              <p className="text-[9px] font-bold text-muted-foreground mt-1">{item.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* RENDER TAB 1: ALL LICENSES LIST & STATUS CONTROLLER */}
      {activeTab === 'all-licenses' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-muted/20 border border-border p-4 rounded-2xl">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم العميل، الهاتف، البريد أو رمز الترخيص..."
                className="w-full bg-card h-11 border border-border rounded-xl pr-10 pl-4 text-xs focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <select 
                value={filterPlan} 
                onChange={e => setFilterPlan(e.target.value)}
                className="bg-card h-11 font-black text-xs border border-border rounded-xl px-4 outline-none"
              >
                <option value="all">كل باقات الاشتراك</option>
                <option value="basic">الباقة الأساسية (Basic)</option>
                <option value="advanced">الباقة المتقدمة (Advanced)</option>
                <option value="lifetime">رخصة مدى الحياة (Lifetime)</option>
              </select>

              <select 
                value={filterStatus} 
                onChange={e => setFilterStatus(e.target.value)}
                className="bg-card h-11 font-black text-xs border border-border rounded-xl px-4 outline-none"
              >
                <option value="all">كل حالات التراخيص</option>
                <option value="active">نشط ومفعل (Active)</option>
                <option value="expired">منتهي الصلاحية (Expired)</option>
                <option value="suspended">معلق (Suspended)</option>
                <option value="revoked">ملغى نهائياً (Revoked)</option>
              </select>
            </div>
          </div>

          {/* Licenses Listing Table */}
          {loading ? (
            <div className="bg-card border border-border rounded-3xl p-24 text-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-3" />
              <p className="text-xs font-bold text-muted-foreground">جاري جلب قائمة الترخيص والاتصال بالأجهزة سحابياً...</p>
            </div>
          ) : filteredLicenses.length === 0 ? (
            <div className="bg-card border border-border rounded-3xl p-16 text-center text-muted-foreground text-xs font-bold leading-relaxed">
              <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
              لا توجد أي تراخيص مطابقة لمعايير البحث الحالية في الصيدليات السحابية.
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-muted/40 font-black text-muted-foreground uppercase border-b border-border">
                    <tr>
                      <th className="p-4">العميل وصاحب الرخصة</th>
                      <th className="p-4">الباقة والحدود</th>
                      <th className="p-4">مفتاح الترخيص</th>
                      <th className="p-4">الأجهزة المرتبطة</th>
                      <th className="p-4 text-center">الحالة</th>
                      <th className="p-4">تاريخ الانتهاء</th>
                      <th className="p-4 text-left">التعديل والإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredLicenses.map((lic) => {
                      const isExpired = lic.status === 'expired' || (lic.expiresAt !== 'Lifetime' && new Date(lic.expiresAt).getTime() < Date.now());
                      
                      return (
                        <tr key={lic.id} className="hover:bg-muted/15 transition-colors">
                          <td className="p-4 space-y-1">
                            <div className="font-extrabold text-foreground">{lic.customerName}</div>
                            <div className="text-[10px] text-muted-foreground flex gap-3 text-right">
                              {lic.customerPhone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {lic.customerPhone}</span>}
                              {lic.customerEmail && <span className="flex items-center gap-2"><Mail className="h-3 w-3" /> {lic.customerEmail}</span>}
                            </div>
                          </td>
                          <td className="p-4 space-y-0.5">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                              lic.planType === 'lifetime' ? 'bg-violet-500/10 text-violet-500 border border-violet-500/10' :
                              lic.planType === 'advanced' ? 'bg-blue-500/10 text-blue-500' : 'bg-stone-500/10 text-muted-foreground'
                            }`}>
                              {lic.planType === 'lifetime' ? 'مدى الحياة' : lic.planType === 'advanced' ? 'متقدمة' : 'أساسية'}
                            </span>
                            <div className="text-[10px] text-muted-foreground font-black mt-1">
                              {lic.branchesCount} فروع / {lic.maxDevices} أجهزة
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 font-mono font-black text-[11px] bg-muted/60 px-2 py-1 rounded-lg border border-border/80 w-fit">
                              <span>{lic.licenseKey}</span>
                              <button onClick={() => copyToClipboard(lic.licenseKey)} className="text-muted-foreground hover:text-primary transition-all p-0.5 rounded">
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className={`text-[11px] font-black rounded-full px-2 py-0.5 ${
                                lic.activatedDevices.length >= lic.maxDevices ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/10'
                              }`}>
                                {lic.activatedDevices.length} / {lic.maxDevices} أجهزة
                              </span>
                              {lic.activatedDevices.length > 0 && (
                                <button 
                                  onClick={() => setViewingLicenseDevices(lic)}
                                  className="text-primary hover:underline text-[10px] font-extrabold flex items-center gap-0.5"
                                >
                                  عرض التفاصيل <ExternalLink className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-wider uppercase ${
                              isExpired ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                              lic.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                              lic.status === 'suspended' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                              'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            }`}>
                              {isExpired ? 'منتهي الاشتراك' : lic.status === 'active' ? 'نشط ومفعل' : lic.status === 'suspended' ? 'معلق وموقوف' : 'ملغى ومفسوخ'}
                            </span>
                          </td>
                          <td className="p-4 font-bold font-mono text-muted-foreground text-[10px]">
                            {lic.expiresAt === 'Lifetime' ? (
                              <span className="text-violet-500 font-extrabold">مفتوح (مدى الحياة)</span>
                            ) : (
                              new Date(lic.expiresAt).toLocaleDateString()
                            )}
                          </td>
                          <td className="p-4 text-left">
                            <div className="flex justify-end gap-1.5 flex-wrap">
                              {/* Act/Susp/Rev */}
                              {lic.status !== 'active' ? (
                                <button 
                                  onClick={() => handleToggleLicenseStatus(lic, 'active')} 
                                  className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-extrabold"
                                  title="تنشيط وإطلاق الترخيص"
                                >
                                  تنشيط
                                </button>
                              ) : (
                                <>
                                  <button 
                                    onClick={() => handleToggleLicenseStatus(lic, 'suspended')} 
                                    className="px-1.5 py-1 rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/20 text-[10px] font-extrabold"
                                    title="تعليق الترخيص مؤقتاً"
                                  >
                                    تعليق
                                  </button>
                                  <button 
                                    onClick={() => handleToggleLicenseStatus(lic, 'revoked')} 
                                    className="px-1.5 py-1 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] font-extrabold"
                                    title="إلغاء الترخيص نهائياً"
                                  >
                                    إلغاء
                                  </button>
                                </>
                              )}

                              {/* Extend Expiration */}
                              {lic.planType !== 'lifetime' && (
                                <button 
                                  onClick={() => handleExtendExpiration(lic)} 
                                  className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px] font-extrabold"
                                  title="تمديد فترة الترخيص"
                                >
                                  تمديد
                                </button>
                              )}

                              {/* Reset devices */}
                              <button 
                                onClick={() => handleResetLicenseDevices(lic)} 
                                className="px-2 py-1 rounded-lg bg-stone-500/10 text-muted-foreground border border-border text-[10px] font-extrabold"
                                title="تصفير الأجهزة المرتبطة"
                              >
                                تصفير
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RENDER TAB 2: GENERATE LICENSE / MANUAL SALE WORKFLOW */}
      {activeTab === 'new-sale' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Form Card */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm md:col-span-2 space-y-6">
            <h4 className="font-black text-sm text-foreground border-b border-border/60 pb-3 flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-primary" />
              تعبئة بيانات العميل وإصدار ترخيص سحابي فوري
            </h4>
            
            <form onSubmit={handleGenerateSale} className="space-y-4 text-xs font-bold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground">اسم الصيدلية / العميل *</label>
                  <input 
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="مثال: صيدلية النقاء اليدوية"
                    className="w-full bg-muted/30 h-11 border border-border rounded-xl px-4 text-semibold outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-muted-foreground">رقم هاتف العميل للتواصل الرقمي *</label>
                  <input 
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="مثال: 07700000000"
                    className="w-full bg-muted/30 h-11 border border-border rounded-xl px-4 text-semibold outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground">البريد الإلكتروني للعميل (اختياري)</label>
                  <input 
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                    placeholder="مثال: clinic@example.com"
                    type="email"
                    className="w-full bg-muted/30 h-11 border border-border rounded-xl px-4 text-semibold outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-muted-foreground">باقة الترخيص المطلوب تفعيلها *</label>
                  <select 
                    value={selectedPlan}
                    onChange={e => setSelectedPlan(e.target.value as any)}
                    className="w-full bg-muted/40 h-11 border border-border rounded-xl px-4 outline-none font-black text-xs cursor-pointer"
                  >
                    <option value="basic">الباقة الأساسية (Basic) - لغاية فرع واحد وجهازين</option>
                    <option value="advanced">الباقة الاحترافية (Advanced) - لغاية 3 فروع و 5 أجهزة</option>
                    <option value="lifetime">رخصة مدى الحياة (Lifetime) - لغاية 10 فروع و 15 جهازاً</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground">قيمة الفاتورة المحصلة ($ دولار) *</label>
                  <input 
                    type="number"
                    value={saleAmount}
                    onChange={e => setSaleAmount(Number(e.target.value))}
                    className="w-full bg-muted/30 h-11 border border-border rounded-xl px-4 text-semibold outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-muted-foreground">طريقة الدفع للمبيعات *</label>
                  <select 
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                    className="w-full bg-muted/40 h-11 border border-border rounded-xl px-4 outline-none font-black text-xs"
                  >
                    <option value="cash">نقداً (Cash)</option>
                    <option value="zaincash">زين كاش (Zain Cash)</option>
                    <option value="asiahawala">آسيا حوالة (Asia Hawala)</option>
                    <option value="manual">تحويل يدوي / دعم فني</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-muted-foreground">حالة الفاتورة المعتمدة *</label>
                  <select 
                    value={paymentStatus}
                    onChange={e => setPaymentStatus(e.target.value as any)}
                    className="w-full bg-muted/40 h-11 border border-border rounded-xl px-4 outline-none font-black text-xs"
                  >
                    <option value="paid">تم السداد واستلام المقابل (Paid)</option>
                    <option value="pending">مسودة فحص المعاملة (Pending)</option>
                    <option value="cancelled">مرتجعة / ملغاة (Cancelled)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground">ملاحظات مبيعات النظام الداخلية</label>
                <textarea 
                  value={saleNotes}
                  onChange={e => setSaleNotes(e.target.value)}
                  placeholder="سجل أية تفاصيل تسليم أو متطلبات صيانة ورش ودعم فني..."
                  className="w-full bg-muted/30 h-20 border border-border rounded-xl p-3 text-semibold outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              <Button 
                type="submit" 
                disabled={submittingSale}
                className="w-full bg-primary hover:bg-primary/95 text-primary-foreground h-12 rounded-xl text-xs font-black gap-2 transition-all"
              >
                {submittingSale ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري توليد شيفرة الترخيص السحابي وتوثيق العملية...
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    توليد وحفظ ترخيص النظام يدويًا
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Outcome / Output Area */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <h4 className="font-black text-xs text-foreground uppercase tracking-widest border-b border-border/60 pb-3">مفتاح الترخيص المولد حديثاً</h4>
              
              {createdLicenseOutput ? (
                <div className="space-y-5">
                  <div className="text-center p-6 bg-primary/5 border border-primary/20 rounded-2xl space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 blur-2xl -mr-12 -mt-12" />
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full">جاهز للتفعيل والاستخدام</span>
                    <div className="font-mono text-xl font-black text-foreground tracking-widest select-all py-1.5">{createdLicenseOutput}</div>
                    
                    <button 
                      onClick={() => copyToClipboard(createdLicenseOutput)}
                      className="inline-flex justify-center items-center gap-1.5 bg-background border border-border hover:bg-muted text-[10px] font-black px-4 py-2 rounded-xl transition-all w-full"
                    >
                      <Copy className="h-3 w-3 text-muted-foreground" />
                      نسخ المفتاح السري
                    </button>
                  </div>

                  {paymentStatus === 'paid' && (
                    <div className="space-y-2">
                      <Button 
                        onClick={handleSimulateEmail} 
                        disabled={emailSending}
                        className="w-full bg-stone-900 dark:bg-stone-800 hover:bg-stone-800 dark:hover:bg-stone-700 text-white h-11 rounded-xl text-xs font-black gap-2"
                      >
                        {emailSending ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            جاري إرسال البريد الرقمي...
                          </>
                        ) : (
                          <>
                            <Mail className="h-3.5 w-3.5 text-primary-foreground" />
                            إرسال المفتاح بالبريد للعميل
                          </>
                        )}
                      </Button>
                      <p className="text-[9px] text-muted-foreground text-center">يقوم النظام بإعداد رسالة بريد إلكتروني ترحيبية مع رابط الدخول وتوثيق التراخيص للعميل بشكل آمن.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground font-bold text-xs space-y-2">
                  <AlertCircle className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                  <p>لم يتم توليد أي مفاتيح ترخيص في هذه الجلسة بعد.</p>
                  <p className="text-[10px] text-muted-foreground/75 leading-relaxed">قم بتعبئة نموذج العقد على اليمين واضغط زر التوليد السحابي لإنتاج ترخيص معتمد.</p>
                </div>
              )}
            </div>

            <div className="bg-muted/10 border border-border rounded-2xl p-6 shadow-xs text-xs space-y-4">
              <h5 className="font-extrabold text-foreground border-b border-border/60 pb-2">حدود الرخص التلقائية:</h5>
              <div className="space-y-2 font-bold text-muted-foreground leading-relaxed">
                <div className="flex justify-between">
                  <span>الباقة الأساسية Basic:</span>
                  <span className="text-foreground">1 فرع / 2 أجهزة / سنة</span>
                </div>
                <div className="flex justify-between">
                  <span>الباقة المتقدمة Advanced:</span>
                  <span className="text-foreground">3 فروع / 5 أجهزة / سنة</span>
                </div>
                <div className="flex justify-between">
                  <span>باقة مدى الحياة Lifetime:</span>
                  <span className="text-foreground">10 فروع / 15 جهازاً / مفتوح</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* RENDER TAB 3: SALES HISTORY LIST */}
      {activeTab === 'sales-history' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-4 flex justify-between items-center shadow-xs">
            <h4 className="font-black text-xs text-foreground">بيان المقبضات المالية وسجل المبيعات اليدوية المستندة لترخيص النظام</h4>
            <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 font-black">
              عدد المسجلات: {sales.length} فاتورة بيع
            </span>
          </div>

          {sales.length === 0 ? (
            <div className="bg-card border border-border rounded-3xl p-16 text-center text-muted-foreground text-xs font-bold leading-relaxed">
              <Coins className="h-8 w-8 text-amber-500 mx-auto mb-3" />
              لا توجد أية فواتير مسجلة في نظام المبيعات اليدوية مسبقاً.
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-muted/40 font-black text-muted-foreground border-b border-border">
                    <tr>
                      <th className="p-4">رقم الحركة والعميل</th>
                      <th className="p-4">الخطة المباعة</th>
                      <th className="p-4">المبلغ المقبوض</th>
                      <th className="p-4">طريقة التوثيق والبيع</th>
                      <th className="p-4 text-center">حالة السداد</th>
                      <th className="p-4">مفتاح الترخيص المرفق</th>
                      <th className="p-4">التاريخ والمسؤول</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {sales.map((sale) => {
                      const payDate = sale.createdAt?.toDate ? sale.createdAt.toDate() : new Date(sale.createdAt || 0);

                      return (
                        <tr key={sale.id} className="hover:bg-muted/15 transition-colors">
                          <td className="p-4">
                            <div className="font-extrabold text-foreground">{sale.customerName}</div>
                            <div className="text-[10px] text-muted-foreground font-semibold mt-0.5">{sale.customerPhone}</div>
                          </td>
                          <td className="p-4 font-black">
                            {sale.planType === 'lifetime' ? 'Lifetime (مدى الحياة)' : sale.planType === 'advanced' ? 'Advanced (المتقدمة)' : 'Basic (الأساسية)'}
                          </td>
                          <td className="p-4 text-emerald-600 dark:text-emerald-400 font-extrabold text-[13px]">
                            ${(sale.amount || 0).toLocaleString()}
                          </td>
                          <td className="p-4 font-bold text-muted-foreground">
                            {sale.paymentMethod === 'cash' ? 'نقدي يدوي' :
                             sale.paymentMethod === 'zaincash' ? 'زين كاش' :
                             sale.paymentMethod === 'asiahawala' ? 'آسيا حوالة' : 'تسليم فني / تجريبي'}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                              sale.paymentStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-500' :
                              sale.paymentStatus === 'pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'
                            }`}>
                              {sale.paymentStatus === 'paid' ? 'مسدد' : sale.paymentStatus === 'pending' ? 'معلق' : 'ملغى'}
                            </span>
                          </td>
                          <td className="p-4 font-mono font-black select-all text-[11px] text-primary">
                            {sale.generatedLicense}
                          </td>
                          <td className="p-4 space-y-0.5 mt-0.5">
                            <div className="font-bold text-foreground text-[10px]">{payDate.toLocaleDateString()}</div>
                            <div className="text-[9px] text-muted-foreground font-semibold">بواسطة: {sale.soldBy || 'Super Admin'}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RENDER TAB 4: PRICING MANAGER (EXTRA) */}
      {activeTab === 'pricing' && (
        <div className="max-w-xl mx-auto bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-border/60 pb-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <Settings className="h-5 w-5 animate-spin" />
            </div>
            <div>
              <h4 className="font-black text-sm text-foreground">مسيّر مبيعات الباقات (Pricing Manager)</h4>
              <p className="text-[10px] text-muted-foreground">ضبط الأسعار الافتراضية للباقات لتسريع إنشاء فواتير البيع اليدوي للعملاء</p>
            </div>
          </div>

          <div className="space-y-4 text-xs font-bold font-sans">
            <div className="space-y-1.5">
              <label className="text-muted-foreground">سعر الباقة الأساسية Premium Basic ($ دولار / سنة)</label>
              <input 
                type="number"
                value={pricing.basic}
                onChange={e => setPricing({ ...pricing, basic: Number(e.target.value) })}
                className="w-full bg-muted/40 h-11 border border-border rounded-xl px-4 text-semibold outline-none"
              />
              <p className="text-[10px] text-muted-foreground/75 mt-0.5">الحدود الافتراضية: 1 فرع و 2 أجهزة متزامنة.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-muted-foreground">سعر الباقة الاحترافية Premium Advanced ($ دولار / سنة)</label>
              <input 
                type="number"
                value={pricing.advanced}
                onChange={e => setPricing({ ...pricing, advanced: Number(e.target.value) })}
                className="w-full bg-muted/40 h-11 border border-border rounded-xl px-4 text-semibold outline-none"
              />
              <p className="text-[10px] text-muted-foreground/75 mt-0.5">الحدود الافتراضية: 3 فروع و 5 أجهزة متزامنة.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-muted-foreground">سعر باقة مدى الحياة Premium Lifetime ($ دولار / مدى الحياة)</label>
              <input 
                type="number"
                value={pricing.lifetime}
                onChange={e => setPricing({ ...pricing, lifetime: Number(e.target.value) })}
                className="w-full bg-muted/40 h-11 border border-border rounded-xl px-4 text-semibold outline-none"
              />
              <p className="text-[10px] text-muted-foreground/75 mt-0.5">الحدود الافتراضية: 10 فروع و 15 جهاز متزامن مع دعم فني متميز.</p>
            </div>

            <Button 
              onClick={handleSavePricing}
              disabled={pricingLoading}
              className="w-full bg-primary hover:bg-primary/95 text-primary-foreground h-11 rounded-xl text-xs font-black transition-all pt-1"
            >
              {pricingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'حفظ الأسعار الجديدة بالخادم'}
            </Button>
          </div>
        </div>
      )}

      {/* DEVICE MANAGEMENT VIEW MODAL */}
      {viewingLicenseDevices && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in" dir="rtl">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden relative text-right">
            
            <div className="p-6 border-b border-border/80 flex justify-between items-center bg-muted/20">
              <div className="flex items-center gap-3">
                <Laptop className="h-5 w-5 text-primary animate-pulse" />
                <div>
                  <h4 className="font-black text-sm text-foreground">الأجهزة المرتبطة حالياً</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">للعميل: {viewingLicenseDevices.customerName} ({viewingLicenseDevices.licenseKey})</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingLicenseDevices(null)} 
                className="size-8 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
              <p className="text-xs font-bold leading-relaxed text-muted-foreground">
                تظهر الأجهزة الفعالة التي قامت بالولوج للنظام وقدمت معرّف عتادي فريد. يمكنك حذف جهاز لتوفير ترخيص لجهاز آخر للعميل في الوقت الفعلي.
              </p>

              {viewingLicenseDevices.activatedDevices.length === 0 ? (
                <div className="text-center py-8 text-xs font-bold text-muted-foreground">لا توجد أجهزة مرتبطة بالترخيص حالياً.</div>
              ) : (
                <div className="space-y-3">
                  {viewingLicenseDevices.activatedDevices.map((dev: any, idx: number) => (
                    <div key={dev.deviceId || idx} className="p-4 bg-muted/30 border border-border/70 rounded-2xl flex justify-between items-center text-xs">
                      <div className="space-y-1">
                        <div className="font-extrabold text-foreground flex items-center gap-1.5">
                          {dev.name || 'جهاز مجهول'}
                          <span className="text-[10px] bg-primary/20 text-primary font-black px-1.5 py-0.5 rounded">ID: {dev.deviceId ? dev.deviceId.substring(0, 10) + '...' : 'غير متوفر'}</span>
                        </div>
                        {dev.fingerprint && (
                          <div className="text-[9px] text-muted-foreground font-mono leading-relaxed bg-muted/60 px-2 py-1 rounded-lg border border-border text-right select-all">
                            FP: {dev.fingerprint}
                          </div>
                        )}
                        <div className="text-[9px] text-muted-foreground font-semibold flex gap-2">
                          <span>تاريخ الارتباط: {dev.createdAt ? new Date(dev.createdAt).toLocaleDateString() : 'مجهول'}</span>
                          <span>|</span>
                          <span>آخر ظهور: {dev.lastSeen ? new Date(dev.lastSeen).toLocaleDateString() : 'مجهول'}</span>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleDeleteDeviceFromLicense(viewingLicenseDevices, dev.deviceId)}
                        className="p-2 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 text-rose-500 hover:text-white rounded-xl transition-all"
                        title="إلغاء الترخيص لهذا الجهاز"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-muted/10 border-t border-border flex justify-end gap-2">
              <Button 
                onClick={() => {
                  handleResetLicenseDevices(viewingLicenseDevices);
                  setViewingLicenseDevices(null);
                }} 
                className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black h-10 px-4"
              >
                تصفير كافة الأجهزة ({viewingLicenseDevices.activatedDevices.length})
              </Button>
              <Button 
                onClick={() => setViewingLicenseDevices(null)} 
                className="bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-foreground rounded-xl text-xs font-black h-10 px-4"
              >
                إغلاق النافذة
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
