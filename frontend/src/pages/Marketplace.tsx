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
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ThemeToggle } from "../components/ThemeToggle";
import { Logo } from "../components/Logo";
import { useTheme } from "../context/ThemeContext";
import axios from "axios";

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

const priceOf = (p: any): number | null =>
  p.min_rental_price != null ? Number(p.min_rental_price) : null;

const formatPrice = (p: any, amount: number | string | null | undefined) => {
  if (amount == null || Number(amount) === 0) return "Price on request";
  const symbol = p.currency_symbol || "";
  return `${symbol}${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

function FilterCheckbox({
  checked,
  disabled,
  onChange,
  label,
  count,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  count?: number;
}) {
  return (
    <label
      className={`flex items-center gap-3 group ${
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        className={`w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-colors ${
          checked
            ? "bg-brand-primary border-brand-primary"
            : "border-[var(--border-soft)] group-hover:border-brand-primary/60"
        }`}
      >
        {checked && <Check className="w-3 h-3 text-white" />}
      </span>
      <span
        className={`flex-1 text-sm font-medium transition-colors ${
          checked
            ? "text-[var(--text-main)]"
            : "text-[var(--text-muted)] group-hover:text-[var(--text-main)]"
        }`}
      >
        {label}
      </span>
      {count !== undefined && (
        <span className="text-xs text-[var(--text-muted)] tabular-nums">
          {count}
        </span>
      )}
    </label>
  );
}

const toggleIn = (list: string[], value: string, on: boolean) =>
  on ? [...list, value] : list.filter((v) => v !== value);

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate("/")}
            title="Return to Home"
          >
            <Logo className="h-10" showText={false} dark={theme === "dark"} />
            <div>
              <h1 className="text-xl font-black text-[var(--text-main)] tracking-tight leading-none group-hover:text-brand-primary transition-colors flex items-center gap-1.5">
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
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="w-12 h-12 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-2xl flex items-center justify-center text-[var(--text-muted)] active:scale-95 transition-transform"
        >
          <Filter className="w-5 h-5" />
        </button>
      </div>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside
          className={`${
            showMobileFilters ? "block" : "hidden"
          } md:block w-full md:w-64 shrink-0 space-y-8 bg-[var(--bg-surface)] p-6 rounded-3xl border border-[var(--border-soft)] shadow-sm h-fit md:sticky md:top-28`}
        >
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border-soft)]">
            <h3 className="font-bold text-[var(--text-main)] flex items-center gap-2">
              <Filter className="w-4 h-4 text-brand-primary" />
              Filters
            </h3>
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
        </aside>

        <div className="flex-1">
          <div className="mb-8">
            <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tight">
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
            <div className="text-center py-24 bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-soft)] shadow-sm transition-colors duration-300">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
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
                      <div className="absolute top-4 left-4 bg-[var(--bg-surface)]/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2 border border-[var(--border-soft)]">
                        {product.organization_logo ? (
                          <img
                            src={product.organization_logo}
                            alt={product.organization_name}
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-5 h-5 bg-brand-primary rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                            {product.organization_name?.charAt(0)}
                          </div>
                        )}
                        <span className="text-xs font-bold text-[var(--text-main)] truncate max-w-[100px]">
                          {product.organization_name}
                        </span>
                      </div>
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
                        </div>
                        <div className="w-10 h-10 rounded-full bg-[var(--bg-app)] flex items-center justify-center group-hover:bg-brand-primary group-hover:text-white transition-colors text-[var(--text-muted)] border border-[var(--border-soft)] group-hover:border-transparent">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-[var(--bg-surface)] rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl animate-in zoom-in-95 duration-200 border border-[var(--border-soft)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image Side */}
            <div className="w-full md:w-1/2 h-64 md:h-auto bg-[var(--bg-app)] relative shrink-0">
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
                className="absolute top-4 left-4 md:hidden w-10 h-10 bg-[var(--bg-surface)]/50 backdrop-blur-md rounded-full flex items-center justify-center text-[var(--text-main)] border border-[var(--border-soft)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Side */}
            <div className="w-full md:w-1/2 flex flex-col flex-1 min-h-0">
              <div className="flex justify-between items-start gap-4 px-8 md:px-10 pt-8 md:pt-10 pb-6 border-b border-[var(--border-soft)] shrink-0">
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
                  <h2 className="text-3xl font-black text-[var(--text-main)] leading-tight">
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

              <div className="flex-1 min-h-0 overflow-y-auto px-8 md:px-10 py-6">
                <div className="prose prose-sm text-[var(--text-muted)] mb-8">
                  <p>
                    {selectedProduct.description ||
                      "No description provided for this product."}
                  </p>
                </div>

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
                      <div className="w-12 h-12 bg-brand-primary rounded-full flex items-center justify-center text-lg font-black text-white shadow-sm">
                        {selectedProduct.organization_name?.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-[var(--text-main)] text-lg">
                        {selectedProduct.organization_name}
                      </h4>
                      <div className="flex items-center gap-1 text-sm text-[var(--text-muted)] mt-1">
                        <MapPin className="w-4 h-4" />
                        Verified Vendor
                      </div>
                    </div>
                  </div>
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
                                  selectedProduct.organization_slug ||
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
                              disabled={unit.quantity_available === 0}
                              className={`w-full sm:w-auto px-5 py-2.5 font-bold text-sm rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center ${
                                unit.quantity_available === 0
                                  ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
                                  : "bg-gray-900 hover:bg-black text-white hover:shadow-lg"
                              }`}
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
