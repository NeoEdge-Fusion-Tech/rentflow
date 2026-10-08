import re

with open("frontend/src/pages/Inventory.tsx", "r") as f:
    content = f.read()

# 1. Update initial unit state to include image_file
init_old = """            {
              name: "",
              serial_number: "",
              status: "available",
              unit_type: "single",
              quantity: 1,
              unit_cost_price: "0.00",
              cost_price: "0.00",
              rental_price: "0.00",
              unit: "per_day",
              description: "",
            },"""
init_new = """            {
              name: "",
              serial_number: "",
              status: "available",
              unit_type: "single",
              quantity: 1,
              unit_cost_price: "0.00",
              cost_price: "0.00",
              rental_price: "0.00",
              unit: "per_day",
              description: "",
              image_file: null,
            },"""
content = content.replace(init_old, init_new)


# 2. Add image upload in the unit form, after Unit Name (around line 1599)
form_old = """                      <div>
                        <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                          Unit Name (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Unit A"
                          value={unit.name}
                          onChange={(e) => {
                            const newUnits = [...units];
                            newUnits[i].name = e.target.value;
                            setUnits(newUnits);
                          }}
                          className="w-full border border-[var(--border-soft)] rounded-xl p-2 outline-none focus:border-brand-primary text-sm bg-[var(--bg-surface)] text-[var(--text-main)]"
                        />
                      </div>"""

form_new = """                      <div>
                        <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                          Unit Name (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Unit A"
                          value={unit.name}
                          onChange={(e) => {
                            const newUnits = [...units];
                            newUnits[i].name = e.target.value;
                            setUnits(newUnits);
                          }}
                          className="w-full border border-[var(--border-soft)] rounded-xl p-2 outline-none focus:border-brand-primary text-sm bg-[var(--bg-surface)] text-[var(--text-main)]"
                        />
                      </div>

                      <div className="col-span-1">
                        <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                          Unit Image
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const newUnits = [...units];
                              newUnits[i].image_file = file;
                              setUnits(newUnits);
                            }
                          }}
                          className="w-full text-sm text-[var(--text-muted)] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-brand-primary/10 file:text-brand-primary hover:file:bg-brand-primary/20"
                        />
                      </div>"""
content = content.replace(form_old, form_new)

# 3. Add Image upload in saveProduct (around line 265)
save_old = """      if (finalProductId && (newProduct as any).image_file) {
        const formData = new FormData();
        formData.append("image", (newProduct as any).image_file);
        await ProductService.uploadImage(finalProductId, formData);
      }

      setShowAddModal(false);"""

save_new = """      if (finalProductId && (newProduct as any).image_file) {
        const formData = new FormData();
        formData.append("image", (newProduct as any).image_file);
        await ProductService.uploadImage(finalProductId, formData);
      }

      // Upload unit images
      if (savedProductData && savedProductData.units) {
        for (let i = 0; i < units.length; i++) {
          const u: any = units[i];
          if (u.image_file) {
            // Find corresponding saved unit
            // If editing, use product_unit_id, if creating, match by serial_number or index
            const savedUnit = u.product_unit_id
              ? savedProductData.units.find((su: any) => su.product_unit_id === u.product_unit_id)
              : savedProductData.units.find((su: any) => su.serial_number === u.serial_number);

            const unitId = savedUnit ? savedUnit.product_unit_id : (savedProductData.units[i] ? savedProductData.units[i].product_unit_id : null);

            if (unitId) {
              const formData = new FormData();
              formData.append("image", u.image_file);
              try {
                // Use imported api instead of creating new axios instance
                await (await import('../api')).api.post(`/inventory/product-units/${unitId}/upload_image/`, formData, {
                  headers: { "Content-Type": "multipart/form-data" }
                });
              } catch (err) {
                console.error("Failed to upload unit image", err);
              }
            }
          }
        }
      }

      setShowAddModal(false);"""
content = content.replace(save_old, save_new)

with open("frontend/src/pages/Inventory.tsx", "w") as f:
    f.write(content)
