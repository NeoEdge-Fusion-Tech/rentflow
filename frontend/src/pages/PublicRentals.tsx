import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Search,
  ShoppingBag,
  X,
  Check,
  Building2,
  Filter,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import axios from "axios";
import { OpeningHours, OpenStatusBadge } from "../components/OpeningHours";
import { ThemeToggle } from "../components/ThemeToggle";
import {
  FilterCheckbox,
  formatPrice,
  priceOf,
  toggleIn,
} from "../components/StoreFilters";

const CATEGORIES_COLLAPSED = 5;

export function PublicRentals() {
  const { org_id, identifier } = useParams();
  const storeIdentifier = identifier || org_id;
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Filters
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [cart, setCart] = useState<
    { product: any; unit: any; quantity: number }[]
  >([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    fetchProductsAndSettings();
  }, [storeIdentifier]);

  // Keep the page behind the mobile filter sheet / product sheet still.
  useEffect(() => {
    const locked = showMobileFilters || selectedProduct !== null;
    const prev = document.body.style.overflow;
    if (locked) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showMobileFilters, selectedProduct]);

  const fetchProductsAndSettings = async () => {
    setLoading(true);
    try {
      const baseUrl =
        import.meta.env.VITE_API_URL || "http://localhost:8000/api";
      const [productsRes, settingsRes] = await Promise.all([
        axios.get(
          `${baseUrl}/public/organizations/${storeIdentifier}/products/`,
        ),
        axios
          .get(
            `${baseUrl}/public/organizations/${storeIdentifier}/availability/`,
          )
          .catch(() => ({ data: null })),
      ]);
      setProducts(productsRes.data.results || productsRes.data);
      setSettings(settingsRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Category options: busiest first, alphabetical on ties.
  const categoryCounts = products.reduce<Record<string, number>>((acc, p) => {
    if (p.category_name) acc[p.category_name] = (acc[p.category_name] || 0) + 1;
    return acc;
  }, {});
  const categoryOptions: { name: string; count: number }[] = Object.entries(
    categoryCounts as Record<string, number>,
  )
    .map(([name, count]) => ({ name, count: Number(count) }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const visibleCategories = showAllCategories
    ? categoryOptions
    : categoryOptions.filter(
        (c, i) =>
          i < CATEGORIES_COLLAPSED || selectedCategories.includes(c.name),
      );
  const hiddenCategoryCount = categoryOptions.length - visibleCategories.length;

  const currencySymbol = products.find((p) => p.currency_symbol)
    ?.currency_symbol;
  const inStockCount = products.filter(
    (p) => Number(p.quantity_available) > 0,
  ).length;

  const activeFilterCount =
    selectedCategories.length +
    (inStockOnly ? 1 : 0) +
    (minPrice || maxPrice ? 1 : 0);

  const clearFilters = () => {
    setSelectedCategories([]);
    setInStockOnly(false);
    setMinPrice("");
    setMaxPrice("");
  };

  const filteredProducts = products.filter((p) => {
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      const matches =
        p.name.toLowerCase().includes(term) ||
        (p.category_name && p.category_name.toLowerCase().includes(term)) ||
        (p.description && p.description.toLowerCase().includes(term)) ||
        (p.units || []).some(
          (u: any) =>
            (u.name && u.name.toLowerCase().includes(term)) ||
            (u.serial_number &&
              String(u.serial_number).toLowerCase().includes(term)),
        );
      if (!matches) return false;
    }
    if (
      selectedCategories.length > 0 &&
      !selectedCategories.includes(p.category_name)
    )
      return false;
    if (inStockOnly && !(Number(p.quantity_available) > 0)) return false;
    if (minPrice !== "" || maxPrice !== "") {
      const price = priceOf(p);
      if (price == null) return false;
      if (minPrice !== "" && price < Number(minPrice)) return false;
      if (maxPrice !== "" && price > Number(maxPrice)) return false;
    }
    return true;
  });

  const addToCart = (product: any, unit: any) => {
    const existing = cart.find(
      (item) => item.unit.product_unit_id === unit.product_unit_id,
    );
    if (existing) {
      setCart(
        cart.map((item) =>
          item.unit.product_unit_id === unit.product_unit_id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
    } else {
      setCart([...cart, { product, unit, quantity: 1 }]);
    }
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleCheckout = () => {
    navigate(`/public/store/${storeIdentifier}/checkout`, { state: { cart } });
  };

  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalAmount = cart.reduce(
    (acc, item) => acc + Number(item.unit?.rental_price || 0) * item.quantity,
    0,
  );

  const orgName =
    settings?.storefront_name ||
    settings?.organization_name ||
    (products.length > 0 ? products[0].organization_name : "Rentals");
  const orgLogo =
    settings?.organization_logo ||
    (products.length > 0 ? products[0].organization_logo : null);

  const storeAvailability = settings
    ? {
        available_days: Array.isArray(settings.available_days)
          ? settings.available_days
          : [],
        open_time: settings.open_time,
        close_time: settings.close_time,
        timezone: settings.timezone,
      }
    : null;
  const notAccepting = settings && settings.is_accepting_requests === false;

  const inputCls =
    "w-full bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl p-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none text-[var(--text-main)] placeholder:text-[var(--text-muted)]";

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex flex-col font-sans relative transition-colors duration-300">
      {/* Header */}
      <header className="bg-[var(--bg-surface)] shadow-sm border-b border-[var(--border-soft)] sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {orgLogo ? (
              <img
                src={orgLogo}
                alt={orgName}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover shadow-sm shrink-0"
              />
            ) : (
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-brand-primary rounded-xl flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--text-on-brand)]" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-black text-[var(--text-main)] tracking-tight leading-none truncate">
                {orgName}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-[var(--text-muted)] font-medium">
                  Official Rental Store
                </p>
                {!notAccepting && (
                  <OpenStatusBadge availability={storeAvailability} />
                )}
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center flex-1 max-w-xl mx-6">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search products or categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-2xl text-sm font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle className="bg-transparent border-0 shadow-none p-2 rounded-full hover:bg-[var(--border-subtle)]" />
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className={`hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold transition-all ${
                cart.length > 0
                  ? "bg-brand-primary text-[var(--text-on-brand)] hover:opacity-90 shadow-sm"
                  : "bg-[var(--bg-app)] text-[var(--text-muted)] border border-[var(--border-soft)] cursor-not-allowed"
              }`}
            >
              <ShoppingBag className="w-5 h-5" />
              Checkout ({totalCartItems})
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Search & Filter Toggle */}
      <div className="md:hidden bg-[var(--bg-surface)] p-4 border-b border-[var(--border-soft)] sticky top-16 z-10 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-2xl text-sm font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
          />
        </div>
        <button
          onClick={() => setShowMobileFilters(true)}
          aria-label="Filters"
          className={`relative w-12 h-12 shrink-0 border rounded-2xl flex items-center justify-center active:scale-95 transition-transform ${
            activeFilterCount > 0
              ? "bg-brand-primary/10 border-brand-primary text-brand-primary"
              : "bg-[var(--bg-app)] border-[var(--border-soft)] text-[var(--text-muted)]"
          }`}
        >
          <Filter className="w-5 h-5" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-brand-primary text-[var(--text-on-brand)] text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 w-full pb-32 sm:pb-10">
        {/* Store status: opening hours, or not accepting requests */}
        {notAccepting ? (
          <div className="mb-6 flex items-start gap-3 p-4 rounded-2xl border text-sm bg-rose-500/10 border-rose-500/30 text-rose-600">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="font-medium">
              This store isn't taking new rental requests right now. You can
              still browse.
            </p>
          </div>
        ) : (
          <OpeningHours availability={storeAvailability} className="mb-6" />
        )}

        <div className="flex flex-col md:flex-row gap-6 lg:gap-8">
          {showMobileFilters && (
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
              onClick={() => setShowMobileFilters(false)}
              aria-hidden="true"
            />
          )}
          {/* Sidebar */}
          <aside
            className={`${
              showMobileFilters
                ? "fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl rounded-b-none animate-in slide-in-from-bottom duration-200"
                : "hidden"
            } md:block md:z-auto md:max-h-[calc(100vh-8rem)] md:overflow-y-auto md:rounded-3xl md:animate-none md:sticky md:top-28 w-full md:w-64 shrink-0 space-y-8 bg-[var(--bg-surface)] p-6 pb-0 md:pb-6 border border-[var(--border-soft)] shadow-sm h-fit`}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-soft)]">
              <h3 className="font-bold text-[var(--text-main)] flex items-center gap-2">
                <Filter className="w-4 h-4 text-brand-primary" />
                Filters
              </h3>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs font-bold text-brand-primary hover:underline"
                  >
                    Clear all ({activeFilterCount})
                  </button>
                )}
                <button
                  onClick={() => setShowMobileFilters(false)}
                  aria-label="Close filters"
                  className="md:hidden p-1.5 rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-app)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                Categories
              </h4>
              <div className="space-y-3">
                {visibleCategories.map(({ name, count }) => (
                  <React.Fragment key={name}>
                    <FilterCheckbox
                      label={name}
                      count={count}
                      checked={selectedCategories.includes(name)}
                      onChange={(on) =>
                        setSelectedCategories(
                          toggleIn(selectedCategories, name, on),
                        )
                      }
                    />
                  </React.Fragment>
                ))}
                {categoryOptions.length === 0 && (
                  <p className="text-xs text-[var(--text-muted)]">
                    No categories yet.
                  </p>
                )}
                {categoryOptions.length > CATEGORIES_COLLAPSED && (
                  <button
                    type="button"
                    onClick={() => setShowAllCategories((v) => !v)}
                    className="flex items-center gap-1 text-xs font-bold text-brand-primary hover:underline pt-1"
                  >
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${
                        showAllCategories ? "rotate-180" : ""
                      }`}
                    />
                    {showAllCategories
                      ? "Show less"
                      : `Show all categories${
                          hiddenCategoryCount > 0
                            ? ` (${hiddenCategoryCount} more)`
                            : ""
                        }`}
                  </button>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-[var(--border-soft)]">
              <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                Availability
              </h4>
              <FilterCheckbox
                label="In stock now"
                count={inStockCount}
                checked={inStockOnly}
                onChange={setInStockOnly}
              />
            </div>

            <div className="pt-6 border-t border-[var(--border-soft)]">
              <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                Price per rental
                {currencySymbol && (
                  <span className="normal-case font-semibold">
                    {" "}
                    ({currencySymbol})
                  </span>
                )}
              </h4>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className={inputCls}
                />
                <span className="text-[var(--text-muted)]">-</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Mobile sheet footer */}
            <div className="md:hidden sticky bottom-0 -mx-6 px-6 py-4 bg-[var(--bg-surface)] border-t border-[var(--border-soft)] flex gap-3">
              <button
                onClick={clearFilters}
                disabled={activeFilterCount === 0}
                className="flex-1 py-3 rounded-xl border border-[var(--border-soft)] text-sm font-bold text-[var(--text-main)] disabled:opacity-40"
              >
                Clear
              </button>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="flex-[2] py-3 rounded-xl bg-brand-primary text-[var(--text-on-brand)] text-sm font-bold"
              >
                Show {filteredProducts.length} result
                {filteredProducts.length === 1 ? "" : "s"}
              </button>
            </div>
          </aside>

          {/* Products */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-[var(--border-soft)] border-t-brand-primary rounded-full animate-spin"></div>
                <p className="mt-4 text-[var(--text-muted)] font-medium animate-pulse">
                  Loading products...
                </p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-16 sm:py-24 px-6 bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-soft)] shadow-sm">
                <div className="w-20 h-20 bg-[var(--bg-app)] rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <ShoppingBag className="w-10 h-10 text-[var(--text-muted)] opacity-50" />
                </div>
                <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">
                  No products found
                </h2>
                <p className="text-[var(--text-muted)] max-w-md mx-auto">
                  {activeFilterCount > 0 || searchTerm
                    ? "Nothing matches your search or filters."
                    : "This store hasn't listed any products yet."}
                </p>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="mt-6 px-5 py-2.5 rounded-xl border border-[var(--border-soft)] text-sm font-bold text-[var(--text-main)] hover:bg-[var(--bg-app)]"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {filteredProducts.map((product) => {
                  const price = priceOf(product);
                  const inStock = Number(product.quantity_available) > 0;
                  return (
                    <div
                      key={product.product_id}
                      onClick={() => setSelectedProduct(product)}
                      className="bg-[var(--bg-surface)] rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300 group cursor-pointer border border-[var(--border-soft)] flex flex-col h-full hover:-translate-y-1"
                    >
                      <div className="aspect-[4/3] bg-[var(--bg-app)] relative overflow-hidden">
                        <img
                          src={
                            product.image ||
                            `https://picsum.photos/seed/${product.product_id}/600/450`
                          }
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://placehold.co/600x450/f8fafc/94a3b8?text=Product";
                          }}
                        />
                        {!inStock && (
                          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500 text-white">
                            Out of stock
                          </span>
                        )}
                      </div>

                      <div className="p-5 sm:p-6 flex flex-col flex-1">
                        {product.category_name && (
                          <span className="text-xs font-bold text-[var(--text-link)] uppercase tracking-wider mb-2 block truncate">
                            {product.category_name}
                          </span>
                        )}
                        <h3 className="font-black text-[var(--text-main)] text-lg sm:text-xl leading-tight mb-2 break-words">
                          {product.name}
                        </h3>
                        <p className="text-sm text-[var(--text-muted)] line-clamp-2 mb-6 flex-1">
                          {product.description || "No description provided."}
                        </p>

                        <div className="flex items-end justify-between gap-3 mt-auto pt-4 border-t border-[var(--border-soft)]">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                              Starting from
                            </p>
                            <p
                              className="font-black text-xl sm:text-2xl text-[var(--text-main)] leading-none truncate"
                              style={{ fontFamily: "'Noto Sans', sans-serif" }}
                            >
                              {formatPrice(product, price)}
                            </p>
                          </div>
                          <span className="shrink-0 px-4 py-2 rounded-xl bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] font-bold text-sm group-hover:bg-brand-primary group-hover:border-transparent group-hover:text-[var(--text-on-brand)] transition-colors">
                            View units
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Floating Cart on Mobile */}
      <div
        className={`sm:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-surface)] border-t border-[var(--border-soft)] p-4 z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] transition-transform duration-300 ${
          cart.length > 0 ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <button
          onClick={handleCheckout}
          className="w-full flex items-center justify-between px-6 py-4 rounded-2xl font-bold bg-brand-primary text-[var(--text-on-brand)] active:scale-95 transition-transform"
        >
          <span className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Checkout ({totalCartItems})
          </span>
          <span
            className="text-lg"
            style={{ fontFamily: "'Noto Sans', sans-serif" }}
          >
            {formatPrice({ currency_symbol: currencySymbol }, totalAmount)}
          </span>
        </button>
      </div>

      {/* Success Toast */}
      <div
        className={`fixed bottom-24 sm:bottom-6 right-1/2 translate-x-1/2 sm:translate-x-0 sm:right-6 z-50 transition-all duration-300 ${
          showToast
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <div className="bg-gray-900 text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-2xl flex items-center gap-3">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
          Added to cart!
        </div>
      </div>

      {/* Product Details & Units */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-[var(--bg-surface)] rounded-t-3xl sm:rounded-3xl w-full max-w-4xl max-h-[92vh] sm:max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl border border-[var(--border-soft)] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full md:w-1/2 h-44 sm:h-64 md:h-auto bg-[var(--bg-app)] relative shrink-0">
              <img
                src={
                  selectedProduct.image ||
                  `https://picsum.photos/seed/${selectedProduct.product_id}/800/800`
                }
                alt={selectedProduct.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://placehold.co/800x800/f8fafc/94a3b8?text=Product";
                }}
              />
              <button
                onClick={() => setSelectedProduct(null)}
                aria-label="Close"
                className="absolute top-4 right-4 md:hidden w-10 h-10 bg-[var(--bg-surface)]/80 backdrop-blur-md rounded-full flex items-center justify-center text-[var(--text-main)] border border-[var(--border-soft)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full md:w-1/2 flex flex-col flex-1 min-h-0">
              <div className="flex justify-between items-start gap-4 px-5 sm:px-8 pt-5 sm:pt-8 pb-4 sm:pb-6 border-b border-[var(--border-soft)] shrink-0">
                <div className="min-w-0">
                  {selectedProduct.category_name && (
                    <span className="text-xs font-bold text-[var(--text-link)] uppercase tracking-wider mb-2 block">
                      {selectedProduct.category_name}
                    </span>
                  )}
                  <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-main)] leading-tight break-words">
                    {selectedProduct.name}
                  </h2>
                  {selectedProduct.description && (
                    <p className="mt-3 text-sm text-[var(--text-muted)] line-clamp-3">
                      {selectedProduct.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  aria-label="Close"
                  className="hidden md:flex w-10 h-10 bg-[var(--bg-app)] hover:bg-[var(--border-subtle)] border border-[var(--border-soft)] rounded-full items-center justify-center text-[var(--text-muted)] transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-8 py-5 sm:py-6">
                <h3 className="font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-brand-primary" />
                  Available units to book
                </h3>

                {selectedProduct.units && selectedProduct.units.length > 0 ? (
                  <div className="space-y-3">
                    {selectedProduct.units.map((unit: any) => {
                      const cartItem = cart.find(
                        (c: any) =>
                          c.unit.product_unit_id === unit.product_unit_id,
                      );
                      const out = unit.quantity_available === 0;
                      return (
                        <div
                          key={unit.product_unit_id}
                          className="bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between hover:border-brand-primary/30 transition-colors"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            {unit.image && (
                              <img
                                src={unit.image}
                                alt={unit.name || selectedProduct.name}
                                className="w-16 h-16 rounded-xl object-cover bg-white shadow-sm shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-[var(--text-main)] break-words">
                                {unit.name || `${selectedProduct.name} Unit`}
                              </p>
                              {unit.serial_number && (
                                <p className="text-xs font-mono text-[var(--text-muted)] mt-1">
                                  SN: {unit.serial_number}
                                </p>
                              )}
                              <p
                                className="font-black text-[var(--text-link)] mt-2"
                                style={{
                                  fontFamily: "'Noto Sans', sans-serif",
                                }}
                              >
                                {formatPrice(
                                  selectedProduct,
                                  unit.rental_price,
                                )}
                                <span className="text-xs text-[var(--text-muted)] font-medium">
                                  {Number(unit.rental_price) > 0 && unit.unit
                                    ? ` / ${unit.unit.replace("per_", "")}`
                                    : ""}
                                </span>
                              </p>
                              {unit.quantity_available !== undefined && (
                                <p
                                  className={`text-xs font-bold mt-1 ${
                                    out ? "text-rose-500" : "text-emerald-500"
                                  }`}
                                >
                                  {out
                                    ? "Out of stock"
                                    : `${unit.quantity_available} available`}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {cartItem && (
                              <span className="text-xs font-bold text-[var(--text-main)] bg-[var(--bg-surface)] border border-[var(--border-soft)] px-3 py-1.5 rounded-full whitespace-nowrap">
                                {cartItem.quantity} added
                              </span>
                            )}
                            <button
                              onClick={() =>
                                !out &&
                                !notAccepting &&
                                addToCart(selectedProduct, unit)
                              }
                              disabled={out || Boolean(notAccepting)}
                              className="w-full sm:w-auto px-5 py-2.5 font-bold text-sm rounded-xl transition-all active:scale-95 bg-brand-primary text-[var(--text-on-brand)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center py-10 text-[var(--text-muted)]">
                    No units available for this product.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
