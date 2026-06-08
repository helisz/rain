<template>
  <div class="w-full h-screen relative overflow-hidden bg-black" :class="{ 'heatmap-active': showHeatmap }">
    <!-- 加载遮罩 -->
    <div v-if="pageLoading" class="fixed inset-0 z-[9999] flex items-center justify-center"
         style="background:rgba(0,0,0,0.4); backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px)">
      <div class="rounded-3xl px-10 py-8 flex flex-col items-center gap-4"
            style="background:rgba(255,255,255,0.12); backdrop-filter:blur(40px); -webkit-backdrop-filter:blur(40px); border:1px solid rgba(255,255,255,0.15); box-shadow:0 8px 48px rgba(0,0,0,0.2)">
        <div class="w-8 h-8 rounded-full border-[3px] border-white/20 border-t-white/80 animate-spin"></div>
        <p class="text-white/80 text-sm font-medium tracking-wide">{{ loadingMessage }}</p>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMsg"
         class="fixed top-6 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-medium max-w-[90vw] shadow-2xl backdrop-blur-2xl"
         style="background:rgba(255,59,48,0.15); backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px); border:1px solid rgba(255,59,48,0.2); color:#ff3b30">
      <span>⚠️ {{ errorMsg }}</span>
      <button @click="errorMsg = ''" class="bg-none border-none text-[#ff3b30] cursor-pointer text-base p-0 opacity-60 hover:opacity-100 transition-opacity">✕</button>
    </div>

    <!-- 地图容器 -->
    <div id="map" ref="mapContainer" class="w-full h-full z-[1]"></div>

    <!-- 地图暗化叠加层 -->
    <div v-if="showHeatmap && !pageLoading" class="fixed inset-0 z-[400] pointer-events-none"
         style="background:rgba(0,0,0,0.35); backdrop-filter:grayscale(30%) brightness(0.7) contrast(1.1); -webkit-backdrop-filter:grayscale(30%) brightness(0.7) contrast(1.1)"></div>

    <!-- 中心 Pin -->
    <div v-if="!pageLoading"
         class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-[500] pointer-events-none"
         style="filter:drop-shadow(0 4px 12px rgba(239,68,68,0.4)); animation:pin-bounce 0.45s cubic-bezier(0.34,1.56,0.64,1)">
      <svg width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg" class="max-sm:w-[30px] max-sm:h-[38px]">
        <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8.06 27.94 0 18 0z" fill="#ff3b30"/>
        <path d="M18 3.5c-8.01 0-14.5 6.49-14.5 14.5 0 10.85 14.5 21.5 14.5 21.5s14.5-10.65 14.5-21.5C32.5 9.99 26.01 3.5 18 3.5z" fill="#d63031"/>
        <circle cx="18" cy="17.5" r="6.5" fill="white"/>
        <circle cx="18" cy="17.5" r="3.8" fill="#d63031"/>
      </svg>
    </div>

    <!-- 热力图开关 + 图示组合（桌面右上角 / 移动端左下角） -->
    <div v-if="!pageLoading"
         class="fixed z-[1000] flex items-center
                top-5 right-5 gap-2
                max-sm:top-auto max-sm:right-auto max-sm:left-4 max-sm:bottom-[72px] max-sm:gap-1.5">
      <!-- 开关 -->
      <div class="rounded-full py-2 px-3.5 flex items-center gap-2 transition-all duration-300"
            :class="showHeatmap ? 'bg-blue-500/20 border-blue-400/30' : ''"
            style="background:rgba(255,255,255,0.18); backdrop-filter:blur(24px) saturate(180%); -webkit-backdrop-filter:blur(24px) saturate(180%); border:1px solid rgba(255,255,255,0.12); box-shadow:0 2px 12px rgba(0,0,0,0.08)">
        <label class="flex items-center gap-2 cursor-pointer select-none max-sm:gap-1.5">
          <span class="text-xs font-semibold text-white/90 whitespace-nowrap tracking-wide max-sm:text-[10px]">🌧 热力图</span>
          <div class="switch-track-sm" :class="{ active: showHeatmap }" @click="toggleHeatmap">
            <div class="switch-knob-sm"></div>
          </div>
        </label>
      </div>

      <!-- 图例（仅在热力图开启时显示） -->
      <Transition name="fade">
        <div v-if="showHeatmap"
             class="rounded-full px-3 py-2 flex items-center gap-2"
             style="background:rgba(255,255,255,0.15); backdrop-filter:blur(24px) saturate(180%); -webkit-backdrop-filter:blur(24px) saturate(180%); border:1px solid rgba(255,255,255,0.1)">
          <span class="text-[10px] font-semibold text-white/70 whitespace-nowrap">强度</span>
          <div class="h-[6px] w-10 rounded-full max-sm:w-8"
               style="background:linear-gradient(to right,rgba(52,199,89,0.3),rgba(0,122,255,0.5),rgba(255,149,0,0.7),rgba(255,59,48,0.9))"></div>
        </div>
      </Transition>
    </div>

    <!-- 信息面板（桌面左侧 / 移动端顶部） -->
    <Transition :name="isMobile ? 'slide-down' : 'slide-left'">
      <div v-if="weather"
           class="fixed z-[1000]
                  top-1/2 left-5 -translate-y-1/2 w-[280px] max-h-[calc(100vh-40px)] p-5 rounded-3xl
                  max-sm:top-3 max-sm:left-3 max-sm:right-3 max-sm:w-auto max-sm:-translate-y-0 max-sm:p-3 max-sm:rounded-2xl max-sm:max-h-[40vh] overflow-y-auto"
           style="background:rgba(255,255,255,0.08); backdrop-filter:blur(32px) saturate(180%); -webkit-backdrop-filter:blur(32px) saturate(180%); border:1px solid rgba(255,255,255,0.08); box-shadow:0 8px 40px rgba(0,0,0,0.15)">
        <!-- 头部 -->
        <div class="flex items-center justify-between gap-2 mb-3 max-sm:mb-2">
          <div class="flex flex-col min-w-0">
            <span class="text-base font-bold text-white/95 truncate tracking-tight max-sm:text-sm">{{ weather.cityName }}</span>
            <span class="text-[10px] text-white/40 font-mono font-medium max-sm:hidden">{{ coords!.latitude.toFixed(4) }}, {{ coords!.longitude.toFixed(4) }}</span>
          </div>
          <span class="text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 tracking-wide"
                :class="weather.source === 'api' ? 'bg-[rgba(48,209,88,0.2)] text-[#30d158]' : 'bg-[rgba(255,204,0,0.2)] text-[#ffcc00]'">
            {{ weather.source === 'api' ? '实时' : '模拟' }}
          </span>
        </div>

        <div class="max-sm:flex max-sm:items-stretch max-sm:gap-2">
          <!-- 降雨量卡片 -->
          <div class="rounded-2xl p-4 text-center mb-3
                       max-sm:flex max-sm:items-center max-sm:gap-2 max-sm:p-2.5 max-sm:mb-0 max-sm:flex-shrink-0 max-sm:min-w-[100px]"
               style="background:linear-gradient(135deg,rgba(0,122,255,0.12),rgba(0,122,255,0.06)); border:1px solid rgba(0,122,255,0.1)">
            <div class="text-[26px] mb-1 max-sm:text-lg max-sm:mb-0">🌧️</div>
            <div class="flex items-baseline justify-center gap-1">
              <span class="text-[40px] font-extrabold text-white leading-none tracking-tighter max-sm:text-2xl">{{ weather.rain1h }}</span>
              <span class="text-sm text-white/50 font-semibold max-sm:text-[11px]">mm</span>
            </div>
            <div class="text-[11px] text-white/40 mt-1 font-medium max-sm:hidden">当前降雨量</div>
            <div v-if="weather.rain3h > 0" class="text-[11px] text-[#0a84ff] mt-1.5 font-semibold max-sm:text-[10px] max-sm:mt-0">3h: {{ weather.rain3h }}mm</div>
          </div>

          <!-- 天气网格 -->
          <div class="grid grid-cols-2 gap-2 mb-3 max-sm:flex max-sm:gap-1 max-sm:mb-0 max-sm:flex-wrap max-sm:content-start">
            <div v-for="item in weatherItems" :key="item.label"
                 class="rounded-xl px-2.5 py-2.5 flex flex-col items-center gap-0.5
                        max-sm:flex-row max-sm:gap-1 max-sm:py-1.5 max-sm:px-2.5 max-sm:whitespace-nowrap max-sm:flex-1 max-sm:basis-[calc(50%-2px)]"
                 style="background:rgba(255,255,255,0.06); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); border:1px solid rgba(255,255,255,0.06)">
              <span class="text-sm font-bold text-white/90 tracking-tight max-sm:text-xs">{{ item.value }}</span>
              <span class="text-[10px] text-white/40 font-semibold max-sm:text-[9px]">{{ item.label }}</span>
            </div>
          </div>
        </div>

        <button @click="refreshData" :disabled="refreshing"
                class="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed
                       max-sm:hidden"
                style="background:rgba(0,122,255,0.2); color:#0a84ff; border:1px solid rgba(0,122,255,0.15)">
          <span :class="{ 'animate-spin': refreshing }">🔄</span>
          {{ refreshing ? '刷新中…' : '刷新数据' }}
        </button>
      </div>
    </Transition>

    <!-- 底部操作栏 -->
    <div v-if="!pageLoading && userLocation"
         class="fixed left-0 right-0 bottom-0 z-[1000] flex items-center justify-center pb-[max(env(safe-area-inset-bottom,8px),10px)] pt-2 px-4"
         style="background:linear-gradient(to top,rgba(0,0,0,0.6) 0%,rgba(0,0,0,0) 100%)">
      <div class="flex items-center gap-2 bg-white/10 backdrop-blur-2xl rounded-full px-2 py-1.5"
           style="border:1px solid rgba(255,255,255,0.08); box-shadow:0 4px 24px rgba(0,0,0,0.2)">
        <!-- 回到当前位置 -->
        <button @click="centerOnUser"
                class="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-semibold text-white/80 transition-all duration-200 active:scale-95 active:bg-white/10">
          <span class="text-sm">📍</span>
          <span>定位</span>
        </button>
      </div>
    </div>
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
    { value: `${weather.value.temperature}°C`, label: '温度' },
    { value: `${weather.value.humidity}%`, label: '湿度' },
    { value: `${weather.value.windSpeed}m/s`, label: '风速' },
    { value: weather.value.description, label: '天气' },
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

  // Dark base map tiles work better with iOS dark glass aesthetic
  mapInstance = leaflet.default!.map('map', {
    center: [lat, lng],
    zoom: 13,
    zoomControl: true,
    attributionControl: false
  })
  leaflet.default!.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
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
  65% { transform: translate(-50%,-100%) scale(1.06); }
  100% { transform: translate(-50%,-100%) scale(1); opacity: 1; }
}

/* Leaflet overrides - dark iOS style */
.leaflet-control-zoom a {
  background: rgba(255,255,255,0.1) !important;
  backdrop-filter: blur(20px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
  border: 1px solid rgba(255,255,255,0.1) !important;
  color: rgba(255,255,255,0.8) !important;
  font-weight: 500 !important;
  transition: background 0.2s !important;
}
.leaflet-control-zoom a:hover { background: rgba(255,255,255,0.2) !important; }
.leaflet-control-zoom { border: none !important; }

/* Switch for iOS style (small) */
.switch-track-sm {
  position: relative;
  flex-shrink: 0;
  width: 32px;
  height: 18px;
  border-radius: 9px;
  background: rgba(255,255,255,0.2);
  transition: background 0.3s cubic-bezier(0.4,0,0.2,1);
  cursor: pointer;
}
.switch-track-sm.active { background: #30d158; }
.switch-knob-sm {
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: white;
  top: 2px;
  left: 2px;
  transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}
.switch-track-sm.active .switch-knob-sm { transform: translateX(14px); }

/* Transitions */
.slide-left-enter-active, .slide-left-leave-active { transition: all 0.4s cubic-bezier(0.4,0,0.2,1); }
.slide-left-enter-from, .slide-left-leave-to { opacity: 0; transform: translateY(-50%) translateX(-24px); }
.slide-left-enter-to, .slide-left-leave-from { opacity: 1; transform: translateY(-50%) translateX(0); }

.slide-down-enter-active, .slide-down-leave-active { transition: all 0.4s cubic-bezier(0.4,0,0.2,1); }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-100%) translateX(-50%); }
.slide-down-enter-to, .slide-down-leave-from { opacity: 1; transform: translateY(0) translateX(-50%); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Scrollbar */
::-webkit-scrollbar { width: 2px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 1px; }
</style>
