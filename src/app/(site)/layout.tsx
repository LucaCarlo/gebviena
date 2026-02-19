import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-[85vw] mx-auto bg-white min-h-screen relative">
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
