import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCcw,
  Package,
  ArrowRight,
  ArrowLeft,
  Layers,
  Tag
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { cn } from '@/src/utils';
import { ProductService } from '../api';

// Scanner state machine:
// idle → scanning → verified (shows unit info + action buttons) → 
//   bulk pickup → quantity picker → success/error
//   bulk return  → good/damaged picker → success/error
//   single pickup → success/error
//   single return → condition picker → success/error

export function Scanner() {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState<'idle' | 'verified' | 'quantity' | 'condition' | 'success' | 'error'>('idle');
  const [manualSerial, setManualSerial] = useState('');
  const [scanData, setScanData] = useState<any>(null);   // data from verify call
  const [actionData, setActionData] = useState<any>(null); // data from action call
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Quantity state for bulk
  const [maxQuantity, setMaxQuantity] = useState(0);
  const [batchQuantity, setBatchQuantity] = useState(1);
  const [totalReturned, setTotalReturned] = useState(1);
  const [qtyDamaged, setQtyDamaged] = useState(0);
  const [pendingAction, setPendingAction] = useState<'pickup' | 'return' | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<'good' | 'damaged'>('good');

  // Step 1: Verify the scanned serial number
  const verifySerial = async (serial: string) => {
    setIsLoading(true);
    setError(null);
    setScanResult(serial);
    setIsScanning(false);

    try {
      const res = await ProductService.scan({ serial_number: serial, action: 'verify' });
      setScanData(res.data);
      // If we got back specific counts from verify, use them (useful for pre-filling)
      const availQty = res.data.available_quantity || 0;
      const rentedQty = res.data.quantity_rented || 0;
      
      setStatus('verified');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Item not found in inventory');
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: User picks pickup or return — for bulk show quantity picker, else for return show condition
  const initiateAction = (action: 'pickup' | 'return') => {
    setPendingAction(action);
    const unitType = scanData?.unit_type;
    const availQty = scanData?.available_quantity || 1;
    const rentedQty = scanData?.quantity_rented || 0;

    if (unitType === 'bulk') {
      if (action === 'return') {
        const out = rentedQty || (scanData.quantity - scanData.available_quantity) || 0;
        setMaxQuantity(out || scanData.quantity); // Fallback to total qty if out matches available (full return)
        setTotalReturned(out || 1);
        setQtyDamaged(0);
        setStatus('quantity');
      } else {
        setMaxQuantity(availQty);
        setBatchQuantity(availQty);
        setStatus('quantity');
      }
    } else {
      // Single unit
      if (action === 'return') {
        // Go to condition picker step
        setStatus('condition');
      } else {
        // Pickup fires directly (qty=1 implied)
        fireAction(action, {});
      }
    }
  };

  // Step 3: Fire the actual scan action
  const fireAction = async (
    action: 'pickup' | 'return',
    options: { qty?: number; qtyGood?: number; qtyDamaged?: number; condition?: string; condition_submitted?: boolean }
  ) => {
    if (!scanResult) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await ProductService.scan({
        serial_number: scanResult,
        action,
        quantity: options.qty,
        qty_good: options.qtyGood,
        qty_damaged: options.qtyDamaged,
        condition: options.condition,
        condition_submitted: options.condition_submitted,
      });

      const data = res.data;

      if (data.requires_quantity) {
        // Server asks for quantity (fallback)
        const max = data.max_quantity || 1;
        setMaxQuantity(max);
        if (data.is_return) { 
          setTotalReturned(max); 
          setQtyDamaged(0); 
        } else {
          setBatchQuantity(max);
        }
        setActionData(data);
        setPendingAction(action);
        setStatus('quantity');
        return;
      }

      if (data.requires_condition) {
        setActionData(data);
        setPendingAction(action);
        setStatus('condition');
        return;
      }

      setActionData(data);
      setStatus('success');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Action failed');
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
          verifySerial(decodedText);
          if (scanner) scanner.clear();
        },
        () => {}
      );
    }

    return () => {
      if (scanner) scanner.clear().catch(() => {});
    };
  }, [isScanning]);

  const reset = () => {
    setScanResult(null);
    setScanData(null);
    setActionData(null);
    setStatus('idle');
    setManualSerial('');
    setError(null);
    setPendingAction(null);
    setSelectedCondition('good');
    setIsScanning(true);
  };

  const unitTypeBadge = (type?: string) => (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
      type === 'bulk'
        ? "bg-purple-100 text-purple-700"
        : "bg-blue-100 text-blue-700"
    )}>
      <Layers className="w-3 h-3" />
      {type === 'bulk' ? 'Bulk Item' : 'Single Unit (SN)'}
    </span>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-8">
      <div className="text-center px-4">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Inventory Scanner</h1>
        <p className="text-xs sm:text-sm text-slate-500">Scan QR codes for quick pickup and return verification.</p>
      </div>

      {/* Scanner Area */}
      <div className="bg-white p-4 sm:p-8 rounded-[2rem] sm:rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative mx-4 sm:mx-0">
        
        {/* IDLE: Ready to scan */}
        {!isScanning && status === 'idle' && (
          <div className="flex flex-col items-center justify-center py-6 sm:py-12 space-y-4 sm:space-y-6">
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-brand-primary/5 rounded-full flex items-center justify-center">
              <QrCode className="w-8 h-8 sm:w-12 sm:h-12 text-brand-primary" />
            </div>
            <div className="text-center w-full max-w-sm">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-2 sm:mt-4">Ready to Scan</h3>
              <p className="text-xs sm:text-sm text-slate-500 mx-auto mt-1 sm:mt-2 mb-4 sm:mb-6">
                Scan a product QR/barcode to verify, then choose pickup or return.
              </p>

              <button
                onClick={() => setIsScanning(true)}
                className="w-full bg-brand-accent text-brand-primary px-6 sm:px-8 py-3 rounded-2xl font-bold hover:bg-brand-accent-hover transition-all shadow-lg shadow-brand-accent/20 flex items-center justify-center gap-2 mb-4 sm:mb-6"
              >
                <Camera className="w-5 h-5" />
                Start Camera
              </button>

              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                <div className="relative flex justify-center">
                  <span className="px-2 bg-white text-slate-500 text-[10px] uppercase tracking-widest font-bold">or enter manually</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={manualSerial}
                  onChange={(e) => setManualSerial(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && manualSerial && verifySerial(manualSerial)}
                  placeholder="Serial / Bulk Code"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand-primary text-sm font-medium"
                />
                <button
                  onClick={() => manualSerial && verifySerial(manualSerial)}
                  disabled={!manualSerial || isLoading}
                  className="w-full sm:w-auto bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 text-sm"
                >
                  Verify
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CAMERA ACTIVE */}
        {isScanning && (
          <div className="relative">
            <div id="reader" className="w-full overflow-hidden rounded-2xl border-4 border-indigo-100 min-h-[300px]" />
            <button
              onClick={() => setIsScanning(false)}
              className="absolute top-4 right-4 bg-white/90 backdrop-blur p-2 rounded-xl text-slate-600 hover:text-rose-600 transition-colors z-10 shadow-sm"
            >
              <RefreshCcw className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* LOADING */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-10 h-10 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
            <p className="text-sm font-bold text-slate-500">Processing…</p>
          </div>
        )}

        {/* VERIFIED: Show item info and action buttons */}
        {!isLoading && status === 'verified' && scanData && (
          <div className="flex flex-col items-center justify-center py-6 sm:py-8 space-y-5 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-brand-primary/5 rounded-full flex items-center justify-center">
              <Package className="w-8 h-8 sm:w-10 sm:h-10 text-brand-primary" />
            </div>
            <div className="text-center space-y-2 px-4">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">{scanData.product_name}</h3>
              {scanData.unit_name && (
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{scanData.unit_name}</p>
              )}
              {unitTypeBadge(scanData.unit_type)}
              {scanData.unit_type === 'bulk' && (
                <p className="text-sm font-bold text-purple-600 mt-1">
                  Qty available: <span className="text-xl">{scanData.available_quantity}</span>
                </p>
              )}
              {scanData.unit_type === 'single' && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium mt-1">
                  <Tag className="w-3 h-3" />
                  SN: <span className="font-bold text-slate-700">{scanResult}</span>
                </div>
              )}
              <span className={cn(
                "inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mt-1",
                scanData.status === 'available' ? "bg-emerald-100 text-emerald-700" :
                scanData.status === 'rented' ? "bg-amber-100 text-amber-700" :
                "bg-rose-100 text-rose-700"
              )}>
                {scanData.status}
              </span>
            </div>

            <div className="w-full max-w-xs space-y-3">
              <button
                onClick={() => initiateAction('pickup')}
                className="w-full bg-amber-500 text-white py-4 rounded-2xl font-bold hover:bg-amber-600 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <ArrowRight className="w-5 h-5" />
                {scanData.unit_type === 'bulk' ? `Pickup (qty)` : 'Mark Picked Up'}
              </button>
              <button
                onClick={() => initiateAction('return')}
                className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                {scanData.unit_type === 'bulk' ? `Return (qty)` : 'Mark Returned'}
              </button>
              <button onClick={reset} className="w-full text-slate-500 text-xs font-bold uppercase tracking-widest hover:text-slate-700">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* QUANTITY: For bulk pickup/return */}
        {!isLoading && status === 'quantity' && (
          <div className="flex flex-col items-center justify-center py-6 sm:py-8 space-y-5 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-purple-50 rounded-full flex items-center justify-center">
              <Layers className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600" />
            </div>
            <div className="text-center space-y-1 px-4">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                {pendingAction === 'return' ? 'Return Quantities' : 'Pickup Quantity'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Product: <span className="text-slate-900 font-bold">{scanData?.product_name || actionData?.product_name}</span>
              </p>
              <p className="text-xs text-slate-400">Max: {maxQuantity}</p>
            </div>

            <div className="w-full max-w-xs space-y-4">
              {pendingAction === 'return' ? (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Total Returned</label>
                    <div className="flex items-center justify-between gap-4">
                      <button onClick={() => setTotalReturned(Math.max(1, totalReturned - 1))} className="w-12 h-12 rounded-xl border flex items-center justify-center font-bold text-xl hover:bg-slate-50">-</button>
                      <input type="number" value={totalReturned} onChange={(e) => setTotalReturned(Math.min(maxQuantity, Math.max(1, parseInt(e.target.value) || 1)))} className="flex-1 text-center font-bold text-2xl outline-none border-b-2 border-slate-300" />
                      <button onClick={() => setTotalReturned(Math.min(maxQuantity, totalReturned + 1))} className="w-12 h-12 rounded-xl border flex items-center justify-center font-bold text-xl hover:bg-slate-50">+</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-rose-500 uppercase">Of which are Damaged</label>
                    <div className="flex items-center justify-between gap-4">
                      <button onClick={() => setQtyDamaged(Math.max(0, qtyDamaged - 1))} className="w-12 h-12 rounded-xl border border-rose-100 flex items-center justify-center font-bold text-xl hover:bg-rose-50">-</button>
                      <input type="number" value={qtyDamaged} onChange={(e) => setQtyDamaged(Math.min(totalReturned, Math.max(0, parseInt(e.target.value) || 0)))} className="flex-1 text-center font-bold text-2xl text-rose-600 outline-none border-b-2 border-rose-300" />
                      <button onClick={() => setQtyDamaged(Math.min(totalReturned, qtyDamaged + 1))} className="w-12 h-12 rounded-xl border border-rose-100 flex items-center justify-center font-bold text-xl hover:bg-rose-50">+</button>
                    </div>
                  </div>
                  <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest bg-emerald-50 py-2 rounded-lg text-emerald-700">
                    Good items: <span className="text-sm">{totalReturned - qtyDamaged}</span>
                  </p>
                </>
              ) : (
                <>
                  <label className="block text-xs font-bold text-slate-500 uppercase text-center">Quantity to Pickup</label>
                  <div className="flex items-center justify-between gap-4">
                    <button onClick={() => setBatchQuantity(Math.max(1, batchQuantity - 1))} className="w-12 h-12 rounded-xl border border-slate-200 flex items-center justify-center font-bold text-xl hover:bg-slate-50">-</button>
                    <input
                      type="number"
                      value={batchQuantity}
                      onChange={(e) => setBatchQuantity(Math.min(maxQuantity, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="flex-1 text-center text-2xl font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button onClick={() => setBatchQuantity(Math.min(maxQuantity, batchQuantity + 1))} className="w-12 h-12 rounded-xl border border-slate-200 flex items-center justify-center font-bold text-xl hover:bg-slate-50">+</button>
                  </div>
                  <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">Max available: {maxQuantity}</p>
                </>
              )}

              <button
                onClick={() => pendingAction && fireAction(pendingAction, pendingAction === 'return' ? { qtyGood: totalReturned - qtyDamaged, qtyDamaged } : { qty: batchQuantity })}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg"
              >
                Confirm {pendingAction === 'pickup' ? 'Pickup' : 'Return'}
              </button>
              <button onClick={reset} className="w-full text-slate-500 text-xs font-bold uppercase tracking-widest hover:text-slate-700">Cancel</button>
            </div>
          </div>
        )}

        {/* CONDITION: Single unit return */}
        {!isLoading && status === 'condition' && (
          <div className="flex flex-col items-center justify-center py-6 sm:py-8 space-y-5 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-brand-primary/5 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-brand-primary" />
            </div>
            <div className="text-center space-y-2 px-4">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">Condition Check</h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                SN: <span className="text-slate-900 font-bold">{actionData?.serial_number || scanResult}</span>
              </p>
              <p className="text-sm font-bold text-brand-primary">{actionData?.message}</p>
            </div>
            <div className="w-full max-w-xs space-y-3">
              <button
                onClick={() => fireAction('return', { condition: 'good', condition_submitted: true })}
                className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                Good Condition
              </button>
              <button
                onClick={() => fireAction('return', { condition: 'damaged', condition_submitted: true })}
                className="w-full bg-rose-500 text-white py-4 rounded-2xl font-bold hover:bg-rose-600 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <AlertCircle className="w-5 h-5" />
                Damaged
              </button>
              <button onClick={reset} className="w-full text-slate-500 text-xs font-bold uppercase tracking-widest mt-2 hover:text-slate-700">Cancel</button>
            </div>
          </div>
        )}

        {/* SUCCESS */}
        {!isLoading && status === 'success' && (
          <div className="flex flex-col items-center justify-center py-6 sm:py-8 space-y-5 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-500" />
            </div>
            <div className="text-center space-y-1 sm:space-y-2 px-2">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">{actionData?.message || 'Action Successful'}</h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">Product: <span className="text-slate-900">{actionData?.product_name}</span></p>
              {actionData?.serial_number && (
                <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest">SN: {actionData.serial_number}</p>
              )}
              <p className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full inline-block mt-2">
                Booking: {actionData?.booking_id}
              </p>
              {actionData?.client_name && (
                <p className="text-xs font-bold text-slate-600">{actionData.client_name}</p>
              )}
            </div>
            <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
              <div className="p-2 bg-white rounded-xl border border-slate-200">
                <Package className="w-5 h-5 sm:w-6 sm:h-6 text-brand-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action Performed</p>
                <p className="text-xs sm:text-sm font-bold text-slate-900">
                  {pendingAction === 'pickup' ? 'Marked for Pickup' : 'Recorded as Returned'}
                </p>
              </div>
            </div>
            <button onClick={reset} className="flex items-center gap-2 text-brand-primary font-bold text-sm hover:underline">
              <RefreshCcw className="w-4 h-4" />
              Scan Next Item
            </button>
          </div>
        )}

        {/* ERROR */}
        {!isLoading && status === 'error' && (
          <div className="flex flex-col items-center justify-center py-6 sm:py-8 space-y-5 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-rose-50 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-rose-500" />
            </div>
            <div className="text-center space-y-1 sm:space-y-2 px-4">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">Action Failed</h3>
              <p className="text-xs sm:text-sm text-rose-600 font-bold">{error}</p>
              <p className="text-[10px] text-slate-400 font-medium mt-2">Serial: {scanResult}</p>
            </div>
            <button onClick={reset} className="flex items-center gap-2 text-brand-primary font-bold text-sm hover:underline">
              <RefreshCcw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Quick Tips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mx-4 sm:mx-0">
        <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 flex gap-3">
          <Layers className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
          <p className="text-[11px] sm:text-xs text-purple-700 font-medium leading-relaxed">
            <strong>Bulk items</strong> will ask how many to pick up or return, and split good vs damaged.
          </p>
        </div>
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex gap-3">
          <Tag className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
          <p className="text-[11px] sm:text-xs text-slate-600 font-medium leading-relaxed">
            <strong>Single units</strong> are scanned by serial number and conditioned during return.
          </p>
        </div>
      </div>
    </div>
  );
}
