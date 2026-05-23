import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  setDoc, 
  deleteDoc,
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Search, 
  ShieldAlert, 
  Users, 
  Award, 
  Edit, 
  Plus, 
  RotateCw, 
  Save, 
  X, 
  Phone, 
  Mail, 
  Laptop, 
  Building2, 
  CheckCircle, 
  Clock,
  UserCheck,
  Power,
  ShieldCheck,
  KeyRound,
  Trash2,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { hashPassword } from '../services/customAuthService';

interface SaaSUser {
  userId: string;
  id?: string;
  fullName: string;
  email: string;
  phone: string;
  isActive: boolean;
  status: 'pending' | 'verified';
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  licenseCode: string;
  activationStatus: 'active' | 'blocked' | 'expired';
  planType: 'basic' | 'advanced' | 'lifetime';
  maxDevices: number;
  branchesCount: number;
  role: string;
  passwordHash?: string;

  // One-time Licensing Parameters
  activatedAt?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'users' | 'keys'>('users');
  const [users, setUsers] = useState<SaaSUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<SaaSUser | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // New User custom form states for manual registration helper
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPlanType, setNewPlanType] = useState<'basic' | 'advanced' | 'lifetime'>('basic');
  const [newRole, setNewRole] = useState<'admin' | 'manager' | 'user'>('manager');

  // Key Generator Form states
  const [keys, setKeys] = useState<any[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [genPlanType, setGenPlanType] = useState<'basic' | 'advanced' | 'lifetime'>('basic');
  const [genMaxDevices, setGenMaxDevices] = useState(2);
  const [genBranchesCount, setGenBranchesCount] = useState(1);

  // Load all users from firestore
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'appUsers');
      const snap = await getDocs(usersRef);
      const loaded: SaaSUser[] = [];
      snap.forEach((doc) => {
        loaded.push(doc.data() as SaaSUser);
      });
      // Sort users by latest first
      loaded.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
      setUsers(loaded);
    } catch (err) {
      console.error('Failed to load SaaS users from Firestore:', err);
      toast.error('فشل في جلب قائمة المستخدمين والتراخيص من السيرفر الرئيسي');
    } finally {
      setLoading(false);
    }
  };

  const fetchKeys = async () => {
    setLoadingKeys(true);
    try {
      const snap = await getDocs(collection(db, 'activationCodes'));
      const loaded: any[] = [];
      snap.forEach(docSnap => {
        const d = docSnap.data();
        let formattedDate = d.createdAt;
        if (d.createdAt && typeof d.createdAt.toDate === 'function') {
          formattedDate = d.createdAt.toDate().toISOString();
        } else if (d.createdAt && d.createdAt.seconds) {
          formattedDate = new Date(d.createdAt.seconds * 1000).toISOString();
        }
        loaded.push({
          id: docSnap.id,
          ...d,
          createdAt: formattedDate || new Date().toISOString()
        });
      });
      // Sort keys latest first
      loaded.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
      setKeys(loaded);
    } catch (err) {
      console.error('Failed to load Activation keys from Firestore:', err);
      toast.error('فشل في جلب مفاتيح الترخيص مسبقة الدفع');
    } finally {
      setLoadingKeys(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchKeys();
  }, []);

  const handleGenerateLicenseCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const prefix = 'LIC';
      const randPart1 = Math.random().toString(36).substring(2, 8).toUpperCase();
      const randPart2 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const generatedCode = `${prefix}-${randPart1}-${randPart2}`;

      const keyId = doc(collection(db, 'activationCodes')).id;

      let dev = genMaxDevices;
      let br = genBranchesCount;
      if (genPlanType === 'advanced') {
        dev = 10;
        br = 5;
      } else if (genPlanType === 'lifetime') {
        dev = 99;
        br = 15;
      }

      await setDoc(doc(db, 'activationCodes', keyId), {
        id: keyId,
        code: generatedCode,
        planType: genPlanType,
        maxDevices: dev,
        branchesCount: br,
        activationStatus: 'active',
        isUsed: false,
        createdAt: new Date(),
        assignedEmail: ''
      });

      toast.success(`تم إنشاء كود الترخيص (${generatedCode}) بنجاح!`);
      setIsGenModalOpen(false);
      fetchKeys();
    } catch (err: any) {
      console.error('Error generating activation code:', err);
      toast.error('حدث خطأ أثناء حفظ كود الترخيص: ' + err.message);
    }
  };

  const handleDeleteLicenseKey = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف مفتاح الترخيص مسبق الدفع هذا؟ لن يتمكن المستخدمون المتطابقون من استخدامه.')) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'activationCodes', id));
      toast.success('تم حذف مفتاح الترخيص بنجاح من قاعدة البيانات.');
      fetchKeys();
    } catch (err: any) {
      console.error('Failed to delete activation code:', err);
      toast.error('فشل في حذف كود الترخيص: ' + err.message);
    }
  };

  const handleToggleLicenseKeyStatus = async (keyObj: any, newStatus: 'active' | 'blocked' | 'expired') => {
    try {
      await updateDoc(doc(db, 'activationCodes', keyObj.id), {
        activationStatus: newStatus,
        updatedAt: new Date()
      });
      toast.success(`تم تحديث حالة الكود إلى ${newStatus === 'active' ? 'نشط' : newStatus === 'blocked' ? 'محظور' : 'منتهي الصلاحية'}`);
      fetchKeys();
    } catch (err: any) {
      toast.error('فشل تحديث حالة الترخيص: ' + err.message);
    }
  };

  // Filtered users search logic
  const filteredUsers = users.filter(u => {
    const term = searchTerm.toLowerCase();
    const matchSearch = 
      (u.fullName || '').toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term) ||
      (u.phone || '').includes(term) ||
      (u.licenseCode || '').toLowerCase().includes(term);
    
    const matchPlan = selectedPlanFilter === 'all' || u.planType === selectedPlanFilter;
    return matchSearch && matchPlan;
  });

  // Calculate high-fidelity metrics
  const totalUsersCount = users.length;
  const verifiedUsersCount = users.filter(u => u.status === 'verified').length;
  const basicCount = users.filter(u => u.planType === 'basic').length;
  const advancedCount = users.filter(u => u.planType === 'advanced').length;
  const lifetimeCount = users.filter(u => u.planType === 'lifetime').length;

  // Handle updates in Firestore
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const userDocRef = doc(db, 'appUsers', selectedUser.userId);
      
      const payload: Partial<SaaSUser> = {
        fullName: selectedUser.fullName,
        phone: selectedUser.phone,
        role: selectedUser.role,
        isActive: selectedUser.isActive,
        planType: selectedUser.planType,
        maxDevices: Number(selectedUser.maxDevices),
        branchesCount: Number(selectedUser.branchesCount),
        licenseCode: selectedUser.licenseCode,
        activationStatus: selectedUser.activationStatus,
        updatedAt: new Date().toISOString(),
        customerName: selectedUser.fullName,
        customerPhone: selectedUser.phone,
        customerEmail: selectedUser.email,
        activatedAt: selectedUser.activatedAt || new Date().toISOString()
      };

      await updateDoc(userDocRef, payload);
      toast.success('تم حفظ التعديلات وتحديث ترخيص المستخدم بنجاح على قاعدة البيانات السحابية.');
      setIsEditModalOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      console.error('Update user failed:', err);
      toast.error('حدث خطأ أثناء حفظ التعديلات: ' + err.message);
    }
  };

  // Create a user manually
  const handleCreateUserManually = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newEmail.trim() || !newPhone.trim() || !newPassword) {
      toast.error('يرجى تعبئة كافة الحقول لإنشاء الحساب');
      return;
    }

    try {
      // Check duplicate
      const emailLower = newEmail.trim().toLowerCase();
      const phoneClean = newPhone.trim();
      const duplicate = users.find(u => u.email === emailLower || u.phone === phoneClean);
      if (duplicate) {
        toast.error('البريد الإلكتروني أو الهاتف مسجل مسبقاً لمستخدم آخر');
        return;
      }

      const generatedId = 'u_' + Math.random().toString(36).substr(2, 9);
      const hashedPass = await hashPassword(newPassword);

      // Define default limits based on selected plan
      let maxDevices = 2;
      let branchesCount = 1;
      if (newPlanType === 'advanced') {
        maxDevices = 10;
        branchesCount = 5;
      } else if (newPlanType === 'lifetime') {
        maxDevices = 99;
        branchesCount = 15;
      }

      const newUser: SaaSUser = {
        userId: generatedId,
        id: generatedId,
        fullName: newFullName.trim(),
        email: emailLower,
        phone: phoneClean,
        passwordHash: hashedPass,
        isActive: true,
        status: 'verified', // Pre-verified via Admin manual onboarding
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLogin: '',
        licenseCode: 'LIC-' + Math.random().toString(36).substring(2, 11).toUpperCase(),
        activationStatus: 'active',
        planType: newPlanType,
        maxDevices,
        branchesCount,
        role: newRole,
        activatedAt: new Date().toISOString(),
        customerName: newFullName.trim(),
        customerPhone: phoneClean,
        customerEmail: emailLower
      };

      await setDoc(doc(db, 'appUsers', newUser.userId), newUser);
      toast.success('تم تفعيل وترخيص الحساب الجديد ورفعه على السحاب بنجاح.');
      
      // Reset form
      setNewFullName('');
      setNewEmail('');
      setNewPhone('');
      setNewPassword('');
      setIsAddModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      console.error('Error creating user manually:', err);
      toast.error('فشل تفعيل الحساب: ' + err.message);
    }
  };

  // Generate random new license key
  const generateLicenseKey = () => {
    if (selectedUser) {
      const randKey = 'LIC-' + Math.random().toString(36).substring(2, 11).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      setSelectedUser({ ...selectedUser, licenseCode: randKey });
      toast.info('تم توليد مفتاح ترخيص جهاز جديد. احفظ التعديلات للتثبيت.');
    }
  };

  return (
    <div className="space-y-6 pt-2 pb-14" dir="rtl">
      {/* Central Header */}
      <div className="bg-gradient-to-r from-purple-900/40 via-primary/5 to-background border border-border p-6 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-primary/10 blur-3xl -ml-16 -mt-16 animate-pulse" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 text-[10px] bg-red-500/15 text-red-500 rounded-lg font-black tracking-tight animate-pulse flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> لوحة المشرف العام (SaaS Master)
              </span>
              <span className="text-xs text-muted-foreground">• مركزي ومؤمن تلقائياً</span>
            </div>
            <h2 className="text-2xl font-black text-foreground">إدارة العملاء وتراخيص الصيدليات السحابية</h2>
            <p className="text-muted-foreground text-xs font-medium">
              التحكم في الباقات التجارية وقنوات التفعيل وحالة اتصال الأجهزة والفروع لجميع الصيدليات المسجلة.
            </p>
          </div>

          <div className="flex gap-2 shrink-0">
            <button 
              onClick={fetchUsers}
              className="px-4 h-11 bg-muted/40 text-foreground border border-border rounded-xl hover:bg-muted text-xs font-bold transition-all flex items-center gap-2"
            >
              <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              تحديث البيانات
            </button>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 h-11 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-primary/15"
            >
              <Plus className="h-4.5 w-4.5" />
              تفعيل حساب تجاري مباشر
            </button>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-border mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`px-5 py-3 border-b-2 text-sm font-black transition-all ${activeTab === 'users' ? 'border-primary text-primary font-boldScale' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>إدارة صيدليات المشتركين ({users.length})</span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('keys');
            fetchKeys();
          }}
          className={`px-5 py-3 border-b-2 text-sm font-black transition-all ${activeTab === 'keys' ? 'border-primary text-primary font-boldScale' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            <span>توليد ومخزن مفاتيح التفعيل المسبقة ({keys.length})</span>
          </div>
        </button>
      </div>

      {activeTab === 'users' ? (
        <>
          {/* Central Bento Indicators */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total Registered */}
            <div className="bg-card border border-border p-4 rounded-2xl relative overflow-hidden space-y-1">
              <span className="text-[10px] text-muted-foreground font-semibold block">إجمالي رخص الصيدليات</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">{totalUsersCount}</span>
                <span className="text-[10px] text-muted-foreground">صيدليات</span>
              </div>
              <p className="text-[9px] text-muted-foreground leading-none pt-1">مسجلين في السحابة</p>
            </div>

            {/* Verified Count */}
            <div className="bg-card border border-border p-4 rounded-2xl relative overflow-hidden space-y-1">
              <span className="text-[10px] text-emerald-500 font-semibold block">الحسابات المفعّلة</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-500">{verifiedUsersCount}</span>
                <span className="text-[10px] text-muted-foreground">نشط</span>
              </div>
              <p className="text-[9px] text-muted-foreground leading-none pt-1">أكملوا التحقق عبر OTP</p>
            </div>

            {/* Basic plan Users */}
            <div className="bg-card border border-border p-4 rounded-2xl relative overflow-hidden space-y-1">
              <span className="text-[10px] text-primary font-semibold block">الباقة الأساسية</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-primary">{basicCount}</span>
                <span className="text-[10px] text-muted-foreground">حسابات</span>
              </div>
              <p className="text-[9px] text-muted-foreground leading-none pt-1">جهازين / فرع واحد</p>
            </div>

            {/* Advanced plan Users */}
            <div className="bg-card border border-border p-4 rounded-2xl relative overflow-hidden space-y-1">
              <span className="text-[10px] text-indigo-500 font-semibold block">الباقة المتقدمة</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-indigo-500">{advancedCount}</span>
                <span className="text-[10px] text-muted-foreground">مجموعات</span>
              </div>
              <p className="text-[9px] text-muted-foreground leading-none pt-1">10 أجهزة / 5 فروع</p>
            </div>

            {/* Lifetime Users */}
            <div className="bg-card border border-border p-4 rounded-2xl relative overflow-hidden space-y-1">
              <span className="text-[10px] text-amber-500 font-semibold block">باقة مدى الحياة</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-500">{lifetimeCount}</span>
                <span className="text-[10px] text-muted-foreground">مستمر</span>
              </div>
              <p className="text-[9px] text-muted-foreground leading-none pt-1">ترخيص دائم للأبد</p>
            </div>
          </div>

          {/* Database Search & Actions */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-4 bg-muted/30 border-b border-border flex flex-col sm:flex-row gap-3 justify-between items-center">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="ابحث باسم المشترك، البريد، الهاتف، أو مفتاح الترخيص..."
                  className="w-full h-10 pr-9 bg-background text-xs border border-border rounded-xl focus:border-primary focus:outline-none placeholder:text-muted-foreground/60 text-foreground"
                />
              </div>

              <div className="flex gap-2 w-full sm:w-auto self-stretch sm:self-center justify-end">
                <select 
                  value={selectedPlanFilter}
                  onChange={e => setSelectedPlanFilter(e.target.value)}
                  className="h-10 px-3 bg-background border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none"
                >
                  <option value="all">كل مستويات الرخص التفعيلية</option>
                  <option value="basic">الباقة الأساسية</option>
                  <option value="advanced">الباقة المتقدمة</option>
                  <option value="lifetime">باقة مدى الحياة</option>
                </select>
              </div>
            </div>

            {/* Database List */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="py-24 text-center space-y-3">
                  <RotateCw className="h-8 w-8 text-primary animate-spin mx-auto" />
                  <p className="text-xs text-muted-foreground">جاري جلب بيانات التراخيص من السفر السحابي لـ Firebase...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-24 text-center text-muted-foreground space-y-2">
                  <Users className="h-10 w-10 text-muted-foreground opacity-30 mx-auto" />
                  <p className="text-sm font-bold">لا يوجد مستخدمون يطابقون خيارات البحث.</p>
                  <p className="text-xs">تحقق من كتابة الاسم أو الإيميل بشكل صحيح.</p>
                </div>
              ) : (
                <table className="w-full text-right divide-y divide-border text-xs table-auto">
                  <thead className="bg-muted/40 font-bold text-muted-foreground uppercase text-[10px]">
                    <tr>
                      <th className="px-5 py-3.5">الاسم / الصيدلية</th>
                      <th className="px-5 py-3.5">الاتصال والتفعيل</th>
                      <th className="px-5 py-3.5">الباقة المعتمدة</th>
                      <th className="px-5 py-3.5">مفتاح الترخيص (License Key)</th>
                      <th className="px-5 py-3.5">الصلاحيات المسموحة</th>
                      <th className="px-5 py-3.5 text-left">أدوات إدارية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredUsers.map((u) => (
                      <tr key={u.userId} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-black text-foreground text-sm">{u.fullName || 'بدون اسم'}</div>
                          <div className="text-muted-foreground font-mono text-[10px] break-all max-w-[180px] lg:max-w-none">{u.email}</div>
                        </td>
                        <td className="px-5 py-4 space-y-1">
                          <div className="flex items-center gap-1.5">
                            {u.status === 'verified' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                                <CheckCircle className="w-3 h-3" /> مفعّل بالكامل
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[10px] font-bold">
                                <Clock className="w-3 h-3" /> قيد التحقق (OTP)
                              </span>
                            )}

                            {u.isActive ? (
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-500 text-[9px] font-bold">معلق من المشرف</span>
                            )}
                          </div>
                          
                          <div className="text-[10px] text-muted-foreground">
                            رقم الهاتف: <span className="font-mono">{u.phone || 'غير مدخل'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 space-y-1">
                          <div>
                            {u.planType === 'basic' && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-primary/15 text-primary">الباقة الأساسية</span>
                            )}
                            {u.planType === 'advanced' && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-500">الباقة المتقدمة</span>
                            )}
                            {u.planType === 'lifetime' && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/15 text-amber-500">مدى الحياة ✨</span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-medium">
                            نوع الدفع: <span className="font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[9px] font-black">شراء لمرة واحدة</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-mono text-xs font-black text-primary p-1 bg-primary/5 rounded border border-primary/10 inline-block text-right select-all">
                            {u.licenseCode || 'لا يوجد ترخيص معتمد'}
                          </div>
                          <div className="text-[9px] text-muted-foreground">
                            حالة التفعيل: {u.activationStatus === 'active' ? (
                              <span className="text-emerald-500 font-bold">نشط ومقبول</span>
                            ) : u.activationStatus === 'blocked' ? (
                              <span className="text-red-500 font-bold">محظور ومستبعد</span>
                            ) : (
                              <span className="text-amber-500 font-bold">منتهي الصلاحية</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 space-y-1 text-[11px]">
                          <div className="flex items-center gap-1">
                            <Laptop className="h-3 w-3 text-muted-foreground" />
                            <span>الأجهزة المتاحة: <span className="font-bold text-foreground">{u.maxDevices || 2}</span></span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            <span>الفروع المسموحة: <span className="font-bold text-foreground">{u.branchesCount || 1}</span></span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            صلاحية الحساب: <span className="font-black text-foreground">
                              {u.role === 'super_admin' ? 'المدير العام الرئيسي (Super Admin)' : u.role === 'admin' ? 'مطور المسؤول العام' : u.role === 'customer' ? 'العميل العادي (Customer)' : u.role === 'manager' ? 'مدير الصيدلية' : 'مساعد كاشير'}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-left">
                          <button 
                            onClick={() => {
                              setSelectedUser({ ...u });
                              setIsEditModalOpen(true);
                            }}
                            className="px-3 py-1.5 h-8 bg-muted hover:bg-muted/80 border border-border text-foreground rounded-lg font-bold inline-flex items-center gap-1 hover:border-black/20"
                          >
                            <Edit className="h-3.5 w-3.5 text-primary" />
                            تعديل وإدارة الترخيص
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          {/* Key Indicators */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border p-4 rounded-2xl space-y-1">
              <span className="text-[10px] text-muted-foreground font-semibold block">إجمالي مفاتيح التراخيص</span>
              <div className="text-2xl font-black text-foreground">{keys.length}</div>
              <p className="text-[9px] text-muted-foreground pt-1">المولدة في النظام</p>
            </div>
            <div className="bg-card border border-border p-4 rounded-2xl space-y-1">
              <span className="text-[10px] text-emerald-500 font-semibold block">مفاتيح تفعيل مستخدمة</span>
              <div className="text-2xl font-black text-emerald-500">{keys.filter(k => k.isUsed).length}</div>
              <p className="text-[9px] text-muted-foreground pt-1 text-emerald-600">تم تفعيلها على أجهزة</p>
            </div>
            <div className="bg-card border border-border p-4 rounded-2xl space-y-1">
              <span className="text-[10px] text-amber-500 font-semibold block">مفاتيح جاهزة للبيع والتسليم</span>
              <div className="text-2xl font-black text-amber-500">{keys.filter(k => !k.isUsed && k.activationStatus !== 'blocked').length}</div>
              <p className="text-[9px] text-muted-foreground pt-1">بانتظار التحصيل اليدوي</p>
            </div>
            <div className="bg-card border border-border p-4 rounded-2xl space-y-1">
              <span className="text-[10px] text-red-500 font-semibold block">مفاتيح معطلة أو محظورة</span>
              <div className="text-2xl font-black text-red-500">{keys.filter(k => k.activationStatus === 'blocked').length}</div>
              <p className="text-[9px] text-muted-foreground pt-1">ممنوعة من التنشيط</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-sm font-black text-foreground">مولد الترخيص مسبق الدفع (Key Generator)</h3>
                <p className="text-[11px] text-muted-foreground">قم بتوليد كود تفعيل بميزات مخصصة لتقديمه للعميل بعد التحصيل المالي اليدوي.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsGenModalOpen(true)}
                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-lg shadow-primary/10"
              >
                <Plus className="h-4 w-4" />
                توليد كود تفعيل جديد
              </button>
            </div>
          </div>

          {/* Database Keys List */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-4 bg-muted/30 border-b border-border font-bold text-xs text-foreground">
              مخزن مفاتيح التراخيص المسبقة الدفع
            </div>
            <div className="overflow-x-auto">
              {loadingKeys ? (
                <div className="py-24 text-center space-y-3">
                  <RotateCw className="h-8 w-8 text-primary animate-spin mx-auto" />
                  <p className="text-xs text-muted-foreground">جاري جلب مفاتيح التراخيص مسبقة الدفع...</p>
                </div>
              ) : keys.length === 0 ? (
                <div className="py-24 text-center text-muted-foreground space-y-2">
                  <KeyRound className="h-10 w-10 text-muted-foreground opacity-30 mx-auto" />
                  <p className="text-sm font-bold">لا يوجد مفاتيح تراخيص مسبقة في قاعدة البيانات.</p>
                  <p className="text-xs">اضغط على زر (توليد كود تفعيل جديد) بالأعلى للبدء.</p>
                </div>
              ) : (
                <table className="w-full text-right divide-y divide-border text-xs table-auto">
                  <thead className="bg-muted/40 font-bold text-muted-foreground uppercase text-[10px]">
                    <tr>
                      <th className="px-5 py-3.5">مفتاح الترخيص (License Code)</th>
                      <th className="px-5 py-3.5">باقة الترخيص ومستويات الدعم</th>
                      <th className="px-5 py-3.5">الحالة وسياق الاستخدام</th>
                      <th className="px-5 py-3.5">الحالة الأمنية وتعديلها</th>
                      <th className="px-5 py-3.5">تاريخ الإنشاء</th>
                      <th className="px-5 py-3.5 text-center">خيارات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {keys.map((k) => (
                      <tr key={k.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-primary p-1 px-2 bg-primary/5 rounded border border-primary/10 select-all">
                              {k.code}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(k.code);
                                toast.success('تم نسخ كود التفعيل إلى الحافظة!');
                              }}
                              className="p-1 hover:bg-muted rounded text-primary hover:text-primary-foreground"
                              title="نسخ الكود"
                            >
                              <Copy className="h-3.5 w-3.5 text-primary" />
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-4 space-y-1">
                          <div>
                            {k.planType === 'basic' && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-primary/15 text-primary">الباقة الأساسية</span>
                            )}
                            {k.planType === 'advanced' && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-500">الباقة المتقدمة</span>
                            )}
                            {k.planType === 'lifetime' && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/15 text-amber-500">مدى الحياة ✨</span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            أجهزة: <span className="font-bold text-foreground">{k.maxDevices || 2}</span> • فروع: <span className="font-bold text-foreground">{k.branchesCount || 1}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {k.isUsed ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                              <CheckCircle className="w-3 h-3" /> مستعمل ({k.assignedEmail})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[10px] font-bold">
                              <Clock className="w-3 h-3" /> جاهز للبيع (غير مستغل)
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <select
                            value={k.activationStatus || 'active'}
                            onChange={(e) => handleToggleLicenseKeyStatus(k, e.target.value as any)}
                            className="bg-muted border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20"
                          >
                            <option value="active">نشط وصالح للتفعيل (Active)</option>
                            <option value="blocked">محظور ومعطل (Blocked)</option>
                            <option value="expired">منتهي الصلاحية (Expired)</option>
                          </select>
                        </td>
                        <td className="px-5 py-4 font-mono text-muted-foreground">
                          {new Date(k.createdAt).toLocaleDateString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteLicenseKey(k.id!)}
                            className="p-1.5 hover:bg-red-500/15 text-red-500 rounded-lg hover:text-red-600 transition-colors"
                            title="حذف الترخيص"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT & RE-LICENSING */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-3xl w-full max-w-lg p-6 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16" />
            
            <div className="flex justify-between items-center relative z-10 border-b border-border pb-3">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <ShieldCheck className="text-primary h-5 w-5" /> إدارة حساب الصيدلية وتعديل الباقة
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4 relative z-10 text-right">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">الاسم الكامل للمشترك</label>
                  <input 
                    type="text"
                    value={selectedUser.fullName}
                    onChange={e => setSelectedUser({ ...selectedUser, fullName: e.target.value })}
                    className="w-full h-10 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">رقم الهاتف للتحقق</label>
                  <input 
                    type="text"
                    value={selectedUser.phone}
                    onChange={e => setSelectedUser({ ...selectedUser, phone: e.target.value })}
                    className="w-full h-10 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">مستوى رخصة التفعيل (Tier)</label>
                  <select 
                    value={selectedUser.planType}
                    onChange={e => {
                      const mode = e.target.value as 'basic' | 'advanced' | 'lifetime';
                      let dev = 2;
                      let br = 1;
                      if (mode === 'advanced') {
                        dev = 10;
                        br = 5;
                      } else if (mode === 'lifetime') {
                        dev = 99;
                        br = 15;
                      }
                      setSelectedUser({ 
                        ...selectedUser, 
                        planType: mode,
                        maxDevices: dev,
                        branchesCount: br
                      });
                    }}
                    className="w-full h-10 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none"
                  >
                    <option value="basic">الباقة الأساسية (جهازين - فرع)</option>
                    <option value="advanced">الباقة المتقدمة (١٠ أجهزة - ٥ فروع)</option>
                    <option value="lifetime">الباقة مدى الحياة (شراء فوري كامل)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">صلاحيات الحساب</label>
                  <select 
                    value={selectedUser.role}
                    onChange={e => setSelectedUser({ ...selectedUser, role: e.target.value })}
                    className="w-full h-10 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none"
                  >
                    <option value="customer">عميل عادي (Customer)</option>
                    <option value="manager">مدير صيدلية (Manager)</option>
                    <option value="user">صيدلي كاشير مساعد (User)</option>
                    <option value="admin">مسؤول معتمد للنظام بأكمله (Admin)</option>
                    <option value="super_admin">مدير النظام السحابي الرئيسي (Super Admin)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1 bg-amber-500/5 p-3 rounded-xl border border-amber-500/20">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-black text-amber-600">مفتاح ترخيص الأمان للبيع (License Code)</label>
                  <button 
                    type="button" 
                    onClick={generateLicenseKey}
                    className="text-[10px] text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold hover:bg-amber-500/20"
                  >
                    تجديد وتوليد مفتاح عشوائي جديد
                  </button>
                </div>
                <input 
                  type="text"
                  value={selectedUser.licenseCode}
                  onChange={e => setSelectedUser({ ...selectedUser, licenseCode: e.target.value })}
                  className="w-full h-10 px-3 font-mono tracking-wider bg-card border border-amber-500/40 rounded-xl text-xs text-primary focus:outline-none text-right select-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">الحد الأقصى للأجهزة المتزامنة</label>
                  <input 
                    type="number"
                    value={selectedUser.maxDevices}
                    onChange={e => setSelectedUser({ ...selectedUser, maxDevices: Number(e.target.value) })}
                    className="w-full h-10 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">الحد الأقصى للفروع الصيدلية المسموحة</label>
                  <input 
                    type="number"
                    value={selectedUser.branchesCount}
                    onChange={e => setSelectedUser({ ...selectedUser, branchesCount: Number(e.target.value) })}
                    className="w-full h-10 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">حالة الحساب</label>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setSelectedUser({ ...selectedUser, isActive: true })}
                      className={`flex-1 h-9 rounded-lg text-[10px] font-bold ${selectedUser.isActive ? 'bg-emerald-500 text-white' : 'bg-muted border border-border text-foreground hover:bg-muted/80'}`}
                    >
                      مفعّل
                    </button>
                    <button 
                      type="button"
                      onClick={() => setSelectedUser({ ...selectedUser, isActive: false })}
                      className={`flex-1 h-9 rounded-lg text-[10px] font-bold ${!selectedUser.isActive ? 'bg-red-500 text-white' : 'bg-muted border border-border text-foreground hover:bg-muted/80'}`}
                    >
                      معطّل
                    </button>
                  </div>
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-bold text-muted-foreground">حالة رخصة التفعيل السحابي (One-Time)</label>
                  <select 
                    value={selectedUser.activationStatus}
                    onChange={e => setSelectedUser({ ...selectedUser, activationStatus: e.target.value as any })}
                    className="w-full h-9 px-2 bg-muted border border-border rounded-lg text-[10px] text-foreground focus:outline-none"
                  >
                    <option value="active">رخصة نشطة ومقبولة (Active)</option>
                    <option value="blocked">رخصة محظورة ومستبعدة (Blocked)</option>
                    <option value="expired">رخصة منتهية الصلاحية (Expired)</option>
                  </select>
                </div>
              </div>

              {/* Display Meta details */}
              <div className="bg-muted/50 p-3 rounded-xl border border-border/80 space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>تاريخ الالتحاق بالمشروع:</span>
                  <span className="font-mono">{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString('ar-EG') : 'غير محدد'}</span>
                </div>
                {selectedUser.activatedAt && (
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>تاريخ تفعيل المنتج (One-time):</span>
                    <span className="font-mono text-emerald-600 font-bold">{new Date(selectedUser.activatedAt).toLocaleString('ar-EG')}</span>
                  </div>
                )}
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>آخر دخول معتمد للنظام:</span>
                  <span className="font-mono text-primary font-bold">{selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString('ar-EG') : 'لم يسجل دخول بعد'}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-border mt-5">
                <button 
                  type="submit"
                  className="flex-1 h-11 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-primary/10"
                >
                  <Save className="h-4 w-4" /> حفظ وإقرار البيانات الجديدة
                </button>
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 h-11 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl text-xs font-bold transition-all"
                >
                  إلغاء التعديل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MANUAL CREATE NEW ACCOUNT BY DEV CONTROL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-3xl w-full max-w-lg p-6 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16" />
            
            <div className="flex justify-between items-center relative z-10 border-b border-border pb-3">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <UserCheck className="text-primary h-5 w-5" /> تسجيل وترخيص حساب عميل صيدلية جديد
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={handleCreateUserManually} className="space-y-4 relative z-10 text-right">
              <p className="text-muted-foreground text-xs font-medium bg-primary/5 p-3 rounded-xl border border-primary/10 leading-relaxed">
                ملاحظة: تتيح لك لوحة المشغل إمكانية الترخيص الفوري المباشر مع تجاوز التحقق برمز الـ OTP عبر تأكيد مدير النظام فقط. سيتم تنشيط حالة الحساب فورياً.
              </p>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">الاسم الكامل للعميل / الصيدلية</label>
                <input 
                  type="text"
                  value={newFullName}
                  onChange={e => setNewFullName(e.target.value)}
                  placeholder="مثال: صيدلية الأمل النموذجية"
                  className="w-full h-11 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none placeholder:text-muted-foreground/50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground animate-pulse">البريد الإلكتروني للعميل</label>
                  <input 
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="customer@pharmacy.com"
                    className="w-full h-11 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none placeholder:text-muted-foreground/50 text-left"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">رقم الهاتف للدعم والمتابعة</label>
                  <input 
                    type="tel"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    className="w-full h-11 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none placeholder:text-muted-foreground/50 text-left"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">مستوى رخصة المنتج المفتوحة</label>
                  <select 
                    value={newPlanType}
                    onChange={e => setNewPlanType(e.target.value as any)}
                    className="w-full h-11 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none"
                  >
                    <option value="basic">الباقة الأساسية (جهازين - فرع)</option>
                    <option value="advanced">الباقة المتقدمة (١٠ أجهزة - ٥ فروع)</option>
                    <option value="lifetime">الباقة مدى الحياة (شراء فوري كامل)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">دور وصلاحية الحساب</label>
                  <select 
                    value={newRole}
                    onChange={e => setNewRole(e.target.value as any)}
                    className="w-full h-11 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none"
                  >
                    <option value="manager">مدير صيدلية (Manager)</option>
                    <option value="user">صيدلي كاشير (User)</option>
                    <option value="admin">مسؤول معتمد للنظام والترخيص (Admin)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">كلمة المرور المبدئية للعميل</label>
                <input 
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-border mt-5">
                <button 
                  type="submit"
                  className="flex-1 h-11 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-primary/10"
                >
                  <Plus className="h-4.5 w-4.5" /> تفعيل الحساب فورياً وبدء الترخيص السحابي
                </button>
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 h-11 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl text-xs font-bold transition-all"
                >
                  إلغاء العملية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GENERATE NEW LICENSE KEY FOR PREPAID SALE */}
      {isGenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-3xl w-full max-w-md p-6 space-y-6 shadow-2xl relative overflow-hidden" dir="rtl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16" />
            
            <div className="flex justify-between items-center relative z-10 border-b border-border pb-3">
              <h3 className="text-md font-black text-foreground flex items-center gap-2">
                <KeyRound className="text-primary h-5 w-5 animate-bounce" /> توليد ترخيص تجاري مسبق الدفع
              </h3>
              <button onClick={() => setIsGenModalOpen(false)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={handleGenerateLicenseCode} className="space-y-4 relative z-10 text-right">
              <p className="text-muted-foreground text-[11px] font-medium bg-primary/5 p-3 rounded-xl border border-primary/10 leading-relaxed">
                ملاحظة: سيقوم هذا المولد بإنشاء رمز تفعيل آمن وخاص بالزبائن الذين ينتظرون تنشيط حساباتهم يدويًا. يمكنك تقديم هذا المفتاح بمجرد استلام الدفع الخارجي.
              </p>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">مستوى الترخيص والباقة المتاحة</label>
                <select 
                  value={genPlanType}
                  onChange={e => {
                    const selection = e.target.value as any;
                    setGenPlanType(selection);
                    if (selection === 'basic') {
                      setGenMaxDevices(2);
                      setGenBranchesCount(1);
                    } else if (selection === 'advanced') {
                      setGenMaxDevices(10);
                      setGenBranchesCount(5);
                    } else if (selection === 'lifetime') {
                      setGenMaxDevices(99);
                      setGenBranchesCount(15);
                    }
                  }}
                  className="w-full h-11 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none"
                >
                  <option value="basic">الباقة الأساسية (جهازين - فرع واحد)</option>
                  <option value="advanced">الباقة المتقدمة (١٠ أجهزة - ٥ فروع)</option>
                  <option value="lifetime">الباقة مدى الحياة (شراء فوري كامل)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">عدد الأجهزة الأقصى (النشطة)</label>
                  <input 
                    type="number"
                    value={genMaxDevices}
                    onChange={e => setGenMaxDevices(Number(e.target.value))}
                    placeholder="2"
                    className="w-full h-11 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none text-left"
                    min="1"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">عدد الفروع المسموحة</label>
                  <input 
                    type="number"
                    value={genBranchesCount}
                    onChange={e => setGenBranchesCount(Number(e.target.value))}
                    placeholder="1"
                    className="w-full h-11 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none text-left"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border mt-5">
                <button 
                  type="submit"
                  className="flex-1 h-11 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-primary/10"
                >
                  <Plus className="h-4.5 w-4.5" /> توليد وتخزين الترخيص
                </button>
                <button 
                  type="button"
                  onClick={() => setIsGenModalOpen(false)}
                  className="px-5 h-11 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl text-xs font-bold transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
