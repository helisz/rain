<template>
  <div class="w-full h-screen relative" :class="{ 'heatmap-active': showHeatmap }">
    <!-- 加载遮罩 -->
    <div v-if="pageLoading" class="fixed inset-0 z-[9999] flex items-center justify-center"
         style="background:rgba(0,0,0,0.3); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px)">
      <div class="glass-strong rounded-[20px] px-10 py-8 flex flex-col items-center gap-4">
        <div class="w-9 h-9 rounded-full border-[3.5px] border-blue-500/20 border-t-blue-500 animate-spin"></div>
        <p class="text-[#1c1c1e] text-sm font-medium tracking-wide">{{ loadingMessage }}</p>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMsg"
         class="fixed top-5 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-3 px-5 py-3 rounded-2xl text-sm font-medium max-w-[90vw] shadow-lg"
         style="background:rgba(254,242,242,0.85); backdrop-filter:blur(20px) saturate(180%); -webkit-backdrop-filter:blur(20px) saturate(180%); border:1px solid rgba(252,165,165,0.4); color:#b91c1c">
      <span>⚠️ {{ errorMsg }}</span>
      <button @click="errorMsg = ''" class="bg-none border-none text-[#b91c1c] cursor-pointer text-base p-0 opacity-70 hover:opacity-100 transition-opacity">✕</button>
    </div>

    <!-- 地图容器 -->
    <div id="map" ref="mapContainer" class="w-full h-full z-[1]"></div>

    <!-- 地图暗化叠加层 -->
    <div v-if="showHeatmap && !pageLoading" class="fixed inset-0 z-[400] pointer-events-none"
         style="background:rgba(0,0,0,0.4); backdrop-filter:grayscale(40%) brightness(0.75); -webkit-backdrop-filter:grayscale(40%) brightness(0.75)"></div>

    <!-- 中心 Pin -->
    <div v-if="!pageLoading"
         class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-[500] pointer-events-none pin-shadow"
         style="animation:pin-bounce 0.4s cubic-bezier(0.34,1.56,0.64,1)">
      <svg width="40" height="48" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 0C9 0 0 9 0 20c0 15 20 28 20 28s20-13 20-28C40 9 31 0 20 0z" fill="#ef4444"/>
        <path d="M20 4C11.164 4 4 11.164 4 20c0 12 16 23 16 23s16-11 16-23C36 11.164 28.836 4 20 4z" fill="#dc2626"/>
        <circle cx="20" cy="20" r="7" fill="white"/>
        <circle cx="20" cy="20" r="4" fill="#dc2626"/>
        <rect x="18" y="38" width="4" height="10" rx="2" fill="#ef4444"/>
      </svg>
    </div>

    <!-- 热力图开关 -->
    <div v-if="!pageLoading"
         class="glass fixed z-[1000] rounded-xl py-2 px-4
                top-5 right-5
                sm:top-5 sm:right-5 sm:bottom-auto sm:left-auto
                max-sm:left-4 max-sm:right-auto max-sm:top-auto max-sm:bottom-3">
      <label class="flex items-center gap-2.5 cursor-pointer select-none max-sm:gap-1">
        <span class="text-xs font-semibold text-[#1c1c1e] whitespace-nowrap tracking-wide max-sm:text-[10px]">🌧 降雨热力图</span>
        <div class="switch-track" :class="{ active: showHeatmap }" @click="toggleHeatmap">
          <div class="switch-knob"></div>
        </div>
      </label>
    </div>

    <!-- 热力图图示 -->
    <Transition name="fade">
      <div v-if="showHeatmap && !pageLoading"
           class="glass fixed z-[1000] rounded-xl py-3 px-5 flex items-center gap-3
                  bottom-6 left-1/2 -translate-x-1/2
                  max-sm:bottom-16 max-sm:left-4 max-sm:-translate-x-0 max-sm:py-1.5 max-sm:px-2.5 max-sm:gap-1.5 max-sm:rounded-xl">
        <span class="text-xs font-semibold text-[#1c1c1e] whitespace-nowrap tracking-wider max-sm:text-[10px]">降雨强度</span>
        <div class="flex flex-col gap-0.5 max-sm:flex-row max-sm:items-center max-sm:gap-1">
          <div class="legend-bar max-sm:w-11 max-sm:h-1.5 rounded-sm max-sm:border max-sm:border-white/30"></div>
          <div class="flex justify-between text-[10px] text-[rgba(28,28,30,0.7)] font-medium px-0.5 w-[180px] max-sm:hidden">
            <span>0</span><span>1</span><span>5</span><span>10+ mm/h</span>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 信息面板 -->
    <Transition :name="isMobile ? 'slide-down' : 'slide-left'">
      <div v-if="weather"
           class="glass-strong fixed z-[1000] overflow-y-auto
                  top-1/2 left-5 -translate-y-1/2 w-[280px] max-h-[calc(100vh-40px)] p-[18px_18px_16px] rounded-[22px]
                  max-sm:top-4 max-sm:left-4 max-sm:right-4 max-sm:w-auto max-sm:max-h-none max-sm:p-[10px_14px] max-sm:rounded-xl max-sm:-translate-y-0">
        <div class="flex items-start justify-between gap-2 mb-3.5 max-sm:mb-1.5">
          <div class="flex flex-col gap-0.5 min-w-0">
            <span class="text-base font-bold text-[#1c1c1e] truncate tracking-tight max-sm:text-sm">{{ weather.cityName }}</span>
            <span class="text-[10px] text-[rgba(28,28,30,0.55)] font-mono font-medium max-sm:hidden">{{ coords!.latitude.toFixed(4) }}, {{ coords!.longitude.toFixed(4) }}</span>
          </div>
          <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 mt-0.5 tracking-wide"
                :class="weather.source === 'api' ? 'bg-[rgba(52,199,89,0.2)] text-[#1a7d36]' : 'bg-[rgba(255,204,0,0.2)] text-[#996600]'">
            {{ weather.source === 'api' ? '实时数据' : '模拟' }}
          </span>
        </div>

        <div class="max-sm:flex max-sm:items-center max-sm:gap-2">
          <!-- 降雨量卡片 -->
          <div class="rounded-2xl p-4 text-center mb-3 max-sm:flex max-sm:items-center max-sm:gap-2 max-sm:p-2 max-sm:mb-0 max-sm:flex-shrink-0"
               style="background:linear-gradient(135deg,rgba(59,130,246,0.08),rgba(59,130,246,0.18));border:1px solid rgba(59,130,246,0.12)">
            <div class="text-[28px] mb-1 max-sm:text-xl max-sm:mb-0">🌧️</div>
            <div class="flex items-baseline justify-center gap-1">
              <span class="text-[42px] font-extrabold text-[#1c1c1e] leading-none tracking-tighter max-sm:text-2xl">{{ weather.rain1h }}</span>
              <span class="text-sm text-[rgba(28,28,30,0.5)] font-semibold max-sm:text-xs">mm/h</span>
            </div>
            <div class="text-xs text-[rgba(28,28,30,0.55)] mt-1 font-medium max-sm:hidden">当前降雨量</div>
            <div v-if="weather.rain3h > 0" class="text-xs text-blue-500 mt-1.5 font-semibold max-sm:text-[11px] max-sm:mt-0">近3h: {{ weather.rain3h }} mm</div>
          </div>

          <!-- 天气网格 -->
          <div class="grid grid-cols-2 gap-2 mb-3 max-sm:flex max-sm:gap-1 max-sm:mb-0 max-sm:flex-wrap">
            <div v-for="item in weatherItems" :key="item.label"
                 class="rounded-xl px-2 py-2.5 flex flex-col items-center gap-0.5 max-sm:flex-row max-sm:gap-0 max-sm:py-1 max-sm:px-2 max-sm:whitespace-nowrap"
                 style="background:rgba(255,255,255,0.5); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); border:1px solid rgba(255,255,255,0.3)">
              <span class="text-sm font-bold text-[#1c1c1e] tracking-tight max-sm:text-xs">{{ item.value }}</span>
              <span class="text-[10px] text-[rgba(28,28,30,0.5)] font-semibold max-sm:text-[9px]">{{ item.label }}</span>
            </div>
          </div>
        </div>

        <button @click="refreshData" :disabled="refreshing"
                class="w-full py-2.5 bg-blue-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 hover:bg-blue-600 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_2px_8px_rgba(59,130,246,0.3)] hover:shadow-[0_4px_16px_rgba(59,130,246,0.4)] max-sm:hidden">
          <span :class="{ 'animate-spin': refreshing }">🔄</span>
          {{ refreshing ? '刷新中…' : '刷新数据' }}
        </button>
      </div>
    </Transition>

    <!-- 回到当前位置 -->
    <button v-if="!pageLoading && userLocation" @click="centerOnUser"
            class="fixed bottom-6 right-5 z-[1000] flex items-center gap-2 py-3 px-5 rounded-full text-sm font-semibold text-[#1c1c1e] cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95
                   max-sm:bottom-3 max-sm:right-3 max-sm:py-1.5 max-sm:px-3 max-sm:rounded-full max-sm:text-[11px] max-sm:gap-1.5"
            style="background:rgba(255,255,255,0.7); backdrop-filter:blur(24px) saturate(180%); -webkit-backdrop-filter:blur(24px) saturate(180%); border:1px solid rgba(255,255,255,0.4); box-shadow:0 2px 16px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5)">
      <span class="text-base max-sm:text-[11px]">📍</span>
      <!-- <span class="max-sm:text-[10px]">回到当前位置</span> -->
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Map as LeafletMap, TileLayer as LeafletTileLayer } from 'leaflet'
import { ref, computed, onMounted, nextTick } from 'vue'

interface WeatherData {
  temperature: number
  description: string
  icon: string
  rain1h: number
  rain3h: number
  humidity: number
  windSpeed: number
  cityName: string
  source: 'api' | 'mock'
}

const mapContainer = ref<HTMLDivElement>()
const coords = ref<{ latitude: number; longitude: number } | null>(null)
const userLocation = ref<{ latitude: number; longitude: number } | null>(null)
const weather = ref<WeatherData | null>(null)
const pageLoading = ref(true)
const loadingMessage = ref('正在获取你的位置…')
const errorMsg = ref('')
const refreshing = ref(false)
const showHeatmap = ref(false)
const isMobile = ref(false)

let mapInstance: LeafletMap | null = null
let heatmapLayer: LeafletTileLayer | null = null

const weatherItems = computed(() => {
  if (!weather.value) return []
  return [
    { value: `${weather.value.temperature}°C`, label: '🌡️ 温度' },
    { value: `${weather.value.humidity}%`, label: '💧 湿度' },
    { value: `${weather.value.windSpeed} m/s`, label: '💨 风速' },
    { value: weather.value.description, label: '🌤️ 天气' },
  ]
})

function getPosition(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('浏览器不支持地理定位'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => {
        const msgs: Record<number, string> = {
          [err.PERMISSION_DENIED]: '定位被拒绝',
          [err.POSITION_UNAVAILABLE]: '无法获取位置信息',
          [err.TIMEOUT]: '定位请求超时'
        }
        reject(new Error(msgs[err.code] || '定位失败'))
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  })
}

const config = useRuntimeConfig()
const apiKey = config.public.openWeatherApiKey as string | undefined

function getMockWeather(lat: number, lng: number): WeatherData {
  const seed = Math.sin(lat * lng * 0.1) * 100
  const mockRain = Math.abs(Math.round((seed % 5) * 10)) / 10
  return {
    temperature: Math.round(22 + (seed % 10)),
    description: '小雨',
    icon: '09d',
    rain1h: mockRain,
    rain3h: Math.round(mockRain * 2.5 * 10) / 10,
    humidity: Math.round(65 + Math.abs(seed % 30)),
    windSpeed: Math.round((3 + Math.abs(seed % 5)) * 10) / 10,
    cityName: '当前位置',
    source: 'mock'
  }
}

async function fetchWeather(lat: number, lng: number): Promise<WeatherData> {
  if (!apiKey || apiKey === 'your_api_key_here') {
    await new Promise((r) => setTimeout(r, 300))
    return getMockWeather(lat, lng)
  }
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&lang=zh_cn`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API 请求失败 (${res.status})`)
  const data = await res.json()
  return {
    temperature: Math.round(data.main?.temp ?? 0),
    description: data.weather?.[0]?.description ?? '未知',
    icon: data.weather?.[0]?.icon ?? '01d',
    rain1h: data.rain?.['1h'] ?? 0,
    rain3h: data.rain?.['3h'] ?? 0,
    humidity: data.main?.humidity ?? 0,
    windSpeed: data.wind?.speed ?? 0,
    cityName: data.name ?? '未知位置',
    source: 'api'
  }
}

async function toggleHeatmap() {
  const leaflet = await import('leaflet')
  showHeatmap.value = !showHeatmap.value
  if (showHeatmap.value && !heatmapLayer && apiKey && apiKey !== 'your_api_key_here') {
    heatmapLayer = leaflet.default!.tileLayer(
      `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${apiKey}`,
      { opacity: 1.0, attribution: '&copy; <a href="https://openweathermap.org">OpenWeatherMap</a>' }
    ).addTo(mapInstance!)
  } else if (showHeatmap.value && heatmapLayer) {
    heatmapLayer.addTo(mapInstance!)
  } else if (heatmapLayer) {
    heatmapLayer.remove()
  }
}

async function initMap(lat: number, lng: number) {
  const leaflet = await import('leaflet')
  delete (leaflet.default!.Icon.Default.prototype as any)._getIconUrl
  leaflet.default!.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
  if (mapInstance) { mapInstance.setView([lat, lng], 13); return }
  mapInstance = leaflet.default!.map('map', { center: [lat, lng], zoom: 13, zoomControl: true })
  leaflet.default!.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(mapInstance)
  mapInstance.on('moveend', async () => {
    const c = mapInstance!.getCenter()
    coords.value = { latitude: c.lat, longitude: c.lng }
    try { weather.value = await fetchWeather(c.lat, c.lng) }
    catch (e) { errorMsg.value = e instanceof Error ? e.message : '获取天气数据失败' }
  })
}

function centerOnUser() {
  if (userLocation.value) {
    coords.value = { ...userLocation.value }
    mapInstance?.setView([userLocation.value.latitude, userLocation.value.longitude], 13, { animate: true })
  }
}

async function refreshData() {
  if (!coords.value) return
  refreshing.value = true
  try { weather.value = await fetchWeather(coords.value.latitude, coords.value.longitude) }
  catch (e) { errorMsg.value = e instanceof Error ? e.message : '获取天气数据失败' }
  refreshing.value = false
}

function checkMobile() { isMobile.value = window.innerWidth < 640 }

onMounted(async () => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  try { const pos = await getPosition(); userLocation.value = pos; coords.value = pos }
  catch (e) {
    errorMsg.value = e instanceof Error ? e.message : '定位失败，使用默认位置'
    const fallback = { latitude: 39.9042, longitude: 116.4074 }
    userLocation.value = fallback; coords.value = fallback
  }
  loadingMessage.value = '正在加载地图…'
  await nextTick()
  await initMap(coords.value!.latitude, coords.value!.longitude)
  loadingMessage.value = '正在获取降雨数据…'
  try { weather.value = await fetchWeather(coords.value!.latitude, coords.value!.longitude) }
  catch (e) { errorMsg.value = e instanceof Error ? e.message : '获取天气数据失败' }
  pageLoading.value = false
})
</script>

<style>
@keyframes pin-bounce {
  0% { transform: translate(-50%,-100%) scale(0.5); opacity: 0; }
  70% { transform: translate(-50%,-100%) scale(1.08); }
  100% { transform: translate(-50%,-100%) scale(1); opacity: 1; }
}

.slide-left-enter-active, .slide-left-leave-active { transition: all 0.4s cubic-bezier(0.4,0,0.2,1); }
.slide-left-enter-from, .slide-left-leave-to { opacity: 0; transform: translateY(-50%) translateX(-24px); }
.slide-left-enter-to, .slide-left-leave-from { opacity: 1; transform: translateY(-50%) translateX(0); }

.slide-down-enter-active, .slide-down-leave-active { transition: all 0.4s cubic-bezier(0.4,0,0.2,1); }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-100%) translateX(-50%); }
.slide-down-enter-to, .slide-down-leave-from { opacity: 1; transform: translateY(0) translateX(-50%); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
