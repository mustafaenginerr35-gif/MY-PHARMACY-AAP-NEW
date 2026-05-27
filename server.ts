import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import admin from "firebase-admin";
import bcrypt from "bcryptjs";
import fs from "fs";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Safe loading of Firebase configuration for Admin SDK
  const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
  let firestoreDb: admin.firestore.Firestore | null = null;

  try {
    if (fs.existsSync(firebaseConfigPath)) {
      const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf8"));
      if (!admin.apps.length) {
        admin.initializeApp({
          projectId: firebaseConfig.projectId,
        });
      }
      firestoreDb = admin.firestore(firebaseConfig.firestoreDatabaseId || "(default)");
      console.log(`[ServerInit] firebase-admin initialized for project: ${firebaseConfig.projectId}, db: ${firebaseConfig.firestoreDatabaseId}`);
    } else {
      console.warn(`[ServerInit] firebase-applet-config.json not found at ${firebaseConfigPath}`);
    }
  } catch (err: any) {
    console.error("[ServerInit] Failed to initialize firebase-admin SDK:", err);
  }

  app.use(express.json());

  // API Routes
  app.all("/api/send-otp", async (req, res, next) => {
    console.log(`[EmailOTPProxy] Incoming request: ${req.method} ${req.url}`);
    if (req.method !== "POST") {
      console.warn(`[EmailOTPProxy] Method ${req.method} is Not Allowed for /api/send-otp`);
      return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed. Please use POST.` });
    }
    next();
  });

  app.post("/api/send-otp", async (req, res) => {
    const { email, to_email, fullName, username, to_name, otp, purpose } = req.body || {};
    const resolvedEmail = (email || to_email || "").trim();
    const resolvedFullName = (fullName || username || to_name || "").trim();
    
    if (!resolvedEmail || !resolvedFullName || !otp) {
      return res.status(400).json({ success: false, error: "Missing required parameters." });
    }

    const serviceId = process.env.VITE_EMAILJS_SERVICE_ID || process.env.EMAILJS_SERVICE_ID;
    const templateId = process.env.VITE_EMAILJS_TEMPLATE_ID || process.env.EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.VITE_EMAILJS_PUBLIC_KEY || process.env.EMAILJS_PUBLIC_KEY;
    const privateKey = process.env.EMAILJS_PRIVATE_KEY || process.env.EMAILJS_ACCESS_TOKEN;

    console.log("[EmailOTPProxy] Received request to send OTP to:", resolvedEmail);
    console.log("[EmailOTPProxy] Credentials loaded status:", {
      serviceId: serviceId ? `${serviceId.substring(0, Math.min(serviceId.length, 4))}...` : "NOT_FOUND/MISSING",
      templateId: templateId ? `${templateId.substring(0, Math.min(templateId.length, 4))}...` : "NOT_FOUND/MISSING",
      publicKey: publicKey ? `${publicKey.substring(0, Math.min(publicKey.length, 5))}...` : "NOT_FOUND/MISSING",
      privateKey: privateKey ? `PRESENT (length: ${privateKey.length})` : "NOT_FOUND/MISSING",
    });

    if (!serviceId || !templateId || !publicKey) {
      const missingKeys = [];
      if (!serviceId) missingKeys.push("VITE_EMAILJS_SERVICE_ID");
      if (!templateId) missingKeys.push("VITE_EMAILJS_TEMPLATE_ID");
      if (!publicKey) missingKeys.push("VITE_EMAILJS_PUBLIC_KEY");
      
      const errMsg = `لم يتم إعداد متغيرات البيئة لخدمة البريد الإلكتروني في الخادم (Missing server variables: ${missingKeys.join(", ")}). يرجى تكوينها في إعدادات البيئة السحابية لوحة تحكم AI Studio.`;
      console.error("[EmailOTPProxy] Configuration missing error:", errMsg);
      return res.status(500).json({ 
        success: false, 
        error: errMsg 
      });
    }

    const arabicPurpose = purpose === 'reset' ? 'إعادة تعيين كلمة مرورك' : 'تفعيل حسابك الجديد';
    const message = `مرحباً ${resolvedFullName}، رمز التحقق الخاص بك لـ ${arabicPurpose} في صيدليتي هو: ${otp}. هذا الرمز صالح لمدة 10 دقائق فقط.`;

    try {
      const templateParams = {
        to_email: resolvedEmail,
        to_name: resolvedFullName,
        otp_code: otp,
        purpose_text: arabicPurpose,
        message: message,
      };

      const payload: any = {
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: templateParams,
      };

      if (privateKey) {
        payload.accessToken = privateKey;
      }

      console.log(`[EmailOTPProxy] Sending email to: ${resolvedEmail} via EmailJS REST API...`);
      const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const bodyText = await response.text();
      if (response.ok) {
        console.log(`[EmailOTPProxy] OTP sent successfully to: ${resolvedEmail}`);
        return res.json({ success: true });
      } else {
        console.error(`[EmailOTPProxy] EmailJS API responded with error status ${response.status}:`, bodyText);
        return res.status(response.status).json({ 
          success: false, 
          error: `استجابة مخدم EmailJS (حالة خطأ ${response.status}): ${bodyText || 'لا يوجد نص خطأ متاح'}` 
        });
      }
    } catch (error: any) {
      console.error("[EmailOTPProxy] Network or fetch error targeting EmailJS REST API:", error);
      return res.status(500).json({ 
        success: false, 
        error: `خطأ اتصال بشبكة البريد الإلكتروني (Network/Fetch Error): ${error.message || "فشل الوصول لخوادم ملقم البريد"}` 
      });
    }
  });

  app.post("/api/resend-otp", async (req, res) => {
    const { email, to_email, purpose } = req.body || {};
    const resolvedEmail = (email || to_email || "").trim().toLowerCase();
    const resolvedPurpose = purpose || "register";

    if (!resolvedEmail) {
      return res.status(400).json({ success: false, error: "البريد الإلكتروني مطلوب." });
    }

    if (!firestoreDb) {
      console.error("[ResendOTP] Firestore DB admin context is not initialized.");
      return res.status(500).json({ success: false, error: "قاعدة البيانات غير مهيأة بعد على الخادم." });
    }

    try {
      console.log(`[ResendOTP] Attempting to find pending user for email: ${resolvedEmail}`);
      
      const usersRef = firestoreDb.collection("appUsers");
      const snapshot = await usersRef.where("email", "==", resolvedEmail).get();

      if (snapshot.empty) {
        console.warn(`[ResendOTP] User with email ${resolvedEmail} not found in Firestore.`);
        return res.status(404).json({ success: false, error: "البريد الإلكتروني المدخل غير مسجل لدينا في النظام." });
      }

      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();

      // Core parameters for OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpCodeHashVal = await bcrypt.hash(otp, 10);
      const tenMinutesFromNow = Date.now() + 10 * 60 * 1000;

      // Update Firestore document via server admin auth safely
      await userDoc.ref.update({
        otpCodeHash: otpCodeHashVal,
        otpExpiresAt: tenMinutesFromNow,
        otpAttempts: 0,
        updatedAt: new Date().toISOString()
      });

      console.log(`[ResendOTP] Updated OTP in Firestore for system userId: ${userDoc.id}. Sending email via EmailJS...`);

      // Credentials for EmailJS
      const serviceId = process.env.VITE_EMAILJS_SERVICE_ID || process.env.EMAILJS_SERVICE_ID;
      const templateId = process.env.VITE_EMAILJS_TEMPLATE_ID || process.env.EMAILJS_TEMPLATE_ID;
      const publicKey = process.env.VITE_EMAILJS_PUBLIC_KEY || process.env.EMAILJS_PUBLIC_KEY;
      const privateKey = process.env.EMAILJS_PRIVATE_KEY || process.env.EMAILJS_ACCESS_TOKEN;

      if (!serviceId || !templateId || !publicKey) {
        console.error("[ResendOTP] Missing EmailJS production variables. Sending fallback to UI with generated OTP...");
        return res.status(500).json({
          success: false,
          error: "لم يتم تكوين إعدادات خدمة البريد الإلكتروني (EmailJS) على الخادم (VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, VITE_EMAILJS_PUBLIC_KEY)."
        });
      }

      const arabicPurpose = resolvedPurpose === 'reset' ? 'إعادة تعيين كلمة مرورك' : 'تفعيل حسابك الجديد';
      const message = `مرحباً ${userData.fullName || resolvedEmail}، رمز التحقق الجديد الخاص بك لـ ${arabicPurpose} في صيدليتي هو: ${otp}. هذا الرمز صالح لمدة 10 دقائق فقط.`;

      const templateParams = {
        to_email: resolvedEmail,
        to_name: userData.fullName || resolvedEmail,
        otp_code: otp,
        purpose_text: arabicPurpose,
        message: message,
      };

      const payload: any = {
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: templateParams,
      };

      if (privateKey) {
        payload.accessToken = privateKey;
      }

      const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const bodyText = await response.text();
      if (response.ok) {
        console.log(`[ResendOTP] Email sent successfully to ${resolvedEmail}`);
        return res.json({ success: true, message: "تمت إعادة إرسال رمز تحقق جديد إلى بريدك بنجاح." });
      } else {
        console.error(`[ResendOTP] EmailJS returned status ${response.status}:`, bodyText);
        return res.status(response.status).json({ 
          success: false, 
          error: `فشل خادم إرسال البريد الإلكتروني (حالة خطأ ${response.status}): ${bodyText || 'فشل غامض في خادم EmailJS'}` 
        });
      }
    } catch (error: any) {
      console.error("[ResendOTP] Exception encountered:", error);
      return res.status(500).json({ success: false, error: error.message || "حدث خطأ داخلي أثناء إعادة إرسال الرمز." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
