import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ClientMain from "@/components/layout/ClientMain";
import RecaptchaProvider from "@/components/providers/RecaptchaProvider";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RecaptchaProvider>
      <div className="bg-white min-h-screen relative mx-auto" style={{ width: '1670px', maxWidth: '100%' }}>
        <Header />
        <ClientMain>{children}</ClientMain>
        <Footer />
      </div>
    </RecaptchaProvider>
  );
}
