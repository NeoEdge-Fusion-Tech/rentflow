import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Search, ShoppingBag, X, Check, Building2, Filter } from "lucide-react";
import axios from "axios";

export function PublicRentals() {
  const { org_id, identifier } = useParams();
  const storeIdentifier = identifier || org_id;
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Sidebar Filter States
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [cart, setCart] = useState<
    { product: any; unit: any; quantity: number }[]
  >([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    fetchProductsAndSettings();
  }, [storeIdentifier]);

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

  const allCategories = Array.from(
    new Set(products.map((p) => p.category_name).filter(Boolean)),
  );

  const filteredProducts = products.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(term) ||
      (p.category_name && p.category_name.toLowerCase().includes(term)) ||
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

    // Show toast feedback
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleCheckout = () => {
    navigate(`/public/store/${storeIdentifier}/checkout`, { state: { cart } });
  };

  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalAmount = cart.reduce((acc, item) => {
    const price = item.unit?.rental_price || 0;
    return acc + price * item.quantity;
  }, 0);

  const orgName =
    settings?.storefront_name ||
    settings?.organization_name ||
    (products.length > 0 ? products[0].organization_name : "Rentals");
  const orgLogo =
    settings?.organization_logo ||
    (products.length > 0 ? products[0].organization_logo : null);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans relative">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {orgLogo ? (
              <img
                src={orgLogo}
                alt={orgName}
                className="w-10 h-10 rounded-xl object-cover shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
                <Building2 className="w-6 h-6 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none truncate max-w-[150px] sm:max-w-xs">
                {orgName}
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                Official Rental Store
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4 flex-1 max-w-xl mx-8">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products or categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-100 border-transparent rounded-2xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all shadow-inner"
              />
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className={`hidden sm:flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all shadow-sm ${
              cart.length > 0
                ? "bg-brand-primary text-white hover:bg-brand-accent hover:shadow-md hover:-translate-y-0.5"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            Checkout ({totalCartItems})
          </button>
        </div>
      </header>

      {/* Mobile Search & Filter Toggle */}
      <div className="md:hidden bg-white p-4 border-b border-gray-100 sticky top-20 z-10 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-100 border-transparent rounded-2xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all shadow-inner"
          />
        </div>
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-600 active:scale-95 transition-transform"
        >
          <Filter className="w-5 h-5" />
        </button>
      </div>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full pb-32 sm:pb-10 flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside
          className={`${
            showMobileFilters ? "block" : "hidden"
          } md:block w-full md:w-64 shrink-0 space-y-8 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-fit md:sticky md:top-28`}
        >
          <div>
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
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
                    <div className="w-5 h-5 border-2 border-gray-200 rounded md:rounded-xl peer-checked:bg-brand-primary peer-checked:border-brand-primary transition-all flex items-center justify-center">
                      <Check className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
                    {cat as string}
                  </span>
                </label>
              ))}
              {allCategories.length === 0 && (
                <p className="text-xs text-gray-400">No categories found.</p>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4">Price Range</h3>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none"
              />
              <span className="text-gray-400">-</span>
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none"
              />
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-brand-primary rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-500 font-medium animate-pulse">
                Loading amazing products...
              </p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-3xl border border-gray-100 shadow-sm">
              <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <ShoppingBag className="w-10 h-10 text-gray-300" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                No products found
              </h2>
              <p className="text-gray-500 max-w-md mx-auto">
                We couldn't find any rental products matching your search.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => {
                const price = product.units?.[0]?.rental_price || 0;

                return (
                  <div
                    key={product.product_id}
                    onClick={() => setSelectedProduct(product)}
                    className="bg-white rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300 group cursor-pointer border border-gray-100 flex flex-col h-full transform hover:-translate-y-1 relative"
                  >
                    <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden flex items-center justify-center">
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
                    </div>

                    <div className="p-6 flex flex-col flex-1">
                      {product.category_name && (
                        <span className="text-xs font-bold text-brand-primary uppercase tracking-wider mb-2 block">
                          {product.category_name}
                        </span>
                      )}
                      <h3 className="font-black text-gray-900 text-xl leading-tight mb-2 group-hover:text-brand-primary transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-500 line-clamp-2 mb-6 flex-1">
                        {product.description || "No description provided."}
                      </p>

                      <div className="flex items-end justify-between mt-auto pt-4 border-t border-gray-50">
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                            Starting From
                          </p>
                          <p className="font-black text-2xl text-gray-900 leading-none">
                            ${Number(price).toFixed(2)}
                            <span className="text-sm text-gray-400 font-medium">
                              /day
                            </span>
                          </p>
                        </div>
                        <button className="px-4 py-2 rounded-xl bg-gray-100 text-brand-primary font-bold text-sm group-hover:bg-brand-primary group-hover:text-white transition-colors">
                          View Units
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Floating Cart on Mobile */}
      <div
        className={`sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 pb-safe z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] transition-transform duration-300 ${
          cart.length > 0 ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <button
          onClick={handleCheckout}
          className="w-full flex items-center justify-between px-6 py-4 rounded-2xl font-bold bg-brand-primary text-white shadow-lg shadow-brand-primary/25 active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            <span>Checkout ({totalCartItems})</span>
          </div>
          <span className="text-lg">${Number(totalAmount).toFixed(2)}</span>
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

      {/* Product Details & Units Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image Side */}
            <div className="w-full md:w-1/2 h-48 md:h-auto bg-gray-100 relative shrink-0">
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
            </div>

            {/* Content Side */}
            <div className="w-full md:w-1/2 flex flex-col h-full bg-white max-h-[60vh] md:max-h-none overflow-y-auto relative">
              <div className="p-6 md:p-8 sticky top-0 bg-white z-10 border-b border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    {selectedProduct.category_name && (
                      <span className="text-xs font-bold text-brand-primary uppercase tracking-wider mb-2 block">
                        {selectedProduct.category_name}
                      </span>
                    )}
                    <h2 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">
                      {selectedProduct.name}
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 transition-colors shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {selectedProduct.description && (
                  <p className="mt-4 text-sm text-gray-600 line-clamp-2">
                    {selectedProduct.description}
                  </p>
                )}
              </div>

              <div className="p-6 md:p-8 flex-1">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-brand-primary" />
                  Available Units to Book
                </h3>

                {selectedProduct.units && selectedProduct.units.length > 0 ? (
                  <div className="space-y-4">
                    {selectedProduct.units.map((unit: any) => {
                      const cartItem = cart.find(
                        (c: any) =>
                          c.unit.product_unit_id === unit.product_unit_id,
                      );
                      return (
                        <div
                          key={unit.product_unit_id}
                          className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between hover:border-brand-primary/30 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            {unit.image && (
                              <img
                                src={unit.image}
                                alt={unit.name || selectedProduct.name}
                                className="w-16 h-16 rounded-xl object-cover bg-white shadow-sm"
                              />
                            )}
                            <div>
                              <p className="font-bold text-gray-900">
                                {unit.name || `${selectedProduct.name} Unit`}
                              </p>
                              {unit.serial_number && (
                                <p className="text-xs font-mono text-gray-500 mt-1 flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-green-500"></span>{" "}
                                  SN: {unit.serial_number}
                                </p>
                              )}
                              <p className="font-black text-brand-primary mt-2">
                                ${Number(unit.rental_price).toFixed(2)}
                                <span className="text-xs text-gray-500 font-medium">
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
                                  ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
                                  : "bg-gray-900 hover:bg-black text-white hover:shadow-lg"
                              }`}
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-gray-500">
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
