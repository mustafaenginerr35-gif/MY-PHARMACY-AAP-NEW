import dotenv from "dotenv";
dotenv.config();

export default async function handler(req: any, res: any) {
  const reqMethod = req.method;
  const reqPath = req.url || "/api/send-otp";
  console.log(`[api/send-otp] Request received. Method: ${reqMethod}, Path: ${reqPath}`);

  if (reqMethod !== "POST") {
    console.warn(`[api/send-otp] Method ${reqMethod} Not Allowed.`);
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      success: false,
      error: `Method ${reqMethod} Not Allowed. Please use POST.`,
    });
  }

  const { email, to_email, fullName, username, to_name, otp, purpose } = req.body || {};
  const resolvedEmail = (email || to_email || "").trim();
  const resolvedFullName = (fullName || username || to_name || "").trim();

  console.log(`[api/send-otp] Body parsed and resolved:`, { 
    resolvedEmail, 
    resolvedFullName, 
    otp: otp ? "***" : undefined, 
    purpose 
  });

  if (!resolvedEmail || !resolvedFullName || !otp) {
    console.error(`[api/send-otp] Missing parameters in body:`, { email: !resolvedEmail, fullName: !resolvedFullName, otp: !otp });
    return res.status(400).json({
      success: false,
      error: `بيانات ناقصة: ${[!resolvedEmail && "البريد الالكتروني", !resolvedFullName && "الاسم الكامل", !otp && "كود OTP"].filter(Boolean).join(", ")}`,
    });
  }

  const serviceId = process.env.VITE_EMAILJS_SERVICE_ID || process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.VITE_EMAILJS_TEMPLATE_ID || process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.VITE_EMAILJS_PUBLIC_KEY || process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY || process.env.EMAILJS_ACCESS_TOKEN;

  console.log("[api/send-otp] Env Variables Status:", {
    EMAILJS_SERVICE_ID: serviceId ? "LOADED (masked: " + serviceId.substring(0, 4) + "...)" : "MISSING",
    EMAILJS_TEMPLATE_ID: templateId ? "LOADED (masked: " + templateId.substring(0, 4) + "...)" : "MISSING",
    EMAILJS_PUBLIC_KEY: publicKey ? "LOADED (masked: " + publicKey.substring(0, 5) + "...)" : "MISSING",
    EMAILJS_PRIVATE_KEY: privateKey ? "LOADED" : "MISSING",
  });

  const missingVars = [];
  if (!serviceId) missingVars.push("EMAILJS_SERVICE_ID");
  if (!templateId) missingVars.push("EMAILJS_TEMPLATE_ID");
  if (!publicKey) missingVars.push("EMAILJS_PUBLIC_KEY");

  if (missingVars.length > 0) {
    const errorMsg = `متغيرات البيئة للبريد الإلكتروني مفقودة: ${missingVars.join(", ")}. يرجى إعدادها في لوحة التحكم.`;
    console.error(`[api/send-otp] ${errorMsg}`);
    return res.status(500).json({
      success: false,
      error: errorMsg,
      missingVars,
    });
  }

  const arabicPurpose = purpose === "reset" ? "إعادة تعيين كلمة مرورك" : "تفعيل حسابك الجديد";
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

    console.log(`[api/send-otp] Dispatching request to EmailJS for: ${resolvedEmail}...`);
    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const bodyText = await response.text();
    console.log(`[api/send-otp] EmailJS responded. HTTP Status: ${response.status}`);
    
    if (response.ok) {
      console.log(`[api/send-otp] OTP email sent successfully to ${resolvedEmail}`);
      return res.status(200).json({ success: true });
    } else {
      console.error(`[api/send-otp] EmailJS returned error status ${response.status}:`, bodyText);
      return res.status(response.status).json({
        success: false,
        error: `استجابة EmailJS (خطأ ${response.status}): ${bodyText || 'لا يوجد نص خطأ'}`,
      });
    }
  } catch (error: any) {
    console.error(`[api/send-otp] Exception during send:`, error);
    return res.status(500).json({
      success: false,
      error: `فشل إرسال كود OTP بسبب خطأ تقني: ${error.message || error}`,
    });
  }
}
