import * as React from 'react';
import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'An unexpected error occurred.';
      let isFirestoreError = false;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.operationType) {
            isFirestoreError = true;
            errorMessage = `Database error during ${parsed.operationType}: ${parsed.error}`;
          }
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50" dir="rtl">
          <Card className="max-w-md w-full border-destructive/50 shadow-lg">
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <CardTitle>حدث خطأ ما</CardTitle>
              </div>
              <CardDescription>
                {isFirestoreError ? 'حدثت مشكلة في أذونات قاعدة البيانات أو الاتصال.' : 'واجه التطبيق خطأ غير متوقع.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-3 rounded bg-destructive/10 text-destructive text-sm font-mono break-all">
                {errorMessage}
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full gap-2"
                variant="outline"
              >
                <RefreshCcw className="h-4 w-4" />
                إعادة تحميل التطبيق
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
