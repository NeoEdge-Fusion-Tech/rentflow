import React, { useState, useEffect } from "react";
import {
  Search,
  MapPin,
  Building2,
  ExternalLink,
  X,
  Filter,
  Check,
  ShoppingBag,
  ChevronDown,
  Clock,
  AlertTriangle,
  Store,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { OpeningHours, OpenStatusBadge } from "../components/OpeningHours";
import { ThemeToggle } from "../components/ThemeToggle";
import { Logo } from "../components/Logo";
import { useTheme } from "../context/ThemeContext";
import axios from "axios";
import {
  FilterCheckbox,
  formatPrice,
  priceOf,
  toggleIn,
} from "../components/StoreFilters";

// Filter key for products that have no marketplace tag yet.
const UNTAGGED = "__untagged";

const tagLabel = (product: any) => {
  const tags = (product.marketplace_tags || []) as { name: string }[];
  if (tags.length === 0) return "";
  return tags.length > 2
    ? `${tags
        .slice(0, 2)
        .map((t) => t.name)
        .join(" · ")} +${tags.length - 2}`
    : tags.map((t) => t.name).join(" · ");
};

export function Marketplace() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const { theme } = useTheme();

  // Sidebar Filter States
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<
    { id: number; name: string; slug: string }[]
  >([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([]);
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  // Keep the page behind the mobile filter sheet / product sheet still.
  useEffect(() => {
    const locked = showMobileFilters || selectedProduct !== null;
    const prev = document.body.style.overflow;
    if (locked) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showMobileFilters, selectedProduct]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const baseUrl =
        import.meta.env.VITE_API_URL || "http://localhost:8000/api";
      const [res, tagRes] = await Promise.all([
        axios.get(`${baseUrl}/public/marketplace/products/`),
        axios
          .get(`${baseUrl}/public/marketplace/tags/`)
          .catch(() => ({ data: [] })),
      ]);
      setProducts(res.data.results || res.data);
      setTags(tagRes.data.results || tagRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Vendor storefront URL: custom slug when set, otherwise the org id.
  const storePath = (p: any) =>
    `/public/store/${p.vendor_availability?.store || p.organization_id}`;

  const productTagSlugs = (p: any): string[] =>
    (p.marketplace_tags || []).map((t: any) => t.slug);

  const countBy = (values: (string | null | undefined)[]) =>
    values.reduce<Record<string, number>>((acc, v) => {
      if (v) acc[v] = (acc[v] || 0) + 1;
      return acc;
    }, {});

  // Every active tag (in super-admin order) is listed so customers can see
  // the full range; tags with no products yet are shown but disabled.
  const tagCounts = products.reduce<Record<string, number>>((acc, p) => {
    const slugs = productTagSlugs(p);
    if (slugs.length === 0) acc[UNTAGGED] = (acc[UNTAGGED] || 0) + 1;
    slugs.forEach((s) => (acc[s] = (acc[s] || 0) + 1));
    return acc;
  }, {});
  // Busiest tags first (super-admin order breaks ties); "Other" last.
  const filterOptions = [
    ...tags
      .map((t, order) => ({
        key: t.slug,
        label: t.name,
        count: tagCounts[t.slug] || 0,
        order,
      }))
      .sort((a, b) => b.count - a.count || a.order - b.order),
    ...(tagCounts[UNTAGGED]
      ? [
          {
            key: UNTAGGED,
            label: "Other",
            count: tagCounts[UNTAGGED],
            order: 0,
          },
        ]
      : []),
  ];
  const TAGS_COLLAPSED = 5;
  // Collapsed: the top 5, plus any selected tag so a choice never hides.
  const visibleTagOptions = showAllTags
    ? filterOptions
    : filterOptions.filter(
        (o, i) => i < TAGS_COLLAPSED || selectedCategories.includes(o.key),
      );
  const hiddenTagCount = filterOptions.length - visibleTagOptions.length;

  const currencyCounts = countBy(products.map((p) => p.currency_code));
  const currencySymbols: Record<string, string> = {};
  products.forEach((p) => {
    if (p.currency_code) currencySymbols[p.currency_code] = p.currency_symbol;
  });
  const countryCounts = countBy(products.map((p) => p.organization_country));
  const cityCounts = countBy(
    products
      .filter((p) => !country || p.organization_country === country)
      .map((p) => p.organization_city),
  );

  // Prices are only comparable within one currency.
  const allCurrencies = Object.keys(currencyCounts);
  const priceCurrency =
    selectedCurrencies.length === 1
      ? selectedCurrencies[0]
      : allCurrencies.length === 1
        ? allCurrencies[0]
        : null;
  const priceEnabled = priceCurrency !== null;

  const activeFilterCount =
    selectedCategories.length +
    selectedCurrencies.length +
    (inStockOnly ? 1 : 0) +
    (country ? 1 : 0) +
    (city ? 1 : 0) +
    (priceEnabled && (minPrice || maxPrice) ? 1 : 0);

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedCurrencies([]);
    setInStockOnly(false);
    setCountry("");
    setCity("");
    setMinPrice("");
    setMaxPrice("");
  };

  const filteredProducts = products.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      p.name.toLowerCase().includes(term) ||
      (p.category_name && p.category_name.toLowerCase().includes(term)) ||
      (p.marketplace_tags || []).some((t: any) =>
        t.name.toLowerCase().includes(term),
      ) ||
      (p.organization_name &&
        p.organization_name.toLowerCase().includes(term)) ||
      (p.organization_city &&
        p.organization_city.toLowerCase().includes(term)) ||
      (p.description && p.description.toLowerCase().includes(term)) ||
      (p.units &&
        p.units.some(
          (u: any) =>
            (u.name && u.name.toLowerCase().includes(term)) ||
            (u.serial_number &&
              String(u.serial_number).toLowerCase().includes(term)),
        ));
    if (!matchesSearch) return false;

    const slugs = productTagSlugs(p);
    if (
      selectedCategories.length > 0 &&
      !selectedCategories.some((key) =>
        key === UNTAGGED ? slugs.length === 0 : slugs.includes(key),
      )
    )
      return false;

    if (inStockOnly && !(Number(p.quantity_available) > 0)) return false;
    if (
      selectedCurrencies.length > 0 &&
      !selectedCurrencies.includes(p.currency_code)
    )
      return false;
    if (country && p.organization_country !== country) return false;
    if (city && p.organization_city !== city) return false;

    if (priceEnabled && (minPrice !== "" || maxPrice !== "")) {
      const price = priceOf(p);
      if (price == null || p.currency_code !== priceCurrency) return false;
      if (minPrice !== "" && price < Number(minPrice)) return false;
      if (maxPrice !== "" && price > Number(maxPrice)) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex flex-col font-sans transition-colors duration-300">
      {/* Header */}
      <header className="bg-[var(--bg-surface)] shadow-sm border-b border-[var(--border-soft)] sticky top-0 z-20 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3">
          <div
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group min-w-0"
            onClick={() => navigate("/")}
            title="Return to Home"
          >
            <Logo
              className="h-8 sm:h-10 shrink-0"
              showText={false}
              dark={theme === "dark"}
            />
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-black text-[var(--text-main)] tracking-tight leading-none group-hover:text-brand-primary transition-colors flex items-center gap-1.5">
                NeoOps{" "}
                <span className="text-[var(--text-muted)] font-bold">
                  Marketplace
                </span>
              </h1>
              <p className="text-xs text-[var(--text-muted)] font-medium hidden sm:block">
                Discover rental products from top vendors
              </p>
              <p className="text-xs font-bold text-brand-primary sm:hidden mt-0.5">
                &larr; Back to Home
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4 flex-1 max-w-xl mx-8">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search products, vendors, or categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-2xl text-sm font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all shadow-inner"
              />
            </div>
          </div>

          {/* Compact actions below lg: theme + sign in */}
          <div className="flex lg:hidden items-center gap-1.5 shrink-0">
            <ThemeToggle className="bg-transparent border-0 shadow-none p-2 rounded-full hover:bg-[var(--border-subtle)]" />
            <button
              onClick={() => navigate("/login")}
              className="px-3 py-2 text-sm font-bold bg-brand-primary text-white rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              Sign In
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <ThemeToggle className="bg-transparent border-0 shadow-none p-2 rounded-full hover:bg-[var(--border-subtle)]" />
            <button
              onClick={() => navigate("/pricing")}
              className="px-4 py-2 text-sm font-bold bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] hover:border-brand-primary/50 hover:text-brand-primary rounded-xl transition-all shadow-sm"
            >
              Pricing
            </button>
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 text-sm font-bold bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] hover:bg-[var(--border-subtle)] rounded-xl transition-all shadow-sm"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate("/register")}
              className="px-4 py-2 text-sm font-bold bg-brand-primary text-white rounded-xl hover:bg-brand-accent transition-colors shadow-sm shadow-brand-primary/20"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Search & Filter Toggle */}
      <div className="md:hidden bg-[var(--bg-surface)] p-4 border-b border-[var(--border-soft)] transition-colors duration-300 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search products, vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-2xl text-sm font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all shadow-inner"
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
            <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-brand-primary text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 w-full flex flex-col md:flex-row gap-6 lg:gap-8">
        {/* Mobile: filters open as a bottom sheet over a backdrop */}
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
            <button
              onClick={() => setShowMobileFilters(false)}
              aria-label="Close filters"
              className="md:hidden order-last ml-2 p-1.5 rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-app)]"
            >
              <X className="w-5 h-5" />
            </button>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs font-bold text-brand-primary hover:underline"
              >
                Clear all ({activeFilterCount})
              </button>
            )}
          </div>

          <div>
            <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">
              Categories
            </h4>
            <div className="space-y-3">
              {visibleTagOptions.map(({ key, label, count }) => (
                <React.Fragment key={key}>
                  <FilterCheckbox
                    label={label}
                    count={count}
                    disabled={count === 0 && !selectedCategories.includes(key)}
                    checked={selectedCategories.includes(key)}
                    onChange={(on) =>
                      setSelectedCategories(
                        toggleIn(selectedCategories, key, on),
                      )
                    }
                  />
                </React.Fragment>
              ))}
              {filterOptions.length === 0 && (
                <p className="text-xs text-[var(--text-muted)]">
                  No categories yet.
                </p>
              )}
              {filterOptions.length > TAGS_COLLAPSED && (
                <button
                  type="button"
                  onClick={() => setShowAllTags((v) => !v)}
                  className="flex items-center gap-1 text-xs font-bold text-brand-primary hover:underline pt-1"
                >
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      showAllTags ? "rotate-180" : ""
                    }`}
                  />
                  {showAllTags
                    ? "Show less"
                    : `Show all categories${
                        hiddenTagCount > 0 ? ` (${hiddenTagCount} more)` : ""
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
              count={
                products.filter((p) => Number(p.quantity_available) > 0).length
              }
              checked={inStockOnly}
              onChange={setInStockOnly}
            />
          </div>

          <div className="pt-6 border-t border-[var(--border-soft)]">
            <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">
              Location
            </h4>
            {Object.keys(countryCounts).length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">
                Vendors haven't added their location yet.
              </p>
            ) : (
              <div className="space-y-2">
                <select
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    setCity("");
                  }}
                  aria-label="Country"
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl p-2.5 text-sm focus:border-brand-primary outline-none text-[var(--text-main)]"
                >
                  <option value="">All countries</option>
                  {Object.entries(countryCounts)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([c, n]) => (
                      <option key={c} value={c}>
                        {c} ({n})
                      </option>
                    ))}
                </select>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  aria-label="City"
                  disabled={Object.keys(cityCounts).length === 0}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl p-2.5 text-sm focus:border-brand-primary outline-none text-[var(--text-main)] disabled:opacity-50"
                >
                  <option value="">All cities</option>
                  {Object.entries(cityCounts)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([c, n]) => (
                      <option key={c} value={c}>
                        {c} ({n})
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {allCurrencies.length > 1 && (
            <div className="pt-6 border-t border-[var(--border-soft)]">
              <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                Currency
              </h4>
              <div className="space-y-3">
                {allCurrencies.sort().map((code) => (
                  <React.Fragment key={code}>
                    <FilterCheckbox
                      label={`${currencySymbols[code] || ""} ${code}`.trim()}
                      count={currencyCounts[code]}
                      checked={selectedCurrencies.includes(code)}
                      onChange={(on) =>
                        setSelectedCurrencies(
                          toggleIn(selectedCurrencies, code, on),
                        )
                      }
                    />
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-[var(--border-soft)]">
            <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">
              Price per rental
              {priceCurrency && (
                <span className="normal-case font-semibold">
                  {" "}
                  ({currencySymbols[priceCurrency] || priceCurrency})
                </span>
              )}
            </h4>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                placeholder="Min"
                value={minPrice}
                disabled={!priceEnabled}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl p-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none text-[var(--text-main)] placeholder:text-[var(--text-muted)] disabled:opacity-50"
              />
              <span className="text-[var(--text-muted)]">-</span>
              <input
                type="number"
                min="0"
                placeholder="Max"
                value={maxPrice}
                disabled={!priceEnabled}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl p-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none text-[var(--text-main)] placeholder:text-[var(--text-muted)] disabled:opacity-50"
              />
            </div>
            {!priceEnabled && (
              <p className="text-xs text-[var(--text-muted)] mt-2">
                Pick one currency above to filter by price.
              </p>
            )}
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
              className="flex-[2] py-3 rounded-xl bg-brand-primary text-white text-sm font-bold"
            >
              Show {filteredProducts.length} result
              {filteredProducts.length === 1 ? "" : "s"}
            </button>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-main)] tracking-tight">
              Explore Rentals
            </h2>
            <p className="text-[var(--text-muted)] mt-2 font-medium">
              Find everything you need for your next event.
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-[var(--border-soft)] border-t-brand-primary rounded-full animate-spin"></div>
              <p className="mt-4 text-[var(--text-muted)] font-medium animate-pulse">
                Loading amazing products...
              </p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16 sm:py-24 px-6 bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-soft)] shadow-sm transition-colors duration-300">
              <div className="w-20 h-20 bg-[var(--bg-app)] rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-[var(--text-muted)] opacity-50" />
              </div>
              <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">
                No products found
              </h2>
              <p className="text-[var(--text-muted)] max-w-md mx-auto">
                We couldn't find any products matching your search. Try
                adjusting your keywords.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {filteredProducts.map((product) => {
                const price = priceOf(product);
                const location = [
                  product.organization_city,
                  product.organization_country,
                ]
                  .filter(Boolean)
                  .join(", ");
                return (
                  <div
                    key={product.product_id}
                    onClick={() => setSelectedProduct(product)}
                    className="bg-[var(--bg-surface)] rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300 group cursor-pointer border border-[var(--border-soft)] flex flex-col h-full transform hover:-translate-y-1"
                  >
                    <div className="aspect-[4/3] bg-[var(--bg-app)] relative overflow-hidden flex items-center justify-center">
                      <img
                        src={`https://picsum.photos/seed/${product.product_id}/600/450`}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://placehold.co/600x450/1e293b/475569?text=Product";
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(storePath(product));
                        }}
                        title={`Visit ${product.organization_name}'s store`}
                        className="absolute top-4 left-4 bg-[var(--bg-surface)]/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2 border border-[var(--border-soft)] hover:border-brand-primary/50 transition-colors"
                      >
                        {product.organization_logo ? (
                          <img
                            src={product.organization_logo}
                            alt={product.organization_name}
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-5 h-5 bg-brand-primary rounded-full flex items-center justify-center text-[10px] font-bold text-[var(--text-on-brand)]">
                            {product.organization_name?.charAt(0)}
                          </div>
                        )}
                        <span className="text-xs font-bold text-[var(--text-main)] truncate max-w-[120px]">
                          {product.organization_name}
                        </span>
                        <Store className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                      </button>
                    </div>

                    <div className="p-6 flex flex-col flex-1">
                      {tagLabel(product) && (
                        <span className="text-xs font-bold text-brand-primary uppercase tracking-wider mb-2 block truncate">
                          {tagLabel(product)}
                        </span>
                      )}
                      <h3 className="font-black text-[var(--text-main)] text-xl leading-tight mb-2 group-hover:text-brand-primary transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-sm text-[var(--text-muted)] line-clamp-2 mb-6 flex-1">
                        {product.description || "No description provided."}
                      </p>

                      <div className="flex items-end justify-between mt-auto pt-4 border-t border-[var(--border-soft)]">
                        <div>
                          <p className="text-xs font-bold text-[var(--text-muted)] opacity-70 uppercase tracking-wider mb-1">
                            Starting From
                          </p>
                          <p
                            className="font-black text-2xl text-[var(--text-main)] leading-none"
                            style={{ fontFamily: "'Noto Sans', sans-serif" }}
                          >
                            {formatPrice(product, price)}
                          </p>
                          {location && (
                            <p className="text-xs text-[var(--text-muted)] mt-1.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {location}
                            </p>
                          )}
                          <OpenStatusBadge
                            availability={product.vendor_availability}
                            className="mt-2"
                          />
                        </div>
                        <div className="w-10 h-10 rounded-full bg-[var(--bg-app)] flex items-center justify-center group-hover:bg-brand-primary group-hover:text-[var(--text-on-brand)] transition-colors text-[var(--text-muted)] border border-[var(--border-soft)] group-hover:border-transparent">
                          <ArrowRightIcon className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Product Details Modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-[var(--bg-surface)] rounded-t-3xl sm:rounded-3xl w-full max-w-4xl max-h-[92vh] sm:max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl animate-in zoom-in-95 duration-200 border border-[var(--border-soft)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image Side */}
            <div className="w-full md:w-1/2 h-44 sm:h-64 md:h-auto bg-[var(--bg-app)] relative shrink-0">
              <img
                src={`https://picsum.photos/seed/${selectedProduct.product_id}/800/800`}
                alt={selectedProduct.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://placehold.co/800x800/1e293b/475569?text=Product";
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

            {/* Content Side */}
            <div className="w-full md:w-1/2 flex flex-col flex-1 min-h-0">
              <div className="flex justify-between items-start gap-4 px-5 sm:px-8 md:px-10 pt-5 sm:pt-8 md:pt-10 pb-4 sm:pb-6 border-b border-[var(--border-soft)] shrink-0">
                <div>
                  {(selectedProduct.marketplace_tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {selectedProduct.marketplace_tags.map((t: any) => (
                        <span
                          key={t.id}
                          className="text-[10px] font-bold text-brand-primary uppercase tracking-wider bg-brand-primary/10 px-2 py-0.5 rounded-full"
                        >
                          {t.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-main)] leading-tight break-words">
                    {selectedProduct.name}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="hidden md:flex w-10 h-10 bg-[var(--bg-app)] hover:bg-[var(--border-subtle)] border border-[var(--border-soft)] rounded-full items-center justify-center text-[var(--text-muted)] transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-8 md:px-10 py-5 sm:py-6">
                <div className="prose prose-sm text-[var(--text-muted)] mb-6">
                  <p>
                    {selectedProduct.description ||
                      "No description provided for this product."}
                  </p>
                </div>

                {selectedProduct.vendor_availability?.accepting_requests ===
                false ? (
                  <div className="mb-6 flex items-start gap-3 p-4 rounded-2xl border bg-rose-500/10 border-rose-500/30 text-rose-600 text-sm">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p className="font-medium">
                      This vendor isn't taking new rental requests right now.
                    </p>
                  </div>
                ) : (
                  <OpeningHours
                    availability={selectedProduct.vendor_availability}
                    className="mb-6 bg-[var(--bg-app)]"
                  />
                )}

                <div className="bg-[var(--bg-app)] rounded-2xl p-6 mb-8 border border-[var(--border-soft)]">
                  <p className="text-xs font-bold text-[var(--text-muted)] opacity-70 uppercase tracking-wider mb-2">
                    Vendor Information
                  </p>
                  <div className="flex items-center gap-4">
                    {selectedProduct.organization_logo ? (
                      <img
                        src={selectedProduct.organization_logo}
                        alt={selectedProduct.organization_name}
                        className="w-12 h-12 rounded-full object-cover shadow-sm border border-[var(--border-soft)]"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-brand-primary rounded-full flex items-center justify-center text-lg font-black text-[var(--text-on-brand)] shadow-sm shrink-0">
                        {selectedProduct.organization_name?.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-[var(--text-main)] text-lg truncate">
                        {selectedProduct.organization_name}
                      </h4>
                      {(selectedProduct.organization_city ||
                        selectedProduct.organization_country) && (
                        <div className="flex items-center gap-1 text-sm text-[var(--text-muted)] mt-1">
                          <MapPin className="w-4 h-4 shrink-0" />
                          <span className="truncate">
                            {[
                              selectedProduct.organization_city,
                              selectedProduct.organization_country,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        </div>
                      )}
                      <OpenStatusBadge
                        availability={selectedProduct.vendor_availability}
                        className="mt-2"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(storePath(selectedProduct))}
                    className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-surface)] text-sm font-bold text-[var(--text-main)] hover:border-brand-primary/50 hover:text-[var(--text-link)] transition-colors"
                  >
                    <Store className="w-4 h-4" />
                    Visit store
                    <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                  </button>
                </div>

                <div className="flex-1">
                  <h3 className="font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-brand-primary" />
                    Available Units to Book
                  </h3>
                  {selectedProduct.units && selectedProduct.units.length > 0 ? (
                    <div className="space-y-4 mb-8">
                      {selectedProduct.units.map((unit: any) => (
                        <div
                          key={unit.product_unit_id}
                          className="bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between hover:border-brand-primary/30 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            {unit.image && (
                              <img
                                src={unit.image}
                                alt={unit.name || selectedProduct.name}
                                className="w-16 h-16 rounded-xl object-cover shadow-sm border border-[var(--border-soft)] bg-white"
                              />
                            )}
                            <div>
                              <p className="font-bold text-[var(--text-main)]">
                                {unit.name || `${selectedProduct.name} Unit`}
                              </p>
                              {unit.serial_number && (
                                <p className="text-xs font-mono text-[var(--text-muted)] mt-1 flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-green-500"></span>{" "}
                                  SN: {unit.serial_number}
                                </p>
                              )}
                              <p
                                className="font-black text-brand-primary mt-2"
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
                                    unit.quantity_available > 0
                                      ? "text-green-600"
                                      : "text-rose-500"
                                  }`}
                                >
                                  {unit.quantity_available > 0
                                    ? `${unit.quantity_available} available`
                                    : "Out of stock"}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 mt-4 sm:mt-0">
                            <button
                              onClick={() => {
                                if (unit.quantity_available === 0) return;
                                const storeId =
                                  selectedProduct.vendor_availability?.store ||
                                  selectedProduct.organization_id;
                                navigate(`/public/store/${storeId}/checkout`, {
                                  state: {
                                    cart: [
                                      {
                                        product: selectedProduct,
                                        unit,
                                        quantity: 1,
                                      },
                                    ],
                                  },
                                });
                              }}
                              disabled={
                                unit.quantity_available === 0 ||
                                selectedProduct.vendor_availability
                                  ?.accepting_requests === false
                              }
                              className="w-full sm:w-auto px-5 py-2.5 font-bold text-sm rounded-xl transition-all active:scale-95 flex items-center justify-center bg-brand-primary text-[var(--text-on-brand)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 mb-8 border border-[var(--border-soft)] border-dashed rounded-2xl">
                      <p className="text-[var(--text-muted)]">
                        No units available for this product.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ArrowRightIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
