import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  Calendar, 
  Package, 
  DollarSign, 
  Hash, 
  FileText,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatNumberWithCommas, parseFormattedNumber, toValidDate } from '../lib/formatters';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { type LedgerEntry } from '../db';

interface LossFormProps {
  onSubmit: (data: any) => void;
  onClose: () => void;
  invoices: LedgerEntry[];
  initialData?: any;
}

export const LossForm = ({ onSubmit, onClose, invoices, initialData }: LossFormProps) => {
  const [lossType, setLossType] = useState<'expired' | 'damaged'>(initialData?.lossType || 'expired');
  const [itemName, setItemName] = useState(initialData?.itemName || '');
  const [quantity, setQuantity] = useState<string>(initialData?.quantity?.toString() || '');
  const [purchasePrice, setPurchasePrice] = useState<string>(initialData?.purchasePrice ? formatNumberWithCommas(initialData.purchasePrice) : '');
  const [totalLoss, setTotalLoss] = useState<string>(initialData?.totalLoss ? formatNumberWithCommas(initialData.totalLoss) : '0');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(initialData?.invoiceId || '');
  const [date, setDate] = useState(initialData?.date ? toValidDate(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

  // Handle invoice change - auto fill purchase price if possible
  useEffect(() => {
    if (selectedInvoiceId && !initialData) {
      const inv = invoices.find(i => i.id === selectedInvoiceId);
      if (inv) {
        // ...
      }
    }
  }, [selectedInvoiceId, invoices, initialData]);

  // Recalculate total loss
  useEffect(() => {
    const q = parseFloat(quantity) || 0;
    const p = parseFormattedNumber(purchasePrice);
    setTotalLoss(formatNumberWithCommas(Math.round(q * p)));
  }, [quantity, purchasePrice]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = parseFloat(quantity) || 0;
    const p = parseFormattedNumber(purchasePrice);
    
    onSubmit({
      ...initialData,
      date: toValidDate(date),
      lossType,
      itemName,
      quantity: q,
      purchasePrice: p,
      totalLoss: q * p,
      invoiceId: selectedInvoiceId === 'none' ? null : selectedInvoiceId || null,
      notes: (e.currentTarget as any).notes.value,
      updatedAt: new Date()
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-right" dir="rtl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Loss Type */}
        <div className="space-y-3 p-4 bg-muted/10 border border-border rounded-2xl">
          <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest block">نوع الخسارة</Label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setLossType('expired')}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                lossType === 'expired' 
                ? 'border-rose-500 bg-rose-500/10 text-rose-600' 
                : 'border-border bg-muted/30 text-muted-foreground'
              }`}
            >
              <Trash2 className="h-5 w-5" />
              <div className="text-sm font-black uppercase">إكسباير (منتهي)</div>
            </button>
            <button
              type="button"
              onClick={() => setLossType('damaged')}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                lossType === 'damaged' 
                ? 'border-orange-500 bg-orange-500/10 text-orange-600' 
                : 'border-border bg-muted/30 text-muted-foreground'
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
              <div className="text-sm font-black uppercase">تالف / متضرر</div>
            </button>
          </div>
        </div>

        {/* Date */}
        <div className="space-y-2">
          <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">تاريخ الاكتشاف / الإتلاف</Label>
          <div className="relative">
            <Input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="bg-muted text-right h-12 rounded-xl font-bold" 
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Item Name */}
        <div className="space-y-2">
          <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">اسم المادة / الدواء</Label>
          <div className="relative">
            <Input 
              placeholder="مثال: بانادول اكسترا" 
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              required
              className="bg-muted text-right h-12 rounded-xl font-bold pr-10" 
            />
            <Package className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Linked Invoice (Optional) */}
        <div className="space-y-2">
          <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">ربط بفاتورة شراء (اختياري)</Label>
          <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
            <SelectTrigger className="bg-muted border-border h-12 rounded-xl font-bold text-right">
              <SelectValue placeholder="اختر الفاتورة..." />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="none">بدون ربط</SelectItem>
              {invoices.filter(i => i.operationType === 'invoice').map(inv => (
                <SelectItem key={inv.id} value={inv.id || ''}>
                  {inv.invoiceNumber || 'بدون رقم'} - {inv.accountName} ({formatNumberWithCommas(inv.amount)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quantity */}
        <div className="space-y-2">
          <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">عدد القطع</Label>
          <div className="relative">
            <Input 
              type="number" 
              placeholder="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              className="bg-muted text-right h-12 rounded-xl font-mono font-bold pr-10" 
            />
            <Hash className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Purchase Price */}
        <div className="space-y-2">
          <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">سعر شراء القطعة</Label>
          <CurrencyInput 
            value={parseFormattedNumber(purchasePrice)}
            onChange={(val) => setPurchasePrice(formatNumberWithCommas(val))}
            placeholder="0,000"
            className="bg-muted text-right h-12 rounded-xl font-mono font-bold" 
          />
        </div>

        {/* Total Loss Display */}
        <div className="space-y-2 p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
          <Label className="text-rose-700 font-black text-[10px] uppercase tracking-widest block mb-1">إجمالي الخسارة</Label>
          <div className="text-2xl font-black font-mono text-rose-600">
            {totalLoss}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">ملاحظات إضافية</Label>
        <Textarea 
          name="notes" 
          defaultValue={initialData?.notes || ''}
          placeholder="اكتب تفاصيل إضافية هنا..." 
          className="bg-muted border-border text-foreground h-24 rounded-xl font-bold text-right" 
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-6">
        <Button 
          type="submit" 
          className="flex-3 font-black text-xl h-16 rounded-2xl bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-500/20"
        >
          {initialData ? 'حفظ التعديلات' : 'حفظ وتسجيل الخسارة'}
        </Button>
        <Button 
          type="button" 
          onClick={onClose}
          className="flex-1 font-black h-16 rounded-2xl border-border text-lg"
        >
          إلغاء
        </Button>
      </div>
    </form>
  );
};
