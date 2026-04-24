import OrderDetail from "@/components/store/account/OrderDetail";

export const dynamic = "force-dynamic";

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  return <OrderDetail orderId={params.id} />;
}
