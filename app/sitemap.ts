import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://www.forestfirepredictor.com',
      lastModified: new Date(),
      changeFrequency: 'hourly', 
      priority: 1,
    },
  ]
}