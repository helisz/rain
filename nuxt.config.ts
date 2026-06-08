// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-06-01',

  modules: ['@nuxtjs/tailwindcss'],

  app: {
    head: {
      title: '降雨量地图',
      meta: [
        { name: 'description', content: '查看你所在位置的实时降雨量' }
      ]
    }
  },

  css: [
    'leaflet/dist/leaflet.css'
  ],

  experimental: {
    appManifest: false
  },

  runtimeConfig: {
    public: {
      openWeatherApiKey: ''
    }
  },

  vite: {
    optimizeDeps: {
      include: ['leaflet']
    }
  },

  nitro: {
    preset: 'static'
  }
})
