import re

with open("frontend/src/pages/Marketplace.tsx", "r") as f:
    content = f.read()

# 1. Change 'Rental Price' to 'Starting From' in the product card
card_old = """                        <p className="text-xs font-bold text-[var(--text-muted)] opacity-70 uppercase tracking-wider mb-1">Rental Price</p>
                        <p className="font-black text-2xl text-[var(--text-main)] leading-none">${Number(price).toFixed(2)}<span className="text-sm text-[var(--text-muted)] font-medium">/day</span></p>"""
card_new = """                        <p className="text-xs font-bold text-[var(--text-muted)] opacity-70 uppercase tracking-wider mb-1">Starting From</p>
                        <p className="font-black text-2xl text-[var(--text-main)] leading-none">${Number(price).toFixed(2)}<span className="text-sm text-[var(--text-muted)] font-medium">/day</span></p>"""
content = content.replace(card_old, card_new)


# 2. Add Units list to Modal
modal_old = """              <div className="mt-auto pt-6 border-t border-[var(--border-soft)] flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 w-full text-center sm:text-left">
                  <p className="text-sm font-bold text-[var(--text-muted)] opacity-70 uppercase tracking-wider mb-1">Rental Price</p>
                  <p className="font-black text-3xl text-[var(--text-main)] leading-none">
                    ${Number(selectedProduct.units?.[0]?.rental_price || 0).toFixed(2)}
                    <span className="text-base text-[var(--text-muted)] font-medium">/day</span>
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/public/organizations/${selectedProduct.organization_id}/rentals`)}
                  className="w-full sm:w-auto px-8 py-4 bg-brand-primary hover:bg-brand-accent text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-primary/25 hover:shadow-xl hover:-translate-y-0.5"
                >
                  <ExternalLink className="w-5 h-5" />
                  View Vendor Store
                </button>
              </div>"""

modal_new = """              <div className="flex-1">
                <h3 className="font-bold text-[var(--text-main)] mb-4">Available Units</h3>
                {selectedProduct.units && selectedProduct.units.length > 0 ? (
                  <div className="space-y-4 mb-8">
                    {selectedProduct.units.map((unit: any) => (
                      <div key={unit.product_unit_id} className="bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                        <div className="flex items-center gap-4">
                          {unit.image && (
                            <img src={unit.image} alt={unit.name || selectedProduct.name} className="w-16 h-16 rounded-xl object-cover shadow-sm border border-[var(--border-soft)]" />
                          )}
                          <div>
                            <p className="font-bold text-[var(--text-main)]">{unit.name || `${selectedProduct.name} Unit`}</p>
                            {unit.serial_number && (
                              <p className="text-xs font-mono text-[var(--text-muted)] mt-1 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span> SN: {unit.serial_number}
                              </p>
                            )}
                            <p className="font-black text-brand-primary mt-2">
                              ${Number(unit.rental_price).toFixed(2)}<span className="text-xs text-[var(--text-muted)] font-medium">/day</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 mb-8 border border-[var(--border-soft)] border-dashed rounded-2xl">
                    <p className="text-[var(--text-muted)]">No units available for this product.</p>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-6 border-t border-[var(--border-soft)] flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 w-full text-center sm:text-left">
                  <p className="text-sm font-bold text-[var(--text-muted)] opacity-70 uppercase tracking-wider mb-1">Starting From</p>
                  <p className="font-black text-3xl text-[var(--text-main)] leading-none">
                    ${Number(selectedProduct.units?.[0]?.rental_price || 0).toFixed(2)}
                    <span className="text-base text-[var(--text-muted)] font-medium">/day</span>
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/public/organizations/${selectedProduct.organization_id}/rentals`)}
                  className="w-full sm:w-auto px-8 py-4 bg-brand-primary hover:bg-brand-accent text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-primary/25 hover:shadow-xl hover:-translate-y-0.5"
                >
                  <ExternalLink className="w-5 h-5" />
                  View Vendor Store
                </button>
              </div>"""
content = content.replace(modal_old, modal_new)

with open("frontend/src/pages/Marketplace.tsx", "w") as f:
    f.write(content)
