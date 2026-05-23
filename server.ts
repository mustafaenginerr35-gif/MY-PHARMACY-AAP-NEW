import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/send-otp", async (req, res) => {
    const { email, fullName, otp, purpose } = req.body;
    
    if (!email || !fullName || !otp) {
      return res.status(400).json({ success: false, error: "Missing required parameters." });
    }

    const serviceId = process.env.VITE_EMAILJS_SERVICE_ID || process.env.EMAILJS_SERVICE_ID;
    const templateId = process.env.VITE_EMAILJS_TEMPLATE_ID || process.env.EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.VITE_EMAILJS_PUBLIC_KEY || process.env.EMAILJS_PUBLIC_KEY;
    const privateKey = process.env.VITE_EMAILJS_PRIVATE_KEY || process.env.EMAILJS_PRIVATE_KEY || process.env.EMAILJS_ACCESS_TOKEN;

    if (!serviceId || !templateId || !publicKey) {
      console.error("[EmailOTPProxy] Configuration missing in runtime process.env:", { serviceId, templateId, publicKey });
      return res.status(500).json({ 
        success: false, 
        error: "لم يتم تكوين متغيرات بيئة إرسال البريد الإلكتروني في البيئة الإنتاجية المستضافة (EmailJS credentials are not set in the container environment. Please configure VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, and VITE_EMAILJS_PUBLIC_KEY in your hosting environment settings)." 
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
        return res.status(response.status).json({ success: false, error: bodyText || `EmailJS returned status code ${response.status}` });
      }
    } catch (error: any) {
      console.error("[EmailOTPProxy] Network or fetch error targeting EmailJS REST API:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to contact EmailJS servers." });
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
