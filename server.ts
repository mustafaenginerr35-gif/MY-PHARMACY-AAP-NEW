import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

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
    const { email, fullName, otp, purpose } = req.body || {};
    
    if (!email || !fullName || !otp) {
      return res.status(400).json({ success: false, error: "Missing required parameters." });
    }

    const serviceId = process.env.VITE_EMAILJS_SERVICE_ID || process.env.EMAILJS_SERVICE_ID;
    const templateId = process.env.VITE_EMAILJS_TEMPLATE_ID || process.env.EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.VITE_EMAILJS_PUBLIC_KEY || process.env.EMAILJS_PUBLIC_KEY;
    const privateKey = process.env.EMAILJS_PRIVATE_KEY || process.env.EMAILJS_ACCESS_TOKEN;

    console.log("[EmailOTPProxy] Received request to send OTP to:", email);
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
    const message = `مرحباً ${fullName}، رمز التحقق الخاص بك لـ ${arabicPurpose} في صيدليتي هو: ${otp}. هذا الرمز صالح لمدة 10 دقائق فقط.`;

    try {
      const templateParams = {
        to_email: email,
        to_name: fullName,
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

      console.log(`[EmailOTPProxy] Sending email to: ${email} via EmailJS REST API...`);
      const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const bodyText = await response.text();
      if (response.ok) {
        console.log(`[EmailOTPProxy] OTP sent successfully to: ${email}`);
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
