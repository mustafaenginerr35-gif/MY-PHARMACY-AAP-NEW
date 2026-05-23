import { toast } from 'sonner';

export const emailjsService = {
  /**
   * Sends a 6-digit random verification OTP to the user's email via the backend proxy.
   */
  async sendOTP(email: string, fullName: string, otp: string, purpose: 'register' | 'reset' = 'register'): Promise<boolean> {
    try {
      console.log(`[emailjsService] Proxying sendOTP requests for email: ${email}...`);
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          fullName,
          otp,
          purpose,
        }),
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        toast.success('تم إرسال رمز التحقق إلى بريدك الإلكتروني بنجاح.');
        return true;
      } else {
        const errorMsg = data.error || `خطأ غير معروف برمز الحالة ${res.status}`;
        console.error("[emailjsService] OTP Sending Failed:", errorMsg);
        toast.error(`فشل إرسال رمز التحقق: ${errorMsg}`, {
          duration: 10000,
        });
        return false;
      }
    } catch (error: any) {
      console.error('[emailjsService] Network or fetch failure during proxy request:', error);
      toast.error(`حدث خطأ أثناء محاولة إرسال الرمز: ${error?.message || error}`, {
        duration: 10000,
      });
      return false;
    }
  }
};
