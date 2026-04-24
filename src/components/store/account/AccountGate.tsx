"use client";

import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import AuthForms from "./AuthForms";
import AccountDashboard from "./AccountDashboard";

export default function AccountGate() {
  const { customer, loading } = useCustomerAuth();

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center text-warm-500 text-sm">
        Caricamento…
      </div>
    );
  }

  if (!customer) {
    return <AuthForms />;
  }

  return <AccountDashboard customer={customer} />;
}
