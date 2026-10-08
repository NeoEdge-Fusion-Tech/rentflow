import re

with open("frontend/src/pages/Marketplace.tsx", "r") as f:
    content = f.read()

# 1. Imports and States
imports_old = (
    """import { Search, MapPin, Building2, ExternalLink, X } from "lucide-react";"""
)
imports_new = """import { Search, MapPin, Building2, ExternalLink, X, Filter, Check } from "lucide-react";"""
content = content.replace(imports_old, imports_new)

state_old = """  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const { theme } = useTheme();"""
state_new = """  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const { theme } = useTheme();

  // Sidebar Filter States
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);"""
content = content.replace(state_old, state_new)


# 2. Filter Logic
filter_old = """  const filteredProducts = products.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      (p.category_name && p.category_name.toLowerCase().includes(term)) ||
      (p.organization_name && p.organization_name.toLowerCase().includes(term)) ||
      (p.description && p.description.toLowerCase().includes(term)) ||
      (p.units && p.units.some((u: any) =>
        (u.unit_name && u.unit_name.toLowerCase().includes(term)) ||
        (u.serial_number && String(u.serial_number).toLowerCase().includes(term)) ||
        (u.rental_price && String(u.rental_price).includes(term))
      ))
    );
  });"""

filter_new = """  const allCategories = Array.from(new Set(products.map(p => p.category_name).filter(Boolean)));

  const filteredProducts = products.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (
      p.name.toLowerCase().includes(term) ||
      (p.category_name && p.category_name.toLowerCase().includes(term)) ||
      (p.organization_name && p.organization_name.toLowerCase().includes(term)) ||
      (p.description && p.description.toLowerCase().includes(term)) ||
      (p.units && p.units.some((u: any) =>
        (u.unit_name && u.unit_name.toLowerCase().includes(term)) ||
        (u.serial_number && String(u.serial_number).toLowerCase().includes(term)) ||
        (u.rental_price && String(u.rental_price).includes(term))
      ))
    );

    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(p.category_name);

    // Find min price among units
    const productMinPrice = p.units && p.units.length > 0 ? Math.min(...p.units.map((u: any) => Number(u.rental_price))) : 0;

    const matchesMinPrice = minPrice === "" || productMinPrice >= Number(minPrice);
    const matchesMaxPrice = maxPrice === "" || productMinPrice <= Number(maxPrice);

    return matchesSearch && matchesCategory && matchesMinPrice && matchesMaxPrice;
  });"""
content = content.replace(filter_old, filter_new)


# 3. Mobile Search Toggle
mobile_search_old = """      {/* Mobile Search */}
      <div className="md:hidden bg-[var(--bg-surface)] p-4 border-b border-[var(--border-soft)] transition-colors duration-300">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search products, vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-2xl text-sm font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all shadow-inner"
          />
        </div>
      </div>"""

mobile_search_new = """      {/* Mobile Search & Filter Toggle */}
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
      </div>"""
content = content.replace(mobile_search_old, mobile_search_new)

# 4. Layout
layout_old = """      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">

        <div className="mb-8">
          <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tight">Explore Rentals</h2>
          <p className="text-[var(--text-muted)] mt-2 font-medium">Find everything you need for your next event.</p>
        </div>"""

layout_new = """      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex flex-col md:flex-row gap-8">

        {/* Sidebar */}
        <aside className={`${showMobileFilters ? 'block' : 'hidden'} md:block w-full md:w-64 shrink-0 space-y-8 bg-[var(--bg-surface)] p-6 rounded-3xl border border-[var(--border-soft)] shadow-sm h-fit md:sticky md:top-28`}>
          <div>
            <h3 className="font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4 text-brand-primary" />
              Categories
            </h3>
            <div className="space-y-3">
              {allCategories.map(cat => (
                <label key={cat as string} className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={selectedCategories.includes(cat as string)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCategories([...selectedCategories, cat as string]);
                        } else {
                          setSelectedCategories(selectedCategories.filter(c => c !== cat));
                        }
                      }}
                    />
                    <div className="w-5 h-5 border-2 border-[var(--border-soft)] rounded md:rounded-xl peer-checked:bg-brand-primary peer-checked:border-brand-primary transition-all flex items-center justify-center">
                      <Check className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors">{cat as string}</span>
                </label>
              ))}
              {allCategories.length === 0 && <p className="text-xs text-[var(--text-muted)]">No categories found.</p>}
            </div>
          </div>

          <div className="pt-6 border-t border-[var(--border-soft)]">
            <h3 className="font-bold text-[var(--text-main)] mb-4">Price Range</h3>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={e => setMinPrice(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl p-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
              />
              <span className="text-[var(--text-muted)]">-</span>
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl p-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
              />
            </div>
          </div>
        </aside>

        <div className="flex-1">
          <div className="mb-8">
            <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tight">Explore Rentals</h2>
            <p className="text-[var(--text-muted)] mt-2 font-medium">Find everything you need for your next event.</p>
          </div>"""
content = content.replace(layout_old, layout_new)

# Add closing div for the new flex-1 wrapper in main
footer_old = """          </div>
        )}
      </main>"""

footer_new = """          </div>
        )}
        </div>
      </main>"""
content = content.replace(footer_old, footer_new)

with open("frontend/src/pages/Marketplace.tsx", "w") as f:
    f.write(content)
