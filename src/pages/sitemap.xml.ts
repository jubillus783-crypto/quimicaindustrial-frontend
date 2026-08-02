import type { APIRoute } from "astro";
import { getProductSlugs } from "../data/products";

export const GET: APIRoute = async () => {
  const slugs = await getProductSlugs();

  const baseUrl = "https://www.quimicaindustrial.pe";
  const currentDate = new Date().toISOString().split("T")[0];

  const staticPages = [
    { url: "", priority: "1.0", changefreq: "daily" },
    { url: "/products", priority: "0.9", changefreq: "daily" },
    { url: "/cotizacion", priority: "0.8", changefreq: "weekly" },
    { url: "/contacto", priority: "0.8", changefreq: "monthly" },
    { url: "/terminos-condiciones", priority: "0.3", changefreq: "yearly" },
    { url: "/politica-privacidad", priority: "0.3", changefreq: "yearly" },
    { url: "/libro-reclamaciones", priority: "0.4", changefreq: "yearly" },
  ];

  // Las paginas /products?page=N declaran <link rel="canonical"> apuntando a
  // /products, asi que Google nunca las indexa: enviarlas en el sitemap solo
  // gastaba presupuesto de rastreo e inflaba el informe de paginas no
  // indexadas. Todos los productos ya van listados uno por uno mas abajo.
  const productPages = slugs.map((slug) => ({
    url: `/products/${slug}`,
    priority: "0.8",
    changefreq: "weekly",
  }));

  const allPages = [...staticPages, ...productPages];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
  .map(
    (page) => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
