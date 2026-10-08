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
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ThemeToggle } from "../components/ThemeToggle";
import { Logo } from "../components/Logo";
import { useTheme } from "../context/ThemeContext";
import axios from "axios";

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
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const baseUrl =
        import.meta.env.VITE_API_URL || "http://localhost:8000/api";
      const res = await axios.get(`${baseUrl}/public/marketplace/products/`);
      setProducts(res.data.results || res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const allCategories = Array.from(
    new Set(products.map((p) => p.category_name).filter(Boolean)),
  );

  const filteredProducts = products.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(term) ||
      (p.category_name && p.category_name.toLowerCase().includes(term)) ||
      (p.organization_name &&
        p.organization_name.toLowerCase().includes(term)) ||
      (p.description && p.description.toLowerCase().includes(term)) ||
      (p.units &&
        p.units.some(
          (u: any) =>
            (u.unit_name && u.unit_name.toLowerCase().includes(term)) ||
            (u.serial_number &&
              String(u.serial_number).toLowerCase().includes(term)) ||
            (u.rental_price && String(u.rental_price).includes(term)),
        ));

    const matchesCategory =
      selectedCategories.length === 0 ||
      selectedCategories.includes(p.category_name);

    // Find min price among units
    const productMinPrice =
      p.units && p.units.length > 0
        ? Math.min(...p.units.map((u: any) => Number(u.rental_price)))
        : 0;

    const matchesMinPrice =
      minPrice === "" || productMinPrice >= Number(minPrice);
    const matchesMaxPrice =
      maxPrice === "" || productMinPrice <= Number(maxPrice);

    return (
      matchesSearch && matchesCategory && matchesMinPrice && matchesMaxPrice
    );
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
          <div>
            <h3 className="font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4 text-brand-primary" />
              Categories
            </h3>
            <div className="space-y-3">
              {allCategories.map((cat) => (
                <label
                  key={cat as string}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={selectedCategories.includes(cat as string)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCategories([
                            ...selectedCategories,
                            cat as string,
                          ]);
                        } else {
                          setSelectedCategories(
                            selectedCategories.filter((c) => c !== cat),
                          );
                        }
                      }}
                    />
                    <div className="w-5 h-5 border-2 border-[var(--border-soft)] rounded md:rounded-xl peer-checked:bg-brand-primary peer-checked:border-brand-primary transition-all flex items-center justify-center">
                      <Check className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors">
                    {cat as string}
                  </span>
                </label>
              ))}
              {allCategories.length === 0 && (
                <p className="text-xs text-[var(--text-muted)]">
                  No categories found.
                </p>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-[var(--border-soft)]">
            <h3 className="font-bold text-[var(--text-main)] mb-4">
              Price Range
            </h3>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl p-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
              />
              <span className="text-[var(--text-muted)]">-</span>
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl p-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
              />
            </div>
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
                const price = Number(product.units?.[0]?.rental_price || 0);
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
                      {product.category_name && (
                        <span className="text-xs font-bold text-brand-primary uppercase tracking-wider mb-2 block">
                          {product.category_name}
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
                          <p className="font-black text-2xl text-[var(--text-main)] leading-none">
                            ${Number(price).toFixed(2)}
                            <span className="text-sm text-[var(--text-muted)] font-medium">
                              /day
                            </span>
                          </p>
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
            <div className="w-full md:w-1/2 h-64 md:h-auto bg-[var(--bg-app)] relative">
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
            <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <div>
                  {selectedProduct.category_name && (
                    <span className="text-xs font-bold text-brand-primary uppercase tracking-wider mb-2 block">
                      {selectedProduct.category_name}
                    </span>
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
                            <p className="font-black text-brand-primary mt-2">
                              ${Number(unit.rental_price).toFixed(2)}
                              <span className="text-xs text-[var(--text-muted)] font-medium">
                                /day
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
