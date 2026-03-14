import HeroSection from "@/components/home/HeroSection";
import FeaturedProduct from "@/components/home/FeaturedProduct";
import CategoryCarousel from "@/components/home/CategoryCarousel";
import FullWidthBanner from "@/components/home/FullWidthBanner";
import ProductSpotlight from "@/components/home/ProductSpotlight";
import BornInVienna from "@/components/home/BornInVienna";
import WoodCraftsmanship from "@/components/home/WoodCraftsmanship";
import { getPageImages } from "@/lib/page-images";

const HOMEPAGE_DEFAULTS: Record<string, string> = {
  "featured-ambiance": "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&h=2000&fit=crop&q=85",
  "featured-product": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=900&h=1200&fit=crop&q=85",
  "category-novita": "https://images.unsplash.com/photo-1503602642458-232111445657?w=600&h=700&fit=crop&q=80",
  "category-sedute": "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=600&h=700&fit=crop&q=80",
  "category-imbottiti": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=700&fit=crop&q=80",
  "category-complementi": "https://images.unsplash.com/photo-1532372576444-dda954194ad0?w=600&h=700&fit=crop&q=80",
  "category-tavoli": "https://images.unsplash.com/photo-1530018607912-eff2daa1bac4?w=600&h=700&fit=crop&q=80",
  "category-outdoor": "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600&h=700&fit=crop&q=80",
  "banner-fullwidth": "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=2560&h=1700&fit=crop&q=90",
  "spotlight-ambiance": "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&h=2000&fit=crop&q=85",
  "spotlight-product": "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=900&h=1200&fit=crop&q=85",
  "born-in-vienna": "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1400&h=900&fit=crop&q=85",
  "wood-craftsmanship-video": "https://assets.mixkit.co/videos/44862/44862-720.mp4",
};

export default async function HomePage() {
  const images = await getPageImages("homepage", HOMEPAGE_DEFAULTS);

  return (
    <>
      <HeroSection />
      <FeaturedProduct
        ambianceImage={images["featured-ambiance"]}
        productImage={images["featured-product"]}
      />
      <CategoryCarousel
        categoryImages={{
          novita: images["category-novita"],
          sedute: images["category-sedute"],
          imbottiti: images["category-imbottiti"],
          complementi: images["category-complementi"],
          tavoli: images["category-tavoli"],
          outdoor: images["category-outdoor"],
        }}
      />
      <FullWidthBanner bannerImage={images["banner-fullwidth"]} />
      <ProductSpotlight
        ambianceImage={images["spotlight-ambiance"]}
        productImage={images["spotlight-product"]}
      />
      <BornInVienna historicalImage={images["born-in-vienna"]} />
      <WoodCraftsmanship videoUrl={images["wood-craftsmanship-video"]} />
    </>
  );
}
