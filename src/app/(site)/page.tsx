import HeroSection from "@/components/home/HeroSection";
import FeaturedProduct from "@/components/home/FeaturedProduct";
import CategoryCarousel from "@/components/home/CategoryCarousel";
import FullWidthBanner from "@/components/home/FullWidthBanner";
import ProductSpotlight from "@/components/home/ProductSpotlight";
import BornInVienna from "@/components/home/BornInVienna";
import WoodCraftsmanship from "@/components/home/WoodCraftsmanship";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturedProduct />
      <CategoryCarousel />
      <FullWidthBanner />
      <ProductSpotlight />
      <BornInVienna />
      <WoodCraftsmanship />
    </>
  );
}
