import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, X, Check, RefreshCw, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ImageCaptureProps {
  onImageCaptured: (file: File) => void;
  label: string;
  id: string;
  renderTrigger?: (open: () => void) => React.ReactNode;
}

export const ImageCapture: React.FC<ImageCaptureProps> = ({ onImageCaptured, label, id, renderTrigger }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'selection' | 'camera' | 'preview'>('selection');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: false 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setMode('camera');
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast.error("يرجى السماح باستخدام الكاميرا");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        setMode('preview');
        stopCamera();
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImage(event.target?.result as string);
        setMode('preview');
      };
      reader.readAsDataURL(file);
    }
  };

  const confirmImage = () => {
    if (capturedImage) {
      // Convert dataUrl to File
      fetch(capturedImage)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `captured_image_${Date.now()}.jpg`, { type: 'image/jpeg' });
          onImageCaptured(file);
          closeDialog();
        });
    }
  };

  const closeDialog = () => {
    stopCamera();
    setIsOpen(false);
    setMode('selection');
    setCapturedImage(null);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-300">
        {label}
      </label>
      <div className="flex items-center gap-2">
        {renderTrigger ? (
          renderTrigger(() => setIsOpen(true))
        ) : (
          <Button 
            type="button" 
            variant="outline" 
            className="w-full flex items-center justify-between gap-2 border-dashed border-2 h-16 px-4 bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            onClick={() => setIsOpen(true)}
          >
            <div className="flex items-center gap-2">
              {capturedImage ? (
                <div className="h-10 w-10 rounded border border-slate-700 overflow-hidden bg-slate-800">
                  <img src={capturedImage} alt="Thumbnail" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="h-10 w-10 rounded border border-dashed border-slate-700 flex items-center justify-center bg-slate-800/50">
                  <Upload className="h-5 w-5 text-slate-500" />
                </div>
              )}
              <div className="flex flex-col items-start text-right">
                <span className="text-sm font-bold text-white">{capturedImage ? 'تم اختيار صورة' : 'إضافة صورة'}</span>
                <span className="text-[10px] text-slate-500">{capturedImage ? 'انقر لتغيير الصورة' : 'كاميرا أو معرض الصور'}</span>
              </div>
            </div>
            {capturedImage && <Check className="h-5 w-5 text-emerald-500" />}
          </Button>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-800 text-white" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-white">{label}</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {mode === 'selection' && (
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex flex-col items-center gap-3 h-32 border-2 border-slate-800 bg-slate-800/50 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-slate-300 hover:text-white transition-all transform hover:scale-[1.02]"
                  onClick={startCamera}
                >
                  <Camera className="h-8 w-8 text-emerald-500" />
                  <span className="font-bold">التقاط صورة بالكاميرا</span>
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex flex-col items-center gap-3 h-32 border-2 border-slate-800 bg-slate-800/50 hover:border-blue-500/50 hover:bg-blue-500/10 text-slate-300 hover:text-white transition-all transform hover:scale-[1.02]"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="h-8 w-8 text-blue-400" />
                  <span className="font-bold">اختيار من المعرض</span>
                </Button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileSelect}
                />
              </div>
            )}

            {mode === 'camera' && (
              <div className="space-y-4">
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-slate-800 shadow-inner">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 border-[20px] border-black/20 pointer-events-none"></div>
                </div>
                <div className="flex justify-center gap-4">
                  <Button type="button" size="lg" className="rounded-full h-16 w-16 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20" onClick={capturePhoto}>
                    <Camera className="h-8 w-8 text-white" />
                  </Button>
                  <Button type="button" variant="outline" size="lg" className="rounded-full h-16 w-16 border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white" onClick={() => setMode('selection')}>
                    <X className="h-8 w-8" />
                  </Button>
                </div>
              </div>
            )}

            {mode === 'preview' && capturedImage && (
              <div className="space-y-4">
                <div className="relative aspect-video bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
                  <img src={capturedImage} alt="Preview" className="w-full h-full object-contain" />
                </div>
                <div className="flex justify-center gap-4">
                  <Button type="button" className="bg-emerald-600 hover:bg-emerald-700 flex-1 gap-2 h-11" onClick={confirmImage}>
                    <Check className="h-4 w-4" />
                    تأكيد الصورة
                  </Button>
                  <Button type="button" variant="outline" className="flex-1 gap-2 h-11 border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white" onClick={() => {
                    setCapturedImage(null);
                    setMode('selection');
                  }}>
                    <RefreshCw className="h-4 w-4" />
                    إعادة المحاولة
                  </Button>
                </div>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />
        </DialogContent>
      </Dialog>
    </div>
  );
};
