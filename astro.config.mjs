import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

const getProductUrls = async () => {
  try {
    const res = await fetch('https://oregonchem-backend.onrender.com/api/qi/products/slugs');
    const data = await res.json();
    const slugs = data.data || [];
    return slugs.map((p) => `https://www.quimicaindustrial.pe/products/${p.slug}`);
  } catch (e) {
    console.warn('Sitemap: could not fetch product slugs', e);
    return [];
  }
};

const productUrls = await getProductUrls();
console.log('Sitemap product URLs fetched:', productUrls.length);

export default defineConfig({
  site: 'https://www.quimicaindustrial.pe',
  output: 'server',
  adapter: vercel({
    isr: {
      expiration: 300,
      exclude: [/^\/api\/.+/],
    },
  }),
  integrations: [
    react(),
    sitemap({
      customPages: productUrls,
    }),
  ],
  vite: {
    ssr: {
      external: ["nodemailer"],
    },
  },
});
