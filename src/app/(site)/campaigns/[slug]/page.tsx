import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCategoryLabelMap } from "@/lib/server-categories";
import type {
  CampaignBlock,
  CampaignParagraphData,
  CampaignImageTextData,
  CampaignThreeImagesData,
  CampaignSingleImageData,
  CampaignImageWithParagraphData,
  CampaignFullwidthBannerData,
} from "@/types";
import type { Metadata } from "next";

interface Params {
  params: { slug: string };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const campaign = await prisma.campaign.findUnique({ where: { slug: params.slug } });
  if (!campaign) return { title: "Non trovato" };
  return {
    title: campaign.seoTitle || `${campaign.name} | Gebrüder Thonet Vienna`,
    description: campaign.seoDescription || campaign.subtitle || undefined,
  };
}

function parseBlocks(raw: string | null): CampaignBlock[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function isYouTube(url: string) { return /youtu\.?be/.test(url); }
function youTubeEmbed(url: string): string | null {
  const m = url.match(/(?:v=|vi=|youtu\.be\/|embed\/|shorts\/|\/v\/)([a-zA-Z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}?rel=0&modestbranding=1&playsinline=1` : null;
}

export default async function CampaignDetailPage({ params }: Params) {
  const campaign = await prisma.campaign.findUnique({ where: { slug: params.slug } });
  if (!campaign || !campaign.isActive) notFound();

  const blocks = parseBlocks(campaign.blocks);

  const [related, categoryLabelMap] = await Promise.all([
    prisma.campaign.findMany({
      where: { isActive: true, slug: { not: campaign.slug } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 4,
      select: { id: true, slug: true, name: true, type: true, imageUrl: true },
    }),
    getCategoryLabelMap("campaigns"),
  ]);

  const embed = campaign.videoUrl && isYouTube(campaign.videoUrl) ? youTubeEmbed(campaign.videoUrl) : null;

  return (
    <>
      {/* Hero: categoria + titolo */}
      <section className="gtv-container pb-0 pt-[76px] md:pt-[108px]">
        <div className="text-center">
          {campaign.type && (
            <p className="uppercase text-[20px] tracking-[0.03em] text-black font-light" style={{ marginBottom: "44px" }}>{categoryLabelMap.get(campaign.type) || campaign.type}</p>
          )}
          <h1 className="font-serif text-[34px] md:text-[58px] text-black tracking-tight font-light leading-[1.2] max-w-[940px] mx-auto" style={{ marginBottom: "10px" }}>
            {campaign.name}
          </h1>
        </div>

        {/* Video */}
        {campaign.videoUrl && (
          <div className="mt-12 mx-auto" style={{ maxWidth: embed ? "1350px" : "940px" }}>
            {embed ? (
              <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
                <iframe
                  src={embed}
                  title={campaign.name}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  loading="lazy"
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            ) : (
              <video controls className="w-full" style={{ aspectRatio: "16 / 9" }}>
                <source src={campaign.videoUrl} />
              </video>
            )}
          </div>
        )}

        {campaign.description && (
          <div
            className={`text-[20px] text-black leading-snug font-light tracking-normal max-w-[940px] mx-auto whitespace-pre-line [&_p]:mb-4 [&_p:last-child]:mb-0 ${campaign.videoUrl ? "mt-14" : "mt-[66px]"}`}
            dangerouslySetInnerHTML={{ __html: campaign.description }}
          />
        )}
        {campaign.subtitle && (
          <p className="text-[20px] text-black leading-snug font-light tracking-normal max-w-[940px] mx-auto mt-6">
            {campaign.subtitle}
          </p>
        )}
      </section>

      {/* Blocks */}
      {blocks.length > 0 && (
        <div className="pt-6 md:pt-10 pb-20 md:pb-28 space-y-20 md:space-y-28">
          {blocks.map((block) => {
            if (block.type === "paragraph") {
              const d = block.data as CampaignParagraphData;
              return (
                <section key={block.id} className="gtv-container" style={{ marginBottom: "-100px" }}>
                  {d.title && (
                    <h2
                      className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit] text-center mb-6 max-w-[940px] mx-auto"
                      dangerouslySetInnerHTML={{ __html: d.title }}
                    />
                  )}
                  {d.body && (
                    <p
                      className="text-[20px] text-black leading-snug font-light tracking-normal max-w-[940px] mx-auto whitespace-pre-line"
                      dangerouslySetInnerHTML={{ __html: d.body }}
                    />
                  )}
                </section>
              );
            }
            if (block.type === "image_text") {
              const d = block.data as CampaignImageTextData;
              const imgLeft = d.imagePosition === "left";
              return (
                <section key={block.id}>
                  <div className="mx-auto" style={{ width: "calc(90% - 100px)", maxWidth: "calc(90% - 100px)" }}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 items-start">
                      <div className={`relative ${imgLeft ? "lg:order-1" : "lg:order-2"}`}>
                        {d.imageUrl && (
                          <Image
                            src={d.imageUrl}
                            alt={d.title || campaign.name}
                            width={1000}
                            height={1250}
                            className="w-full h-auto object-contain"
                            sizes="(max-width: 1024px) 100vw, 50vw"
                          />
                        )}
                      </div>
                      <div
                        className={`flex flex-col justify-start ${imgLeft ? "lg:order-2" : "lg:order-1"}`}
                        style={{ paddingLeft: imgLeft ? "150px" : "0px", paddingRight: imgLeft ? "24px" : "150px" }}
                      >
                        {d.title && (
                          <h2
                            className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit] mb-4"
                            dangerouslySetInnerHTML={{ __html: d.title }}
                          />
                        )}
                        {d.text && (
                          <p
                            className="text-[20px] text-black leading-snug font-light tracking-normal whitespace-pre-line"
                            dangerouslySetInnerHTML={{ __html: d.text }}
                          />
                        )}
                        {d.secondaryImageUrl && (
                          <div className="relative w-full" style={{ marginTop: "65px", paddingRight: "80px" }}>
                            <Image
                              src={d.secondaryImageUrl}
                              alt={d.title || campaign.name}
                              width={900}
                              height={1125}
                              className="w-full h-auto object-contain"
                              sizes="(max-width: 1024px) 100vw, 35vw"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              );
            }
            if (block.type === "three_images") {
              const d = block.data as CampaignThreeImagesData;
              const imgs = (d.images || []).filter((i) => i.url);
              if (imgs.length === 0) return null;
              return (
                <section key={block.id} className="px-2 md:px-3 lg:px-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-3 md:gap-x-4 gap-y-8">
                    {imgs.map((img, i) => (
                      <div key={i}>
                        <div className="relative aspect-[2/3] bg-warm-100 overflow-hidden">
                          <Image src={img.url} alt={img.caption || ""} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
                        </div>
                        {img.caption && (
                          <p className="text-[14px] text-black mt-3 font-light text-center">{img.caption}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              );
            }
            if (block.type === "single_image") {
              const d = block.data as CampaignSingleImageData;
              if (!d.imageUrl && !d.videoUrl) return null;
              const v = d.videoUrl?.trim();
              const ytM = v?.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
              const vimeoM = v?.match(/vimeo\.com\/(\d+)/);
              return (
                <section key={block.id} className="gtv-container">
                  <div className="mx-auto max-w-[940px]">
                    {v ? (
                      ytM ? (
                        <div className="relative w-full bg-warm-100" style={{ aspectRatio: "16 / 9" }}>
                          <iframe src={`https://www.youtube.com/embed/${ytM[1]}?rel=0`} className="absolute inset-0 w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                        </div>
                      ) : vimeoM ? (
                        <div className="relative w-full bg-warm-100" style={{ aspectRatio: "16 / 9" }}>
                          <iframe src={`https://player.vimeo.com/video/${vimeoM[1]}`} className="absolute inset-0 w-full h-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
                        </div>
                      ) : (
                        <video controls playsInline className="w-full h-auto bg-warm-100">
                          <source src={v} />
                        </video>
                      )
                    ) : (
                      <Image src={d.imageUrl} alt={d.caption || ""} width={1600} height={1000} className="w-full h-auto" sizes="(max-width: 940px) 100vw, 940px" />
                    )}
                    {d.caption && <p className="text-[14px] text-black mt-3 font-light text-center">{d.caption}</p>}
                  </div>
                </section>
              );
            }
            if (block.type === "image_with_paragraph") {
              const d = block.data as CampaignImageWithParagraphData;
              const v = d.videoUrl?.trim();
              if (!d.imageUrl && !d.body && !v) return null;
              const ytM = v?.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
              const vimeoM = v?.match(/vimeo\.com\/(\d+)/);
              return (
                <section key={block.id} className="gtv-container">
                  <div className="mx-auto max-w-[940px] px-6 md:px-16 lg:px-24">
                    {(d.imageUrl || v) && (
                      <div className="mx-auto max-w-[140px]">
                        {v ? (
                          ytM ? (
                            <div className="relative w-full bg-warm-100" style={{ aspectRatio: "16 / 9" }}>
                              <iframe src={`https://www.youtube.com/embed/${ytM[1]}?rel=0`} className="absolute inset-0 w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                            </div>
                          ) : vimeoM ? (
                            <div className="relative w-full bg-warm-100" style={{ aspectRatio: "16 / 9" }}>
                              <iframe src={`https://player.vimeo.com/video/${vimeoM[1]}`} className="absolute inset-0 w-full h-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
                            </div>
                          ) : (
                            <video controls playsInline className="w-full h-auto bg-warm-100">
                              <source src={v} />
                            </video>
                          )
                        ) : (
                          <Image src={d.imageUrl} alt="" width={400} height={400} className="w-full h-auto" sizes="140px" />
                        )}
                      </div>
                    )}
                    {d.title && (
                      <h2
                        className="font-serif text-[30px] md:text-[38px] text-black tracking-tight font-light leading-[1.2] text-center mt-10"
                        dangerouslySetInnerHTML={{ __html: d.title }}
                      />
                    )}
                    {d.body && (
                      <div
                        className="text-[20px] text-black leading-snug font-light tracking-normal text-center mt-6 [&_p]:mb-4 [&_p:last-child]:mb-0 whitespace-pre-line"
                        dangerouslySetInnerHTML={{ __html: d.body }}
                      />
                    )}
                  </div>
                </section>
              );
            }
            if (block.type === "fullwidth_banner") {
              const d = block.data as CampaignFullwidthBannerData;
              if (!d.imageUrl) return null;
              const isPdf = d.ctaHref ? /\.pdf($|\?)/i.test(d.ctaHref) : false;
              return (
                <section key={block.id} className="relative w-full" style={{ height: "85vh" }}>
                  <Image src={d.imageUrl} alt={d.title || ""} fill className="object-cover brightness-[0.6]" sizes="100vw" />
                  <div className="absolute top-14 md:top-18 lg:top-22 left-0 right-0 px-7 md:px-12 lg:px-16 text-left">
                    {d.title && (
                      <h2 className="font-sans text-2xl md:text-3xl lg:text-[38px] text-white/80 font-light uppercase tracking-[inherit] leading-snug max-w-3xl">
                        {d.title}
                      </h2>
                    )}
                    {d.ctaLabel && d.ctaHref && (
                      <a
                        href={d.ctaHref}
                        {...(isPdf ? { download: "", target: "_blank", rel: "noopener noreferrer" } : {})}
                        className="inline-block mt-[16px] uppercase text-[16px] tracking-[0.03em] text-white font-medium transition-colors hover:underline"
                        style={{ textUnderlineOffset: "12px", textDecorationSkipInk: "none", textDecorationThickness: "0.5px" }}
                      >
                        {d.ctaLabel} &rarr;
                      </a>
                    )}
                  </div>
                </section>
              );
            }
            return null;
          })}
        </div>
      )}

      {/* Altre campagne e video */}
      {related.length > 0 && (
        <section className="py-20 md:py-28">
          <div className="px-2 md:px-3 lg:px-4">
            <h3 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit] text-center mb-12">
              Altre Campagne e Video
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-14 md:gap-x-4 md:gap-y-20">
              {related.map((c) => (
                <Link key={c.id} href={`/campaigns/${c.slug}`} className="group block">
                  <div className="relative aspect-[1/1] bg-warm-100 overflow-hidden">
                    {c.imageUrl && (
                      <Image src={c.imageUrl} alt={c.name} fill className="object-cover mix-blend-multiply" sizes="(max-width: 768px) 50vw, 25vw" />
                    )}
                  </div>
                  <div className="mt-4">
                    {c.type && (
                      <p className="uppercase text-[16px] tracking-[0.01em] text-black font-light">{categoryLabelMap.get(c.type) || c.type}</p>
                    )}
                    <h4 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
                      {c.name}
                    </h4>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Breadcrumbs */}
      <div className="gtv-container pt-8 pb-[27px]">
        <div className="flex items-center justify-start gap-2 text-[14px] tracking-normal text-black font-light">
          <Link href="/">Home</Link>
          <span>&gt;</span>
          <Link href="/campaigns">Campagne e Video</Link>
          <span>&gt;</span>
          <span>{campaign.name}</span>
        </div>
      </div>
    </>
  );
}
