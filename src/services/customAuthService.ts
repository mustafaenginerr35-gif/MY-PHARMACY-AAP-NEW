import { collection, query, where, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { emailjsService } from './emailjsService';
import { toast } from 'sonner';
import bcrypt from 'bcryptjs';

export interface CustomUser {
  userId: string;
  id: string; // for compatibility with requesting user model fields
  fullName: string;
  pharmacyName?: string;
  email: string;
  phone: string;
  passwordHash: string;
  isActive: boolean;
  status: 'pending' | 'active' | 'disabled' | 'expired' | 'deleted';
  isVerified: boolean;
  isProtected?: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  verifiedAt?: string;

  // Real-world Security Upgrades
  otpCodeHash?: string | null;
  otpExpiresAt?: number | null; // epoch timestamp ms
  otpAttempts?: number; // failed OTP verification count
  
  failedLoginAttempts?: number; // failed login count
  lockUntil?: string | null; // ISO Date String representing lock release time
  
  deviceSessions?: string[]; // list of active device fingerprint session tokens

  // One-time Purchase Licensing
  licenseCode: string;
  licenseKey?: string;
  licenseStatus?: string;
  subscriptionStatus?: string;
  activationStatus: 'active' | 'blocked' | 'expired' | 'suspended' | 'revoked' | 'unlicensed' | 'used_by_other' | 'blocked_device';
  planType: 'basic' | 'advanced' | 'lifetime';
  maxDevices: number;
  branchesCount: number;
  role: string;

  // One-time Licensing Parameters
  activatedAt?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}

/**
 * Bcrypt salted password hashing with 10 salt rounds.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Helper to generate a secure random 6-digit verification code.
 */
export function generate6DigitOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Super fast 53-bit seedable hash function.
 */
export function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).toUpperCase();
}

/**
 * Robustly generates device fingerprint containing browser details, timezone, resolution, language & unique id.
 */
export function getDeviceDetails() {
  let uniqueId = localStorage.getItem('pharma-device-uuid');
  if (!uniqueId) {
    uniqueId = 'UID-' + Math.random().toString(36).substring(2, 11).toUpperCase() + Math.random().toString(36).substring(2, 11).toUpperCase();
    localStorage.setItem('pharma-device-uuid', uniqueId);
  }

  const userAgent = navigator.userAgent || 'Unknown Agent';
  const platform = navigator.platform || (navigator as any).userAgentData?.platform || 'Unknown OS';
  const timezone = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
      return 'UTC';
    }
  })() || 'UTC';
  const screenResolution = `${window.screen.width}x${window.screen.height}`;
  const language = navigator.language || 'ar';

  const components = [userAgent, platform, timezone, screenResolution, language, uniqueId].join('|');
  const hashedUniqueId = cyrb53(uniqueId);
  const deviceId = 'DEV-' + cyrb53(components);

  // Parse browser name
  let browserName = 'Browser';
  if (userAgent.indexOf('Firefox') > -1) browserName = 'Firefox';
  else if (userAgent.indexOf('SamsungBrowser') > -1) browserName = 'Samsung Browser';
  else if (userAgent.indexOf('Opera') > -1 || userAgent.indexOf('OPR') > -1) browserName = 'Opera';
  else if (userAgent.indexOf('Trident') > -1) browserName = 'Internet Explorer';
  else if (userAgent.indexOf('Edge') > -1 || userAgent.indexOf('Edg') > -1) browserName = 'Edge';
  else if (userAgent.indexOf('Chrome') > -1) browserName = 'Chrome';
  else if (userAgent.indexOf('Safari') > -1) browserName = 'Safari';

  // Parse OS name
  let osName = 'Unknown OS';
  if (platform.indexOf('Win') > -1) osName = 'Windows';
  else if (platform.indexOf('Mac') > -1) osName = 'macOS';
  else if (platform.indexOf('Linux') > -1) osName = 'Linux';
  else if (platform.indexOf('iPhone') > -1 || platform.indexOf('iPad') > -1 || platform.indexOf('iPod') > -1) osName = 'iOS';
  else if (platform.indexOf('Android') > -1) osName = 'Android';

  const name = `${browserName} (${osName})`;

  return {
    deviceId,
    name,
    userAgent,
    platform,
    timezone,
    screenResolution,
    language,
    hashedUniqueId,
    components
  };
}

export const customAuthService = {
  /**
   * Checks if email or phone is already registered in 'appUsers' database.
   */
  async checkDuplicate(email: string, phone: string): Promise<{ emailExists: boolean; phoneExists: boolean }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    const usersRef = collection(db, 'appUsers');
    
    // Check Email (regardless of status, email must be unique unless it is deleted)
    const emailQuery = query(usersRef, where('email', '==', cleanEmail));
    const emailSnap = await getDocs(emailQuery);
    const emailExists = emailSnap.docs.some(doc => {
      const data = doc.data();
      return data.status !== 'deleted';
    });

    // Check Phone (regardless of status, phone must be unique unless it is deleted)
    const phoneQuery = query(usersRef, where('phone', '==', cleanPhone));
    const phoneSnap = await getDocs(phoneQuery);
    const phoneExists = phoneSnap.docs.some(doc => {
      const data = doc.data();
      return data.status !== 'deleted';
    });

    return { emailExists, phoneExists };
  },

  /**
   * Registers a brand-new user in PENDING status, generates hashed OTP, and triggers EmailJS delivery.
   * If a pending user already exists, it stops registration, resends OTP, and tells the user to complete activation.
   */
  async registerPendingUser(
    fullName: string, 
    pharmacyName: string,
    email: string, 
    phone: string, 
    passwordPlain: string,
    planType: 'basic' | 'advanced' | 'lifetime' = 'basic'
  ): Promise<{ success: boolean; userId?: string; pendingUserExists?: boolean; email?: string; fullName?: string; error?: string }> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPhone = phone.trim();

      const usersRef = collection(db, 'appUsers');

      // Check Email
      const emailQuery = query(usersRef, where('email', '==', cleanEmail));
      const emailSnap = await getDocs(emailQuery);
      const emailUserDoc = !emailSnap.empty ? emailSnap.docs[0] : null;
      const emailUserData = emailUserDoc ? (emailUserDoc.data() as CustomUser) : null;

      // Check Phone
      const phoneQuery = query(usersRef, where('phone', '==', cleanPhone));
      const phoneSnap = await getDocs(phoneQuery);
      const phoneUserDoc = !phoneSnap.empty ? phoneSnap.docs[0] : null;
      const phoneUserData = phoneUserDoc ? (phoneUserDoc.data() as CustomUser) : null;

      // Check for disabled/blocked status
      if (
        (emailUserData && (emailUserData.status === 'disabled' || emailUserData.status === 'expired' || emailUserData.isActive === false)) || 
        (phoneUserData && (phoneUserData.status === 'disabled' || phoneUserData.status === 'expired' || phoneUserData.isActive === false))
      ) {
        return { success: false, error: 'حسابك معطل، تواصل مع الدعم.' };
      }

      // Prioritize checking if any exists with active / verified status
      if (emailUserData && (emailUserData.status === 'active' || (emailUserData.status as string) === 'verified' || emailUserData.isVerified)) {
        return { success: false, error: 'البريد الإلكتروني هذا مسجل لدينا بالفعل. يرجى تسجيل الدخول.' };
      }
      if (phoneUserData && (phoneUserData.status === 'active' || (phoneUserData.status as string) === 'verified' || phoneUserData.isVerified)) {
        return { success: false, error: 'رقم الهاتف هذا مسجل لدينا بالفعل. يرجى تسجيل الدخول.' };
      }

      // If existing user is pending, trigger OTP resend and show "Complete Activation"
      const pendingUserData = (emailUserData && emailUserData.status === 'pending') ? emailUserData : ((phoneUserData && phoneUserData.status === 'pending') ? phoneUserData : null);
      if (pendingUserData) {
        console.log(`[registerPendingUser] Pending account found for: ${pendingUserData.email}. Resending OTP...`);
        const resendWorked = await this.resendOTP(pendingUserData.email, 'register');
        if (!resendWorked) {
          return { success: false, error: 'فشل إرسال رمز التحقق للحساب الحالي المكتشف.' };
        }
        return {
          success: true,
          pendingUserExists: true,
          email: pendingUserData.email,
          fullName: pendingUserData.fullName
        };
      }

      const passwordHashVal = await hashPassword(passwordPlain);
      const otp = generate6DigitOTP();
      const otpCodeHashVal = await bcrypt.hash(otp, 10);
      const tenMinutesFromNow = Date.now() + 10 * 60 * 1000; // exactly 10 minutes validation
      
      const newUserId = 'u_' + Math.random().toString(36).substr(2, 9);

      // Tier definitions
      let maxDevices = 2;
      let branchesCount = 1;
      
      if (planType === 'advanced') {
        maxDevices = 10;
        branchesCount = 5;
      } else if (planType === 'lifetime') {
        maxDevices = 99;
        branchesCount = 15;
      }

      const pendingUser: CustomUser = {
        userId: newUserId,
        id: newUserId,
        fullName: fullName.trim(),
        pharmacyName: pharmacyName.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        passwordHash: passwordHashVal,
        isActive: false,
        status: 'pending',
        isVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLogin: '',
        
        // Hashed OTP security upgrades
        otpCodeHash: otpCodeHashVal,
        otpExpiresAt: tenMinutesFromNow,
        otpAttempts: 0,
        
        failedLoginAttempts: 0,
        lockUntil: null,
        deviceSessions: [],

        // One-time Licensing Parameters
        licenseCode: '',
        activationStatus: 'expired', // Forces license activation after email verification
        planType,
        maxDevices,
        branchesCount,
        isProtected: false,
        role: 'customer',
        activatedAt: '',
        customerName: fullName.trim(),
        customerPhone: cleanPhone,
        customerEmail: cleanEmail
      };

      const docRef = doc(db, 'appUsers', pendingUser.userId);
      await setDoc(docRef, pendingUser);

      // Send verification code
      const sent = await emailjsService.sendOTP(cleanEmail, pendingUser.fullName, otp, 'register');
      if (!sent) {
        throw new Error('فشل إرسال رمز التحقق (OTP) للبريد الإلكتروني.');
      }

      return { success: true, userId: newUserId };
    } catch (err: any) {
      console.error('Registration failed:', err);
      return { success: false, error: err.message || 'فشل تسجيل الحساب، يرجى المحاولة لاحقاً' };
    }
  },

  /**
   * Resends hashed OTP to a pending user.
   */
  async resendOTP(email: string, purpose: 'register' | 'reset' = 'register'): Promise<boolean> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      console.log(`[customAuthService] Dispatching resendOTP request to secure backend API for: ${cleanEmail}...`);

      const response = await fetch("/api/resend-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: cleanEmail,
          to_email: cleanEmail,
          purpose,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(data.message || 'تمت إعادة إرسال رمز تحقق جديد إلى بريدك الإلكتروني بنجاح.');
        return true;
      } else {
        const errorMsg = data.error || 'فشل إرسال الرمز مجدداً';
        toast.error(errorMsg);
        console.error("[customAuthService] Backend resendOTP failed:", errorMsg);
        return false;
      }
    } catch (error: any) {
      console.error('Error resending OTP via server:', error);
      toast.error('فشل إرسال الرمز مجدداً بسبب عطل في الاتصال بالخادم.');
      return false;
    }
  },

  /**
   * Verifies the OTP code sent to the email. If valid, changes user state to verified.
   * Leverages strict attempt counting (max 5) and auto-invalidates logic.
   */
  async verifyUserOTP(email: string, otpInput: string): Promise<{ success: boolean; user?: CustomUser; error?: string }> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const usersRef = collection(db, 'appUsers');
      const q = query(usersRef, where('email', '==', cleanEmail));
      const snap = await getDocs(q);

      if (snap.empty) {
        return { success: false, error: 'البريد الإلكتروني غير مسجل' };
      }

      const userDoc = snap.docs[0];
      const userData = userDoc.data() as CustomUser;

      // Checking validity constraints
      if (!userData.otpCodeHash || !userData.otpExpiresAt) {
        return { success: false, error: 'لا يوجد رمز تحقق نشط في السجل. يرجى طلب رمز جديد.' };
      }

      const now = Date.now();
      if (now > userData.otpExpiresAt) {
        return { success: false, error: 'انتهت صلاحية رمز التحقق (صلاحيته 10 دقائق). يرجى طلب رمز جديد.' };
      }

      // Check OTP Attempts Limit
      const attempts = userData.otpAttempts || 0;
      if (attempts >= 5) {
        // Exceeded 5, regenerate automatically and notify
        const newOtp = generate6DigitOTP();
        const newOtpHash = await bcrypt.hash(newOtp, 10);
        await updateDoc(doc(db, 'appUsers', userData.userId), {
          otpCodeHash: newOtpHash,
          otpExpiresAt: Date.now() + 10 * 60 * 1000,
          otpAttempts: 0,
          updatedAt: new Date().toISOString()
        });
        await emailjsService.sendOTP(cleanEmail, userData.fullName, newOtp, 'register');
        return { 
          success: false, 
          error: 'تجاوزت الحد الأقصى للمحاولات (5 محاولات). تم إبطال الرمز القديم تلقائياً وإرسال رمز تحقق عشوائي جديد لبريدك.' 
        };
      }

      // Secure validation comparison
      const isOtpValid = await bcrypt.compare(otpInput.trim(), userData.otpCodeHash);
      if (!isOtpValid) {
        const nextAttempts = attempts + 1;
        
        if (nextAttempts >= 5) {
          // Automatic renewal upon hitting 5th concurrent failure
          const newOtp = generate6DigitOTP();
          const newOtpHash = await bcrypt.hash(newOtp, 10);
          await updateDoc(doc(db, 'appUsers', userData.userId), {
            otpCodeHash: newOtpHash,
            otpExpiresAt: Date.now() + 10 * 60 * 1000,
            otpAttempts: 0,
            updatedAt: new Date().toISOString()
          });
          await emailjsService.sendOTP(cleanEmail, userData.fullName, newOtp, 'register');
          return { 
            success: false, 
            error: 'تجاوزت الحد الأقصى لمحاولات الإدخال (5 محاولات). تم توليد وإرسال رمز تحقق جديد إلى بريدك مع تصفير محاولاتك.' 
          };
        } else {
          await updateDoc(doc(db, 'appUsers', userData.userId), {
            otpAttempts: nextAttempts,
            updatedAt: new Date().toISOString()
          });
          return { success: false, error: `رمز التحقق غير صحيح. المحاولات المتبقية: ${5 - nextAttempts}` };
        }
      }

      // Correct OTP entry! Promote user to active state & clear security variables
      const updatedUser: Partial<CustomUser> = {
        status: 'active',
        isVerified: true,
        isActive: true, // Account itself is active, but license is expired/needs activation
        activationStatus: 'expired',
        updatedAt: new Date().toISOString(),
        verifiedAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        otpCodeHash: null, // Clear otp metadata from Firestore
        otpExpiresAt: null,
        otpAttempts: 0
      };

      await updateDoc(doc(db, 'appUsers', userData.userId), updatedUser);
      
      const fullUser = { ...userData, ...updatedUser } as CustomUser;
      return { success: true, user: fullUser };
    } catch (err: any) {
      console.error('OTP Verification failed:', err);
      return { success: false, error: err.message || 'فشل التحقق من رمز OTP' };
    }
  },

  /**
   * Activates a license key for a verified user, including multiple validation checks.
   */
  async activateLicenseKey(
    userId: string,
    licenseKey: string,
    deviceFingerprint: string
  ): Promise<{ success: boolean; error?: string; user?: CustomUser }> {
    try {
      const cleanKey = licenseKey.trim().toUpperCase();
      if (!cleanKey) {
        return { success: false, error: 'يرجى إدخال مفتاح رخصة التفعيل.' };
      }

      // Check if user exists in appUsers
      const userRef = doc(db, 'appUsers', userId);
      const userSnap = await getDocs(query(collection(db, 'appUsers'), where('userId', '==', userId)));
      if (userSnap.empty) {
        return { success: false, error: 'المستخدم غير موجود في النظام.' };
      }
      const userData = userSnap.docs[0].data() as CustomUser;

      // 1. Query the 'licenses' collection in Firestore
      const licensesRef = collection(db, 'licenses');
      const q = query(licensesRef, where('licenseKey', '==', cleanKey));
      const licenseSnap = await getDocs(q);

      if (licenseSnap.empty) {
        return { success: false, error: 'مفتاح الترخيص غير متطابق أو غير موجود بسجلات النظام.' };
      }

      const licenseDoc = licenseSnap.docs[0];
      const licenseData = licenseDoc.data();

      // Check status: 'unused', 'active', 'suspended', 'revoked', 'expired'
      if (licenseData.status === 'revoked') {
        return { success: false, error: 'مفتاح الترخيص هذا ملغى نهائياً ومبطل الاستخدام.' };
      }
      if (licenseData.status === 'suspended') {
        return { success: false, error: 'مفتاح الترخيص هذا معلّق (موقف).' };
      }
      if (licenseData.status === 'expired') {
        return { success: false, error: 'مفتاح الترخيص هذا منتهي الصلاحية ويحتاج لتمديد.' };
      }

      // Check if expired based on current date
      if (licenseData.expiryDate) {
        const expiry = new Date(licenseData.expiryDate);
        if (!isNaN(expiry.getTime()) && expiry.getTime() < Date.now()) {
          // Update license status in Firestore to 'expired'
          await updateDoc(doc(db, 'licenses', licenseDoc.id), {
            status: 'expired',
            updatedAt: new Date().toISOString()
          });
          return { success: false, error: 'مفتاح الترخيص هذا منتهي الصلاحية ويحتاج لتمديد.' };
        }
      }

      // Check if status is other than unused or active
      if (licenseData.status !== 'unused' && licenseData.status !== 'active') {
        return { success: false, error: 'حالة مفتاح الترخيص غير صالحة للتفعيل أو التشغيل.' };
      }

      // Check if key is used by another user (already linked to someone else)
      if (licenseData.ownerUserId && licenseData.ownerUserId !== userId) {
        return { success: false, error: 'مفتاح الترخيص مستخدم مسبقاً' };
      }

      // Device count limit check
      const maxDevices = licenseData.maxDevices || 2;
      const maxBranches = licenseData.maxBranches || 1;
      const planType = licenseData.planType || 'basic';

      const dev = getDeviceDetails();
      const fp = dev.deviceId;
      const deviceName = dev.name;

      const actDevices = licenseData.activatedDevices || [];
      const existingDevice = actDevices.find((d: any) => d.deviceId === fp);
      let updatedDevicesList = [...actDevices];

      if (existingDevice) {
        // Device already registered, update its lastSeen
        updatedDevicesList = actDevices.map((d: any) => 
          d.deviceId === fp 
            ? { ...d, lastSeen: new Date().toISOString(), name: deviceName }
            : d
        );
      } else {
        // New device, verify max limit
        if (actDevices.length >= maxDevices) {
          return {
            success: false,
            error: "تم تجاوز عدد الأجهزة المسموح بها"
          };
        }
        updatedDevicesList.push({
          deviceId: fp,
          name: deviceName,
          createdAt: new Date().toISOString(),
          lastSeen: new Date().toISOString()
        });
      }

      const nowStr = new Date().toISOString();

      // 2. Link license to user in 'licenses' collection
      await updateDoc(doc(db, 'licenses', licenseDoc.id), {
        ownerUserId: userId,
        ownerName: userData.fullName,
        ownerEmail: userData.email,
        ownerPhone: userData.phone,
        activatedAt: nowStr,
        status: 'active',
        updatedAt: nowStr,
        activatedDevices: updatedDevicesList
      });

      // 3. Update user doc in 'appUsers' collection
      const updatedUserFields: any = {
        licenseCode: cleanKey,
        licenseKey: cleanKey, // required specifically by some references
        planType: planType === 'pro' ? 'advanced' : planType, // ensure compatible with 'basic' | 'advanced' | 'lifetime'
        activationStatus: 'active',
        licenseStatus: 'active', // required by B2 point 4
        maxDevices: maxDevices,
        branchesCount: maxBranches,
        subscriptionStatus: 'active', // required by B2 point 4
        activatedAt: nowStr,
        updatedAt: nowStr,
        deviceSessions: updatedDevicesList.map((d: any) => d.deviceId)
      };

      await updateDoc(userRef, updatedUserFields);

      return {
        success: true,
        user: { ...userData, ...updatedUserFields } as CustomUser
      };
    } catch (e: any) {
      console.error('License key activation error:', e);
      return { success: false, error: 'خطأ أثناء فك التشفير والتنشيط: ' + e.message };
    }
  },

  /**
   * Verifies credentials and logs the user in.
   * Includes rate limiting (5 failures -> 15 min lock) and device fingerprint verification.
   */
  async loginUser(
    email: string, 
    passwordPlain: string,
    deviceFingerprint?: string
  ): Promise<{ success: boolean; user?: CustomUser; error?: string; needVerification?: boolean }> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const usersRef = collection(db, 'appUsers');
      const q = query(usersRef, where('email', '==', cleanEmail));
      const snap = await getDocs(q);

      if (snap.empty) {
        return { success: false, error: 'البريد الإلكتروني غير مسجل في النظام' };
      }

      // If multiple accounts exist for same email, pick the best one (active/verified/super_admin/newest)
      let selectedDoc = snap.docs[0];
      if (snap.docs.length > 1) {
        const sortedDocs = [...snap.docs].sort((docA, docB) => {
          const uA = docA.data() as CustomUser;
          const uB = docB.data() as CustomUser;
          
          const isActiveVerifiedA = (uA.status === 'active' || (uA.status as string) === 'verified' || uA.isVerified) ? 1 : 0;
          const isActiveVerifiedB = (uB.status === 'active' || (uB.status as string) === 'verified' || uB.isVerified) ? 1 : 0;
          if (isActiveVerifiedA !== isActiveVerifiedB) return isActiveVerifiedB - isActiveVerifiedA;
          
          const isSuperA = uA.role === 'super_admin' ? 1 : 0;
          const isSuperB = uB.role === 'super_admin' ? 1 : 0;
          if (isSuperA !== isSuperB) return isSuperB - isSuperA;
          
          const timeA = uA.createdAt ? new Date(uA.createdAt).getTime() : 0;
          const timeB = uB.createdAt ? new Date(uB.createdAt).getTime() : 0;
          return timeB - timeA;
        });
        selectedDoc = sortedDocs[0];
      }

      const userDoc = selectedDoc;
      const userData = userDoc.data() as CustomUser;

      // 1. Rate Limiting Check
      if (userData.lockUntil) {
        const lockTime = new Date(userData.lockUntil).getTime();
        if (Date.now() < lockTime) {
          const remainingMs = lockTime - Date.now();
          const mins = Math.ceil(remainingMs / 1000 / 60);
          return { 
            success: false, 
            error: `تم قفل هذا الحساب مؤقتاً بسبب تكرار المحاولات الفاشلة. يرجى الانتظار والتحقق مرة أخرى بعد ${mins} دقيقة.` 
          };
        } else {
          // Lock duration elapsed. Let's reset lock fields on userDoc in memory for this flow
          userData.failedLoginAttempts = 0;
          userData.lockUntil = null;
        }
      }

      // 2. Salted bcrypt password matching
      const isMatch = await bcrypt.compare(passwordPlain, userData.passwordHash);
      if (!isMatch) {
        const nextFailed = (userData.failedLoginAttempts || 0) + 1;
        let lockUntilVal: string | null = null;
        
        if (nextFailed >= 5) {
          const lockEndEpoch = Date.now() + 15 * 60 * 1000; // exact 15 minutes lock
          lockUntilVal = new Date(lockEndEpoch).toISOString();
        }

        await updateDoc(doc(db, 'appUsers', userData.userId), {
          failedLoginAttempts: nextFailed,
          lockUntil: lockUntilVal,
          updatedAt: new Date().toISOString()
        });

        if (nextFailed >= 5) {
          return { 
            success: false, 
            error: 'تم قفل الحساب بشكل مؤمن لمدة 15 دقيقة بعد 5 محاولات خاطئة متتالية تماشياً مع أمان SaaS.' 
          };
        } else {
          return { 
            success: false, 
            error: `كلمة المرور غير صحيحة. المحاولات المتبقية قبل إقفال الحساب: ${5 - nextFailed}` 
          };
        }
      }

      // Check verification, activation, and status gates
      let liveStatus = userData.status;
      if (!liveStatus) {
        liveStatus = userData.isVerified ? 'active' : 'pending';
      }

      console.log("LOGIN_USER_STATUS", { 
        email: userData.email, 
        userId: userData.userId, 
        status: liveStatus, 
        isVerified: userData.isVerified, 
        isActive: userData.isActive 
      });

      if (liveStatus !== 'active' || !userData.isVerified || userData.isActive === false) {
        if (liveStatus === 'pending') {
          return { 
            success: false, 
            error: 'الحساب غير مفعّل بعد. يرجى إدخال رمز التحقق لتفعيل الحساب أولاً.',
            needVerification: true 
          };
        }
        return { success: false, error: 'حسابك معطل، تواصل مع الدعم.' };
      }

      // 3. Multi-device Session Control (Prevent exceeding maxDevices) using Licenses Collection as source of truth
      const isSuperAdminEmail = (import.meta.env.VITE_SUPER_ADMIN_EMAIL || 'mustafaenginerr35@gmail.com').trim().toLowerCase();
      const isSuperAdmin = userData.email && userData.email.trim().toLowerCase() === isSuperAdminEmail;
      const isAdmin = userData.role === 'admin' || userData.role === 'super_admin';

      const dev = getDeviceDetails();
      const fp = dev.deviceId;
      const deviceName = dev.name;
      let finalDevicesList: any[] = [];

      if (!isSuperAdmin && !isAdmin && userData.licenseCode) {
        // Query the active license document
        const licSnap = await getDocs(query(collection(db, 'licenses'), where('licenseKey', '==', userData.licenseCode.trim().toUpperCase())));
        if (!licSnap.empty) {
          const licDoc = licSnap.docs[0];
          const licData = licDoc.data();
          const maxD = licData.maxDevices || 2;
          const licDevices = licData.activatedDevices || [];
          
          const exDevice = licDevices.find((d: any) => d.deviceId === fp);
          if (exDevice) {
            // Already allowed device, update lastSeen
            finalDevicesList = licDevices.map((d: any) => 
              d.deviceId === fp 
                ? { ...d, lastSeen: new Date().toISOString(), name: deviceName }
                : d
            );
          } else {
            // New device! Verify
            if (licDevices.length >= maxD) {
              return {
                success: false,
                error: "تم تجاوز عدد الأجهزة المسموح بها"
              };
            }
            finalDevicesList = [
              ...licDevices,
              {
                deviceId: fp,
                name: deviceName,
                createdAt: new Date().toISOString(),
                lastSeen: new Date().toISOString()
              }
            ];
          }

          // Write back to Firestore license doc
          await updateDoc(doc(db, 'licenses', licDoc.id), {
            activatedDevices: finalDevicesList,
            updatedAt: new Date().toISOString()
          });
        }
      }

      // Successful login reset
      const currentLoginStr = new Date().toISOString();
      const updatedSessions = finalDevicesList.map((d: any) => d.deviceId);

      await updateDoc(doc(db, 'appUsers', userData.userId), {
        lastLogin: currentLoginStr,
        updatedAt: currentLoginStr,
        failedLoginAttempts: 0,
        lockUntil: null,
        deviceSessions: updatedSessions.length > 0 ? updatedSessions : [fp]
      });

      const fullUser = { 
        ...userData, 
        lastLogin: currentLoginStr,
        isVerified: true,
        deviceSessions: updatedSessions.length > 0 ? updatedSessions : [fp],
        failedLoginAttempts: 0,
        lockUntil: null
      } as CustomUser;

      return { success: true, user: fullUser };
    } catch (err: any) {
      console.error('Login error:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء محاولة تسجيل الدخول' };
    }
  },

  /**
   * Log out device session cleanly. Removes user's device fingerprint token.
   */
  async logoutDevice(userId: string, deviceFingerprint: string): Promise<void> {
    try {
      const userRef = doc(db, 'appUsers', userId);
      const snap = await getDocs(query(collection(db, 'appUsers'), where('userId', '==', userId)));
      if (!snap.empty) {
        const userData = snap.docs[0].data() as CustomUser;
        const currentSessions = userData.deviceSessions || [];
        const updated = currentSessions.filter(fp => fp !== deviceFingerprint);
        await updateDoc(userRef, {
          deviceSessions: updated,
          updatedAt: new Date().toISOString()
        });
        console.log(`[Device Control] Cleaned fingerprint session: ${deviceFingerprint}`);
      }
    } catch (e) {
      console.error('Error releasing device session layout:', e);
    }
  },

  /**
   * Initiates forgot password flow; checks if email is active, generates and sends salted reset OTP.
   */
  async requestPasswordResetOTP(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const usersRef = collection(db, 'appUsers');
      const q = query(usersRef, where('email', '==', cleanEmail));
      const snap = await getDocs(q);

      if (snap.empty) {
        return { success: false, error: 'البريد الإلكتروني غير مسجل بالنظام' };
      }

      const userDoc = snap.docs[0];
      const userData = userDoc.data() as CustomUser;

      const otp = generate6DigitOTP();
      const otpCodeHashVal = await bcrypt.hash(otp, 10);
      const tenMinutesFromNow = Date.now() + 10 * 60 * 1000;

      await updateDoc(doc(db, 'appUsers', userData.userId), {
        otpCodeHash: otpCodeHashVal,
        otpExpiresAt: tenMinutesFromNow,
        otpAttempts: 0,
        updatedAt: new Date().toISOString()
      });

      const sent = await emailjsService.sendOTP(cleanEmail, userData.fullName, otp, 'reset');
      if (sent) {
        return { success: true };
      } else {
        return { success: false, error: 'فشل إرسال البريد الإلكتروني. يرجى محاولة الحصول على رمز OTP لاحقاً' };
      }
    } catch (err: any) {
      console.error('Password reset request error:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء طلب إعادة تعيين كلمة المرور' };
    }
  },

  /**
   * Verifies the reset OTP and assigns a new password to the user.
   */
  async resetPasswordWithOTP(email: string, otpInput: string, newPasswordPlain: string): Promise<{ success: boolean; error?: string }> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const usersRef = collection(db, 'appUsers');
      const q = query(usersRef, where('email', '==', cleanEmail));
      const snap = await getDocs(q);

      if (snap.empty) {
        return { success: false, error: 'البريد الإلكتروني غير مسجل بالنظام' };
      }

      const userDoc = snap.docs[0];
      const userData = userDoc.data() as CustomUser;

      if (!userData.otpCodeHash || !userData.otpExpiresAt) {
        return { success: false, error: 'لا يوجد رمز نشط لهذا الإجراء حالياً.' };
      }

      const now = Date.now();
      if (now > userData.otpExpiresAt) {
        return { success: false, error: 'انتهت صلاحية رمز التحقق OTP. يرجى طلب الرمز مجدداً.' };
      }

      // Check OTP limit
      const attempts = userData.otpAttempts || 0;
      if (attempts >= 5) {
        const newOtp = generate6DigitOTP();
        const newOtpHash = await bcrypt.hash(newOtp, 10);
        await updateDoc(doc(db, 'appUsers', userData.userId), {
          otpCodeHash: newOtpHash,
          otpExpiresAt: Date.now() + 10 * 60 * 1000,
          otpAttempts: 0,
          updatedAt: new Date().toISOString()
        });
        await emailjsService.sendOTP(cleanEmail, userData.fullName, newOtp, 'reset');
        return { 
          success: false, 
          error: 'تم تجاوز الحد الأقصى للمحاولات لتعيين الرمز. تم إرسال رمز OTP عشوائي جديد لبريدك لتعيد المحاولة.' 
        };
      }

      const isOtpValid = await bcrypt.compare(otpInput.trim(), userData.otpCodeHash);
      if (!isOtpValid) {
        const nextAttempts = attempts + 1;
        if (nextAttempts >= 5) {
          const newOtp = generate6DigitOTP();
          const newOtpHash = await bcrypt.hash(newOtp, 10);
          await updateDoc(doc(db, 'appUsers', userData.userId), {
            otpCodeHash: newOtpHash,
            otpExpiresAt: Date.now() + 10 * 60 * 1000,
            otpAttempts: 0,
            updatedAt: new Date().toISOString()
          });
          await emailjsService.sendOTP(cleanEmail, userData.fullName, newOtp, 'reset');
          return { success: false, error: 'تم إدخال رمز خاطئ 5 مرات. تم توليد وإرسال رمز OTP جديد فوري إلى بريدك.' };
        } else {
          await updateDoc(doc(db, 'appUsers', userData.userId), {
            otpAttempts: nextAttempts,
            updatedAt: new Date().toISOString()
          });
          return { success: false, error: `رمز التحقق غير صحيح. المحاولات المتبقية: ${5 - nextAttempts}` };
        }
      }

      // Clear code and update password using bcrypt
      const newPasswordHashVal = await hashPassword(newPasswordPlain);

      await updateDoc(doc(db, 'appUsers', userData.userId), {
        passwordHash: newPasswordHashVal,
        otpCodeHash: null,
        otpExpiresAt: null,
        otpAttempts: 0,
        status: 'active', // Set to active in case they reset from pending
        isVerified: true,
        verifiedAt: new Date().toISOString(),
        isActive: true,
        updatedAt: new Date().toISOString(),
        failedLoginAttempts: 0,
        lockUntil: null
      });

      return { success: true };
    } catch (err: any) {
      console.error('Password reset apply error:', err);
      return { success: false, error: err.message || 'فشل تحديث كلمة المرور الجديدة' };
    }
  }
};
