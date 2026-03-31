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
      <div className="bg-white min-h-screen relative overflow-hidden" style={{ marginLeft: 'var(--site-margin)', marginRight: 'var(--site-margin)' }}>
        <Header />
        <ClientMain>{children}</ClientMain>
        <Footer />
      </div>
    </RecaptchaProvider>
  );
}
