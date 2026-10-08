import re

# 1. Update Marketplace.tsx
with open("frontend/src/pages/Marketplace.tsx", "r") as f:
    market = f.read()

market_unit_old = """                          <div className="flex justify-between items-end mt-4">
                            <p className="font-black text-brand-primary">
                              ${Number(unit.rental_price).toFixed(2)}<span className="text-xs text-[var(--text-muted)] font-medium">/day</span>
                            </p>
                          </div>"""

market_unit_new = """                          <div className="flex justify-between items-end mt-4">
                            <div>
                              <p className="font-black text-brand-primary">
                                ${Number(unit.rental_price).toFixed(2)}<span className="text-xs text-[var(--text-muted)] font-medium">/day</span>
                              </p>
                              {unit.quantity_available !== undefined && (
                                <p className={`text-xs font-bold mt-1 ${unit.quantity_available > 0 ? 'text-green-600' : 'text-rose-500'}`}>
                                  {unit.quantity_available > 0 ? `${unit.quantity_available} available` : 'Out of stock'}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                if (unit.quantity_available === 0) return;
                                const storeId = selectedProduct.organization_slug || selectedProduct.organization_id;
                                navigate(`/public/store/${storeId}/checkout`, {
                                  state: { cart: [{ product: selectedProduct, unit, quantity: 1 }] }
                                });
                              }}
                              disabled={unit.quantity_available === 0}
                              className={`px-4 py-2 font-bold text-sm rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center ${
                                unit.quantity_available === 0
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-brand-primary hover:bg-brand-accent text-white hover:shadow-lg'
                              }`}
                            >
                              Rent Now
                            </button>
                          </div>"""
market = market.replace(market_unit_old, market_unit_new)

with open("frontend/src/pages/Marketplace.tsx", "w") as f:
    f.write(market)


# 2. Update PublicRentals.tsx
with open("frontend/src/pages/PublicRentals.tsx", "r") as f:
    publicr = f.read()

publicr_unit_old = """                              <p className="font-black text-brand-primary mt-2">
                                ${Number(unit.rental_price).toFixed(2)}<span className="text-xs text-gray-500 font-medium">/day</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {cartItem && (
                              <span className="text-xs font-bold text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-full">
                                {cartItem.quantity} added
                              </span>
                            )}
                            <button
                              onClick={() => addToCart(selectedProduct, unit)}
                              className="w-full sm:w-auto px-5 py-2.5 bg-gray-900 hover:bg-black text-white font-bold text-sm rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center"
                            >
                              Add
                            </button>
                          </div>"""

publicr_unit_new = """                              <p className="font-black text-brand-primary mt-2">
                                ${Number(unit.rental_price).toFixed(2)}<span className="text-xs text-gray-500 font-medium">/day</span>
                              </p>
                              {unit.quantity_available !== undefined && (
                                <p className={`text-xs font-bold mt-1 ${unit.quantity_available > 0 ? 'text-green-600' : 'text-rose-500'}`}>
                                  {unit.quantity_available > 0 ? `${unit.quantity_available} available` : 'Out of stock'}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {cartItem && (
                              <span className="text-xs font-bold text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-full">
                                {cartItem.quantity} added
                              </span>
                            )}
                            <button
                              onClick={() => {
                                if (unit.quantity_available > 0) {
                                  addToCart(selectedProduct, unit);
                                }
                              }}
                              disabled={unit.quantity_available === 0}
                              className={`w-full sm:w-auto px-5 py-2.5 font-bold text-sm rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center ${
                                unit.quantity_available === 0
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                                  : 'bg-gray-900 hover:bg-black text-white hover:shadow-lg'
                              }`}
                            >
                              Add
                            </button>
                          </div>"""
publicr = publicr.replace(publicr_unit_old, publicr_unit_new)

# Add check to addToCart
add_to_cart_old = """  const addToCart = (product: any, unit: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.unit.product_unit_id === unit.product_unit_id);
      if (existing) {
        return prev.map(item =>
          item.unit.product_unit_id === unit.product_unit_id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, unit, quantity: 1 }];
    });

    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };"""

add_to_cart_new = """  const addToCart = (product: any, unit: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.unit.product_unit_id === unit.product_unit_id);
      if (existing) {
        // Enforce quantity_available limit if defined
        if (unit.quantity_available !== undefined && existing.quantity >= unit.quantity_available) {
          return prev; // Do not add more
        }
        return prev.map(item =>
          item.unit.product_unit_id === unit.product_unit_id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      if (unit.quantity_available === 0) return prev;
      return [...prev, { product, unit, quantity: 1 }];
    });

    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };"""
publicr = publicr.replace(add_to_cart_old, add_to_cart_new)

with open("frontend/src/pages/PublicRentals.tsx", "w") as f:
    f.write(publicr)
