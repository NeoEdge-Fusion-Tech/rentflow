import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCcw,
  Package,
  Layers,
  Tag
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { cn } from '@/src/utils';
import { ProductService } from '../api';

export function Scanner() {
  const [actionType, setActionType] = useState<'pickup' | 'return'>('pickup');
  const [unitType, setUnitType] = useState<'single' | 'bulk'>('single');
  
  const [serialCode, setSerialCode] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [qtyDamaged, setQtyDamaged] = useState(0);
  const [condition, setCondition] = useState<'good' | 'damaged'>('good');

  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [actionData, setActionData] = useState<any>(null);

  // Auto-reset secondary fields when mode changes to prevent accidental submissions
  useEffect(() => {
    setQuantity(1);
    setQtyDamaged(0);
    setCondition('good');
  }, [actionType, unitType]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!serialCode.trim()) {
      setError('Please enter or scan a serial code.');
      setStatus('error');
      return;
    }

    if (quantity < 1) {
      setError('Quantity must be at least 1.');
      setStatus('error');
      return;
    }

    if (qtyDamaged > quantity) {
      setError('Damaged quantity cannot exceed total quantity.');
      setStatus('error');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const payload: any = {
        serial_number: serialCode.trim(),
        action: actionType,
      };

      if (unitType === 'bulk') {
        if (actionType === 'pickup') {
          payload.quantity = quantity;
        } else {
          // Return
          payload.qty_good = quantity - qtyDamaged;
          payload.qty_damaged = qtyDamaged;
        }
      } else {
        // Single
        if (actionType === 'return') {
          payload.condition = condition;
          payload.condition_submitted = true;
        }
      }

      const res = await ProductService.scan(payload);
      
      if (res.data.requires_quantity || res.data.requires_condition) {
        // Edge case: our payload format perfectly overrides these, but if it triggers, show as error
        throw new Error(res.data.error || res.data.message || 'Verification required by server.');
      }

      setActionData(res.data);
      setStatus('success');
      
      // Clear form for next scan
      setSerialCode('');
      setQuantity(1);
      setQtyDamaged(0);
      setCondition('good');
      
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Action failed');
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    if (isScanning) {
      scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText) => {
          setSerialCode(decodedText);
          setIsScanning(false);
          if (scanner) scanner.clear();
        },
        () => {}
      );
    }

    return () => {
      if (scanner) scanner.clear().catch(() => {});
    };
  }, [isScanning]);

  const resetStatus = () => {
    setStatus('idle');
    setError(null);
    setActionData(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-8 pb-10">
      <div className="text-center px-4">
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-main)]">Inventory Scanner</h1>
        <p className="text-xs sm:text-sm text-[var(--text-muted)]">Record equipment pickups and returns quickly.</p>
      </div>

      <div className="bg-[var(--bg-surface)] p-6 sm:p-8 rounded-[2rem] sm:rounded-3xl border border-[var(--border-soft)] shadow-xl relative mx-4 sm:mx-0">
        
        {/* SUCCESS STATE */}
        {status === 'success' && (
          <div className="flex flex-col items-center justify-center py-6 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-main)] text-center">{actionData?.message || 'Action Successful'}</h3>
            <p className="text-sm text-[var(--text-muted)] font-medium text-center mt-1">
              Product: <span className="text-[var(--text-main)]">{actionData?.product_name || 'Item'}</span>
            </p>
            {actionData?.serial_number && (
              <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1">SN: {actionData.serial_number}</p>
            )}
            
            <div className="mt-6 flex flex-col gap-3 w-full max-w-xs">
              <button onClick={resetStatus} className="w-full bg-brand-primary text-brand-accent py-3 rounded-xl font-bold hover:opacity-90 transition-opacity whitespace-nowrap">
                Scan Next Item
              </button>
            </div>
          </div>
        )}

        {/* ERROR STATE */}
        {status === 'error' && (
          <div className="flex flex-col items-center justify-center py-6 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-10 h-10 text-rose-500" />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-main)] text-center mb-2">Action Failed</h3>
            <div className="bg-rose-500/10 text-rose-500 p-4 rounded-xl text-sm font-bold w-full text-center border border-rose-500/20">
              {error}
            </div>
            <div className="mt-6 flex flex-col gap-3 w-full max-w-xs">
              <button onClick={resetStatus} className="w-full bg-brand-primary text-brand-accent py-3 rounded-xl font-bold hover:opacity-90 transition-opacity whitespace-nowrap">
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* LOADING STATE */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-10 h-10 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mb-4" />
            <p className="text-sm font-bold text-[var(--text-muted)]">Processing with server...</p>
          </div>
        )}

        {/* MAIN FORM */}
        {status === 'idle' && !isLoading && (
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Action Type */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Action</label>
                <div className="flex p-1 bg-[var(--bg-app)] rounded-xl border border-[var(--border-soft)]">
                  <button
                    type="button"
                    onClick={() => setActionType('pickup')}
                    className={cn(
                      "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                      actionType === 'pickup' ? "bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm border border-[var(--border-soft)]" : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)]/50"
                    )}
                  >
                    Pickup
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionType('return')}
                    className={cn(
                      "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                      actionType === 'return' ? "bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm border border-[var(--border-soft)]" : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)]/50"
                    )}
                  >
                    Return
                  </button>
                </div>
              </div>

              {/* Unit Type */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Item Type</label>
                <div className="flex p-1 bg-[var(--bg-app)] rounded-xl border border-[var(--border-soft)]">
                  <button
                    type="button"
                    onClick={() => setUnitType('single')}
                    className={cn(
                      "flex-1 py-2 text-sm font-bold text-center rounded-lg transition-all flex items-center justify-center gap-2",
                      unitType === 'single' ? "bg-brand-primary text-brand-accent shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)]/50"
                    )}
                  >
                    <Tag className="w-4 h-4" /> Single Unit
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnitType('bulk')}
                    className={cn(
                      "flex-1 py-2 text-sm font-bold text-center rounded-lg transition-all flex items-center justify-center gap-2",
                      unitType === 'bulk' ? "bg-purple-600 text-white shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)]/50"
                    )}
                  >
                    <Layers className="w-4 h-4" /> Bulk Item
                  </button>
                </div>
              </div>
            </div>

            <div className="w-full border-t border-[var(--border-soft)]" />

            {/* Inputs */}
            <div className="space-y-6">
              
              {/* Serial Code */}
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">
                    {unitType === 'single' ? 'Serial Number (SN)' : 'Bulk Item Code'}
                  </label>
                  {isScanning ? (
                    <button type="button" onClick={() => setIsScanning(false)} className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1">
                      <RefreshCcw className="w-3 h-3" /> Close Camera
                    </button>
                  ) : (
                    <button type="button" onClick={() => setIsScanning(true)} className="text-xs font-bold text-brand-primary hover:text-brand-primary/80 flex items-center gap-1 bg-brand-primary/10 px-2 py-1 rounded-md">
                      <Camera className="w-3 h-3" /> Open Camera
                    </button>
                  )}
                </div>

                {isScanning && (
                  <div className="relative mb-4">
                    <div id="reader" className="w-full overflow-hidden rounded-xl border-4 border-[var(--border-soft)] min-h-[250px]" />
                  </div>
                )}

                <div className="relative">
                  <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={serialCode}
                    onChange={(e) => setSerialCode(e.target.value)}
                    placeholder={unitType === 'single' ? "Enter or scan serial number..." : "Enter bulk asset code..."}
                    className="w-full h-12 pl-12 pr-4 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary text-sm font-bold uppercase text-[var(--text-main)]"
                    required
                  />
                </div>
              </div>

              {/* Bulk Fields */}
              {unitType === 'bulk' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">
                      {actionType === 'pickup' ? 'Quantity to Pickup' : 'Total Returned'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full h-12 px-4 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary text-sm font-bold text-[var(--text-main)]"
                      required
                    />
                  </div>
                  
                  {actionType === 'return' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-rose-500 uppercase tracking-widest">Quantity Damaged</label>
                      <input
                        type="number"
                        min="0"
                        max={quantity}
                        value={qtyDamaged}
                        onChange={(e) => setQtyDamaged(Math.min(quantity, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="w-full h-12 px-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 text-sm font-bold"
                        required
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Single Condition Fields */}
              {unitType === 'single' && actionType === 'return' && (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Item Condition</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={cn(
                      "flex items-center gap-3 cursor-pointer p-4 rounded-xl border-2 transition-all",
                      condition === 'good' ? "bg-emerald-500/10 border-emerald-500" : "bg-[var(--bg-app)] border-[var(--border-soft)] hover:border-emerald-500/50"
                    )}>
                      <input type="radio" value="good" checked={condition === 'good'} onChange={() => setCondition('good')} className="hidden" />
                      <CheckCircle2 className={cn("w-5 h-5", condition === 'good' ? "text-emerald-500" : "text-[var(--text-muted)]")} />
                      <span className={cn("text-sm font-bold flex-1", condition === 'good' ? "text-emerald-500" : "text-[var(--text-muted)]")}>Good Condition</span>
                    </label>
 
                    <label className={cn(
                      "flex items-center gap-3 cursor-pointer p-4 rounded-xl border-2 transition-all",
                      condition === 'damaged' ? "bg-rose-500/10 border-rose-500" : "bg-[var(--bg-app)] border-[var(--border-soft)] hover:border-rose-500/50"
                    )}>
                      <input type="radio" value="damaged" checked={condition === 'damaged'} onChange={() => setCondition('damaged')} className="hidden" />
                      <AlertCircle className={cn("w-5 h-5", condition === 'damaged' ? "text-rose-500" : "text-[var(--text-muted)]")} />
                      <span className={cn("text-sm font-bold flex-1", condition === 'damaged' ? "text-rose-500" : "text-[var(--text-muted)]")}>Damaged</span>
                    </label>
                  </div>
                </div>
              )}

            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !serialCode.trim()}
              className="w-full h-14 bg-brand-primary text-brand-accent rounded-xl font-black text-sm uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-xl shadow-brand-primary/20"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Submit {actionType}</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
