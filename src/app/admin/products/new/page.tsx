"use client";

import ProductForm from "@/components/admin/ProductForm";

export default function NewProductPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-warm-800 mb-8">Nuovo Prodotto</h1>
      <ProductForm />
    </div>
  );
}
