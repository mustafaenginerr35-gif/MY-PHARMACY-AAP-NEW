import emailjs from '@emailjs/browser';
import { toast } from 'sonner';

export const emailjsService = {
  /**
   * Sends a 6-digit random verification OTP to the user's email via EmailJS.
   * If credentials are not configured, falls back to a smart Simulation Mode.
   */
  async sendOTP(email: string, fullName: string, otp: string, purpose: 'register' | 'reset' = 'register'): Promise<boolean> {
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    const arabicPurpose = purpose === 'register' ? 'تفعيل حسابك الجديد' : 'إعادة تعيين كلمة مرورك';
    const message = `مرحباً ${fullName}، رمز التحقق الخاص بك لـ ${arabicPurpose} في صيدليتي هو: ${otp}. هذا الرمز صالح لمدة 10 دقائق فقط.`;

    // Simulation check: if any environment variable is missing, mock the email send
    if (!serviceId || !templateId || !publicKey) {
      console.log(`%c[EmailJS Mock OTP Send]`, 'background: #22c55e; color: #fff; font-weight: bold; padding: 4px 8px; border-radius: 4px;');
      console.log(`إلى: ${fullName} (${email})`);
      console.log(`الهدف: ${arabicPurpose}`);
      console.log(`الرمز: ${otp}`);
      
      toast.info(`(وضع المحاكاة) تم إرسال رمز OTP لتأكيد الحساب إلى: ${email}. الرمز هو: ${otp}`, {
        duration: 15000,
      });
      return true;
    }

    try {
      const templateParams = {
        to_email: email,
        to_name: fullName,
        otp_code: otp,
        purpose_text: arabicPurpose,
        message: message,
      };

      const response = await emailjs.send(serviceId, templateId, templateParams, publicKey);
      if (response.status === 200) {
        toast.success('تم إرسال رمز التحقق إلى بريدك الإلكتروني بنجاح.');
        return true;
      }
      throw new Error(`EmailJS returned status code ${response.status}`);
    } catch (error: any) {
      console.error('Failed to send email via EmailJS:', error);
      // Fallback to simulation mode to prevent blocking the user
      const friendlyError = error?.text || error?.message || String(error);
      toast.warning(`فشل إرسال البريد الإلكتروني (${friendlyError}). تم التحويل لوضع المحاكاة. الرمز الحالي هو: ${otp}`, {
        duration: 12000,
      });
      return true;
    }
  }
};
