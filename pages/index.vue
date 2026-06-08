<template>
  <div class="w-full h-screen relative overflow-hidden" :class="{ 'heatmap-active': showHeatmap }">
    <!-- 加载遮罩 -->
    <div v-if="pageLoading" class="fixed inset-0 z-[9999] flex items-center justify-center"
         style="background:rgba(0,0,0,0.15); backdrop-filter:blur(16px)">
      <div class="rounded-3xl px-10 py-8 flex flex-col items-center gap-4"
            style="background:rgba(255,255,255,0.85); backdrop-filter:blur(40px); border:1px solid rgba(255,255,255,0.5); box-shadow:0 8px 40px rgba(0,0,0,0.1)">
        <div class="w-8 h-8 rounded-full border-[3px] border-blue-500/20 border-t-blue-500 animate-spin"></div>
        <p class="text-gray-700 text-sm font-medium">{{ loadingMessage }}</p>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMsg"
         class="fixed top-6 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-medium max-w-[90vw] shadow-lg"
         style="background:rgba(254,242,242,0.95); backdrop-filter:blur(20px); border:1px solid rgba(239,68,68,0.2); color:#dc2626">
      <span>⚠️ {{ errorMsg }}</span>
      <button @click="errorMsg = ''" class="bg-none border-none text-[#dc2626] cursor-pointer text-base p-0 opacity-60 hover:opacity-100">✕</button>
    </div>

    <!-- 地图 -->
    <div id="map" ref="mapContainer" class="w-full h-full z-[1]"></div>

    <!-- 中心 Pin -->
    <div v-if="!pageLoading"
         class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-[500] pointer-events-none"
         style="filter:drop-shadow(0 2px 8px rgba(239,68,68,0.5)); animation:pin-bounce 0.45s cubic-bezier(0.34,1.56,0.64,1)">
      <svg width="36" height="44" viewBox="0 0 36 44" class="max-sm:w-[30px] max-sm:h-[38px]">
        <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8.06 27.94 0 18 0z" fill="#ef4444"/>
        <path d="M18 3.5c-8.01 0-14.5 6.49-14.5 14.5 0 10.85 14.5 21.5 14.5 21.5s14.5-10.65 14.5-21.5C32.5 9.99 26.01 3.5 18 3.5z" fill="#dc2626"/>
        <circle cx="18" cy="17.5" r="6.5" fill="white"/>
        <circle cx="18" cy="17.5" r="3.8" fill="#dc2626"/>
      </svg>
    </div>

    <!-- 热力图开关 -->
    <div v-if="!pageLoading"
         class="fixed z-[1000] flex items-center gap-2 top-5 right-5 max-sm:top-auto max-sm:left-2 max-sm:bottom-[130px] max-sm:gap-1.5">
      <div class="rounded-full py-2 px-3.5 flex items-center gap-2"
            style="background:rgba(255,255,255,0.85); backdrop-filter:blur(24px) saturate(180%); border:1px solid rgba(255,255,255,0.5); box-shadow:0 2px 12px rgba(0,0,0,0.06)">
        <label class="flex items-center gap-2 cursor-pointer select-none max-sm:gap-1.5">
          <span class="text-xs font-semibold text-gray-700 whitespace-nowrap max-sm:text-[10px]">🌧 热力图</span>
          <div class="switch-track-sm" :class="{ active: showHeatmap }" @click="toggleHeatmap">
            <div class="switch-knob-sm"></div>
          </div>
        </label>
      </div>
      <Transition name="fade">
        <div v-if="showHeatmap"
             class="rounded-full px-3 py-2 flex items-center gap-2"
             style="background:rgba(255,255,255,0.85); backdrop-filter:blur(24px) saturate(180%); border:1px solid rgba(255,255,255,0.5)">
          <span class="text-[10px] font-semibold text-gray-500 whitespace-nowrap">强度</span>
          <div class="h-[6px] w-10 rounded-full max-sm:w-8"
               style="background:linear-gradient(to right,#93c5fd,#60a5fa,#f59e0b,#ef4444)"></div>
        </div>
      </Transition>
    </div>

    <!-- ====== 降水趋势图 ====== -->
    <div v-if="hourlyData.length > 0"
         class="fixed z-[1000] left-0 right-0 bottom-0 max-sm:left-0 max-sm:right-0 max-sm:bottom-0">
      <!-- 桌面 -->
      <div class="hidden sm:flex justify-center">
        <div class="rounded-2xl px-4 py-2.5 mb-3"
             style="background:rgba(255,255,255,0.92); backdrop-filter:blur(24px) saturate(180%); border:1px solid rgba(255,255,255,0.5); box-shadow:0 4px 24px rgba(0,0,0,0.08)">
          <div class="flex items-center gap-4">
            <span class="text-[11px] font-semibold text-gray-500 whitespace-nowrap">降水趋势</span>
            <!-- 数据来源图例 -->
            <div class="flex items-center gap-2">
              <span class="flex items-center gap-1 text-[8px] text-gray-400"><span class="w-3 h-0.5 rounded bg-gray-300 inline-block"></span> 模拟历史</span>
              <span class="flex items-center gap-1 text-[8px] text-gray-400"><span class="w-3 h-0.5 rounded bg-blue-500 inline-block"></span> 预测</span>
            </div>
            <svg :width="chartWidth" :height="chartHeight" class="overflow-visible cursor-pointer" @click.stop>
              <defs>
                <linearGradient id="precipGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
                </linearGradient>
              </defs>
              <line v-for="(_, i) in gridLines" :key="'g'+i"
                    :x1="padding.left+(i/(gridLines.length-1))*innerW" :x2="padding.left+(i/(gridLines.length-1))*innerW"
                    :y1="padding.top" :y2="padding.top+innerH" stroke="#e5e7eb" stroke-width="0.5"/>
              <!-- 模拟历史区域虚线 -->
              <path v-if="historyPath" :d="historyPath" fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="3,3" stroke-linejoin="round"/>
              <path v-if="historyAreaPath" :d="historyAreaPath" fill="#9ca3af" opacity="0.08"/>
              <!-- 预测区域实线 -->
              <path v-if="forecastPath" :d="forecastPath" fill="none" stroke="#3b82f6" stroke-width="1.8" stroke-linejoin="round"/>
              <path v-if="forecastAreaPath" :d="forecastAreaPath" fill="url(#precipGrad)" opacity="0.2"/>
              <!-- 当前时间线 -->
              <line v-if="plottedPoints[currentTimeIndex]"
                    :x1="plottedPoints[currentTimeIndex].x" :x2="plottedPoints[currentTimeIndex].x"
                    :y1="padding.top" :y2="padding.top+innerH"
                    stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.7"/>
              <text v-if="plottedPoints[currentTimeIndex]"
                    :x="plottedPoints[currentTimeIndex].x" :y="chartHeight-2"
                    text-anchor="middle" fill="#ef4444" font-size="9" font-weight="700">现在</text>
              <!-- 数据点 -->
              <g v-for="(pt, i) in plottedPoints" :key="'p'+i">
                <text :x="pt.x" :y="pt.y - 8" text-anchor="middle" :fill="pt.isHistory ? '#9ca3af' : '#3b82f6'" font-size="8" font-weight="600" class="select-none">{{ pt.rain.toFixed(1) }}</text>
                <circle :cx="pt.x" :cy="pt.y" :r="selectedHourIndex===i ? 5 : 3"
                        :fill="pt.isHistory ? '#e5e7eb' : 'white'"
                        :stroke="selectedHourIndex===i ? '#ef4444' : (pt.isHistory ? '#9ca3af' : '#3b82f6')"
                        :stroke-width="selectedHourIndex===i ? 2 : 1.5"
                        class="transition-all duration-150 cursor-pointer hover:opacity-80"
                        @click.stop="selectPoint(i)"/>
                <circle v-if="selectedHourIndex===i" :cx="pt.x" :cy="pt.y" r="7" fill="none" stroke="#ef4444" stroke-width="1.5" opacity="0.4"/>
              </g>
            </svg>
            <div v-if="selectedHour" class="flex flex-col items-center min-w-[64px]">
              <span class="text-[9px] font-semibold text-gray-500">{{ selectedHour.time }}</span>
              <span class="text-[11px] font-bold" :class="selectedHour.source==='history' ? 'text-gray-500' : 'text-blue-600'">{{ selectedHour.rain.toFixed(1) }}mm</span>
              <span class="text-[8px] text-gray-400">{{ selectedHour.source==='history' ? '模拟' : '预测' }}</span>
            </div>
            <div v-else class="flex flex-col items-center min-w-[64px] opacity-0"><span class="text-[10px]">-</span></div>
          </div>
        </div>
      </div>

      <!-- 移动端 -->
      <div class="sm:hidden px-2 pb-[max(env(safe-area-inset-bottom,4px),4px)] pt-1"
           style="background:linear-gradient(to top,rgba(255,255,255,0.95) 0%,rgba(255,255,255,0) 40%)">
        <div class="rounded-xl px-3 py-2"
             style="background:rgba(255,255,255,0.92); backdrop-filter:blur(24px) saturate(180%); border:1px solid rgba(255,255,255,0.5)">
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-semibold text-gray-500">降水</span>
              <span class="flex items-center gap-1 text-[7px] text-gray-400"><span class="w-2 h-[2px] bg-gray-300 rounded inline-block"></span>模拟</span>
              <span class="flex items-center gap-1 text-[7px] text-gray-400"><span class="w-2 h-[2px] bg-blue-500 rounded inline-block"></span>预测</span>
            </div>
            <span v-if="selectedHour" class="text-[10px] font-semibold" :class="selectedHour.source==='history' ? 'text-gray-500' : 'text-blue-600'">{{ selectedHourLabel }} {{ selectedHourRain }}mm</span>
          </div>
          <div class="overflow-x-auto pb-1" style="-webkit-overflow-scrolling:touch;scrollbar-width:none" ref="chartScrollRef">
            <div class="flex items-end gap-2" :style="{ minWidth: hourlyData.length * 38 + 'px' }">
              <div v-for="(h, i) in hourlyData" :key="h.dt"
                   class="flex flex-col items-center cursor-pointer transition-all duration-150"
                   :class="selectedHourIndex===i ? 'scale-110' : 'hover:opacity-80'"
                   @click="selectPoint(i)">
                <span class="text-[9px] font-semibold mb-0.5" :class="h.source==='history' ? 'text-gray-400' : 'text-gray-900'">{{ h.rain.toFixed(1) }}</span>
                <div class="w-[18px] rounded-sm transition-all duration-200"
                     :style="{ height: barHeight(h.rain)+'px', background: h.source==='history' ? '#d1d5db' : barColor(h.rain),
                               boxShadow: i===currentTimeIndex ? '0 0 0 2px #ef4444' : 'none' }"></div>
                <span class="text-[7px] mt-0.5" :class="i===currentTimeIndex ? 'text-red-500 font-semibold' : 'text-gray-400'">{{ formatHour(h.dt) }}</span>
                <span v-if="i===currentTimeIndex" class="text-[7px] font-bold text-red-500 -mt-0.5">▼</span>
                <span v-if="h.source==='history'" class="text-[6px] text-gray-300">历史</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 信息面板（选中时刻→展示该时刻天气，未选中→展示当前天气） -->
    <Transition :name="isMobile ? 'slide-down' : 'slide-left'">
      <div v-if="displayWeather"
           class="fixed z-[1000] top-1/2 left-4 -translate-y-1/2 w-[260px] p-4 rounded-2xl
                  max-sm:top-3 max-sm:left-3 max-sm:right-3 max-sm:w-auto max-sm:-translate-y-0 max-sm:p-2.5 max-sm:rounded-xl max-sm:max-h-[30vh] overflow-y-auto"
           style="background:rgba(255,255,255,0.85); backdrop-filter:blur(32px) saturate(180%); border:1px solid rgba(255,255,255,0.5); box-shadow:0 8px 40px rgba(0,0,0,0.08)">
        <div class="flex items-center justify-between gap-2 mb-2 max-sm:mb-1">
          <div class="flex flex-col min-w-0">
            <span class="text-sm font-bold text-gray-900 truncate max-sm:text-xs">{{ weather.cityName }}</span>
            <span v-if="selectedHour" class="text-[9px] text-blue-500 font-medium">⏱ {{ selectedHourLabel }} — {{ selectedHour.source==='history' ? '模拟' : '预测' }}</span>
            <span v-else class="text-[9px] text-gray-400 font-mono max-sm:hidden">{{ coords!.latitude.toFixed(4) }}, {{ coords!.longitude.toFixed(4) }}</span>
          </div>
          <span v-if="!selectedHour" class="text-[9px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0"
                :class="weather.source==='api' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'">
            {{ weather.source==='api' ? '实时' : '模拟' }}
          </span>
        </div>

        <div class="max-sm:flex max-sm:items-center max-sm:gap-1.5">
          <div class="rounded-xl p-3 text-center mb-2 max-sm:flex max-sm:items-center max-sm:gap-1.5 max-sm:p-1.5 max-sm:mb-0 max-sm:flex-shrink-0"
               style="background:linear-gradient(135deg,#eff6ff,#dbeafe); border:1px solid #bfdbfe">
            <div class="text-lg mb-0.5 max-sm:text-base">🌧️</div>
            <div class="flex items-baseline justify-center gap-0.5">
              <span class="text-3xl font-extrabold text-gray-900 leading-none max-sm:text-xl">{{ displayWeather.rain }}</span>
              <span class="text-xs text-gray-500 font-semibold max-sm:text-[10px]">mm</span>
            </div>
            <div class="text-[10px] text-gray-400 max-sm:hidden">{{ selectedHour ? '该时刻' : '当前' }}</div>
          </div>

          <div class="grid grid-cols-2 gap-1.5 max-sm:flex max-sm:gap-1 max-sm:flex-wrap">
            <div v-for="item in displayItems" :key="item.label"
                 class="rounded-xl px-2 py-2 flex flex-col items-center gap-0.5 max-sm:flex-row max-sm:gap-1 max-sm:py-1 max-sm:px-1.5 max-sm:whitespace-nowrap max-sm:flex-1"
                 style="background:rgba(249,250,251,0.8); backdrop-filter:blur(8px); border:1px solid rgba(229,231,235,0.5)">
              <span class="text-xs font-bold text-gray-800 max-sm:text-[11px]">{{ item.value }}</span>
              <span class="text-[9px] text-gray-400 font-semibold max-sm:text-[8px]">{{ item.label }}</span>
            </div>
          </div>
        </div>

        <button v-if="selectedHourIndex >= 0" @click="clearSelection"
                class="w-full py-1.5 mt-1.5 rounded-lg text-[10px] font-semibold text-gray-500 transition-all duration-200 active:scale-[0.97] max-sm:hidden"
                style="background:rgba(0,0,0,0.04)">✕ 取消选择</button>
      </div>
    </Transition>

    <!-- 定位 -->
    <button v-if="!pageLoading && userLocation && !isMobile" @click="centerOnUser"
            class="fixed bottom-4 right-4 z-[1000] flex items-center gap-1.5 py-2 px-3.5 rounded-full text-xs font-semibold text-gray-600 cursor-pointer active:scale-95 shadow-lg"
            style="background:rgba(255,255,255,0.9); backdrop-filter:blur(24px) saturate(180%); border:1px solid rgba(255,255,255,0.5)">
      <span class="text-sm">📍</span><span>定位</span>
    </button>
    <button v-if="!pageLoading && userLocation && isMobile" @click="centerOnUser"
            class="fixed right-3 z-[1000] flex items-center gap-1 py-1.5 px-3 rounded-full text-[10px] font-semibold text-gray-600 cursor-pointer active:scale-95 shadow-md max-sm:bottom-[130px]"
            style="background:rgba(255,255,255,0.9); backdrop-filter:blur(24px) saturate(180%); border:1px solid rgba(255,255,255,0.5)">
      <span class="text-sm">📍</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Map as LeafletMap, TileLayer as LeafletTileLayer } from 'leaflet'
import { ref, computed, onMounted, nextTick } from 'vue'

// ---- Types ----
interface WeatherData {
  temperature: number; description: string; icon: string
  rain1h: number; rain3h: number; humidity: number; windSpeed: number
  cityName: string; source: 'api' | 'mock'
}
interface HourlyPoint {
  dt: number; rain: number; time: string
  temperature: number; humidity: number; windSpeed: number
  description: string
  source: 'history' | 'forecast'
}

// ---- State ----
const mapContainer = ref<HTMLDivElement>()
const chartScrollRef = ref<HTMLDivElement>()
const coords = ref<{ latitude: number; longitude: number } | null>(null)
const userLocation = ref<{ latitude: number; longitude: number } | null>(null)
const weather = ref<WeatherData | null>(null)
const hourlyData = ref<HourlyPoint[]>([])
const selectedHourIndex = ref(-1)
const pageLoading = ref(true)
const loadingMessage = ref('正在获取你的位置…')
const errorMsg = ref('')
const refreshing = ref(false)
const showHeatmap = ref(false)
const isMobile = ref(false)

let mapInstance: LeafletMap | null = null
let heatmapLayer: LeafletTileLayer | null = null

// ---- Computed ----
const selectedHour = computed(() => selectedHourIndex.value >= 0 ? hourlyData.value[selectedHourIndex.value] : null)
const selectedHourLabel = computed(() => selectedHour.value ? selectedHour.value.time : '')
const selectedHourRain = computed(() => selectedHour.value ? selectedHour.value.rain.toFixed(1) : '')

// 显示的数据：有选中点时用选中点，否则用当前天气
const displayWeather = computed(() => {
  if (selectedHour.value) {
    return {
      rain: selectedHour.value.rain.toFixed(1),
      source: selectedHour.value.source
    }
  }
  if (!weather.value) return null
  return { rain: weather.value.rain1h.toFixed(1), source: weather.value.source }
})

const displayItems = computed(() => {
  if (selectedHour.value) {
    return [
      { value: `${selectedHour.value.temperature}°C`, label: '温度' },
      { value: `${selectedHour.value.humidity}%`, label: '湿度' },
      { value: `${selectedHour.value.windSpeed}m/s`, label: '风速' },
      { value: selectedHour.value.description, label: '天气' },
    ]
  }
  if (!weather.value) return []
  return [
    { value: `${weather.value.temperature}°C`, label: '温度' },
    { value: `${weather.value.humidity}%`, label: '湿度' },
    { value: `${weather.value.windSpeed}m/s`, label: '风速' },
    { value: weather.value.description, label: '天气' },
  ]
})

const currentTimeIndex = computed(() => {
  const now = Math.floor(Date.now() / 1000)
  let closest = 0; let minDiff = Infinity
  for (let i = 0; i < hourlyData.value.length; i++) {
    const diff = Math.abs(hourlyData.value[i].dt - now)
    if (diff < minDiff) { minDiff = diff; closest = i }
  }
  return closest
})

// SVG
const padding = { top: 14, bottom: 22, left: 0, right: 0 }
const chartWidth = 380
const chartHeight = 68
const innerW = chartWidth - padding.left - padding.right
const innerH = chartHeight - padding.top - padding.bottom

const gridLines = computed(() => Array.from({ length: Math.min(hourlyData.value.length, 11) }))

const maxRain = computed(() => Math.max(Math.max(...hourlyData.value.map(h => h.rain), 0.5), 0.5))

const historyPoints = computed(() => hourlyData.value.filter(h => h.source === 'history'))
const forecastPoints = computed(() => hourlyData.value.filter(h => h.source === 'forecast'))

function makePath(data: HourlyPoint[]): string {
  if (data.length < 2) return ''
  const maxR = maxRain.value
  return data.map((h, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * innerW
    const y = padding.top + innerH - (h.rain / maxR) * (innerH - 4)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}
function makeArea(data: HourlyPoint[]): string {
  if (data.length < 2) return ''
  const maxR = maxRain.value
  const bottom = padding.top + innerH
  const top = data.map((h, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * innerW
    const y = padding.top + innerH - (h.rain / maxR) * (innerH - 4)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const last = data[data.length - 1]
  const first = data[0]
  const lastX = padding.left + (1) * innerW
  const firstX = padding.left + 0
  return `${top} L${lastX},${bottom} L${firstX},${bottom} Z`
}
const historyPath = computed(() => makePath(historyPoints.value))
const historyAreaPath = computed(() => makeArea(historyPoints.value))
const forecastPath = computed(() => makePath(forecastPoints.value))
const forecastAreaPath = computed(() => makeArea(forecastPoints.value))

const plottedPoints = computed(() => {
  const data = hourlyData.value
  if (data.length === 0) return []
  const maxR = maxRain.value
  return data.map((h, i) => ({
    x: padding.left + (i / Math.max(data.length - 1, 1)) * innerW,
    y: padding.top + innerH - (h.rain / maxR) * (innerH - 4),
    rain: h.rain, time: h.time, isHistory: h.source === 'history'
  }))
})

function barHeight(r: number) { return Math.max(r / maxRain.value * 48, 2) }
function barColor(r: number) {
  if (r === 0) return '#d1d5db'
  if (r < 1) return '#93c5fd'
  if (r < 3) return '#60a5fa'
  if (r < 6) return '#f59e0b'
  return '#ef4444'
}
function formatHour(ts: number) {
  const d = new Date(ts * 1000)
  return `${d.getHours().toString().padStart(2, '0')}:00`
}

function selectPoint(i: number) {
  selectedHourIndex.value = selectedHourIndex.value === i ? -1 : i
}
function clearSelection() { selectedHourIndex.value = -1 }

// ---- Geolocation ----
function getPosition(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('浏览器不支持地理定位')); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => {
        const msgs: Record<number, string> = { [err.PERMISSION_DENIED]: '定位被拒绝', [err.POSITION_UNAVAILABLE]: '无法获取位置信息', [err.TIMEOUT]: '定位请求超时' }
        reject(new Error(msgs[err.code] || '定位失败'))
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  })
}

const config = useRuntimeConfig()
const apiKey = config.public.openWeatherApiKey as string | undefined

// ---- Mock helpers ----
function seedValue(lat: number, lng: number, dt: number): number {
  const s = Math.sin(lat * lng * 0.1 + dt * 0.001) * 100
  return s
}

function getMockWeather(lat: number, lng: number): WeatherData {
  const s = seedValue(lat, lng, Math.floor(Date.now() / 1000))
  const mockRain = Math.abs(Math.round((s % 5) * 10)) / 10
  return {
    temperature: Math.round(22 + (s % 10)), description: '小雨', icon: '09d',
    rain1h: mockRain, rain3h: Math.round(mockRain * 2.5 * 10) / 10,
    humidity: Math.round(65 + Math.abs(s % 30)),
    windSpeed: Math.round((3 + Math.abs(s % 5)) * 10) / 10,
    cityName: '当前位置', source: 'mock'
  }
}

function generateMockHourly(lat: number, lng: number): HourlyPoint[] {
  const now = Math.floor(Date.now() / 1000)
  const base = Math.floor(now / 10800) * 10800
  const result: HourlyPoint[] = []
  for (let i = -5; i <= 4; i++) {
    const dt = base + i * 10800
    const s = seedValue(lat, lng, dt)
    const isHistory = dt <= now
    result.push({
      dt,
      rain: Math.max(0, Math.round(Math.abs((s % 7)) * 10) / 10),
      time: formatHour(dt),
      temperature: Math.round(22 + (s % 10)),
      humidity: Math.round(65 + Math.abs(s % 30)),
      windSpeed: Math.round((3 + Math.abs(s % 5)) * 10) / 10,
      description: Math.abs(s % 5) > 2 ? '小雨' : '阴',
      source: isHistory ? 'history' : 'forecast'
    })
  }
  return result
}

// ---- Fetch ----
async function fetchWeather(lat: number, lng: number): Promise<WeatherData> {
  if (!apiKey || apiKey === 'your_api_key_here') {
    await new Promise(r => setTimeout(r, 300))
    return getMockWeather(lat, lng)
  }
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&lang=zh_cn`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API 请求失败 (${res.status})`)
  const data = await res.json()
  return {
    temperature: Math.round(data.main?.temp ?? 0), description: data.weather?.[0]?.description ?? '未知',
    icon: data.weather?.[0]?.icon ?? '01d', rain1h: data.rain?.['1h'] ?? 0, rain3h: data.rain?.['3h'] ?? 0,
    humidity: data.main?.humidity ?? 0, windSpeed: data.wind?.speed ?? 0,
    cityName: data.name ?? '未知位置', source: 'api'
  }
}

async function fetchHourlyForecast(lat: number, lng: number): Promise<HourlyPoint[]> {
  // 无 API Key → 全模拟
  if (!apiKey || apiKey === 'your_api_key_here') {
    return generateMockHourly(lat, lng)
  }

  const now = Math.floor(Date.now() / 1000)
  const base = Math.floor(now / 10800) * 10800

  // 过去时刻 → 模拟（基于经纬度 seed）
  const result: HourlyPoint[] = []
  for (let i = -5; i < 0; i++) {
    const dt = base + i * 10800
    const s = seedValue(lat, lng, dt)
    result.push({
      dt, rain: Math.max(0, Math.round(Math.abs((s % 7)) * 10) / 10),
      time: formatHour(dt),
      temperature: Math.round(22 + (s % 10)),
      humidity: Math.round(65 + Math.abs(s % 30)),
      windSpeed: Math.round((3 + Math.abs(s % 5)) * 10) / 10,
      description: Math.abs(s % 5) > 2 ? '小雨' : '阴',
      source: 'history'
    })
  }

  // 未来时刻 → 真实预报
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&lang=zh_cn&cnt=5`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`预报 API 请求失败 (${res.status})`)
  const data = await res.json()
  for (const item of data.list || []) {
    result.push({
      dt: item.dt,
      rain: (item.rain?.['3h'] ?? 0) / 3,
      time: formatHour(item.dt),
      temperature: Math.round(item.main?.temp ?? 22),
      humidity: item.main?.humidity ?? 65,
      windSpeed: item.wind?.speed ?? 3,
      description: item.weather?.[0]?.description ?? '未知',
      source: 'forecast'
    })
  }

  return result
}

// ---- Heatmap ----
async function toggleHeatmap() {
  const leaflet = await import('leaflet')
  showHeatmap.value = !showHeatmap.value
  if (showHeatmap.value && !heatmapLayer && apiKey && apiKey !== 'your_api_key_here') {
    heatmapLayer = leaflet.default!.tileLayer(
      `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${apiKey}`,
      { opacity: 1.0, attribution: '&copy; OpenWeatherMap' }
    ).addTo(mapInstance!)
    setTimeout(() => {
      mapInstance?.getContainer()?.querySelectorAll('.leaflet-tile-pane img[src*="precipitation"]')
        .forEach(el => { (el as HTMLElement).style.mixBlendMode = 'multiply' })
    }, 100)
  } else if (showHeatmap.value && heatmapLayer) { heatmapLayer.addTo(mapInstance!) }
  else if (heatmapLayer) { heatmapLayer.remove() }
}

// ---- Map ----
async function initMap(lat: number, lng: number) {
  const leaflet = await import('leaflet')
  delete (leaflet.default!.Icon.Default.prototype as any)._getIconUrl
  leaflet.default!.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
  if (mapInstance) { mapInstance.setView([lat, lng], 13); return }
  mapInstance = leaflet.default!.map('map', { center: [lat, lng], zoom: 13, zoomControl: false })
  leaflet.default!.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap', maxZoom: 19
  }).addTo(mapInstance)
  mapInstance.on('moveend', async () => {
    const c = mapInstance!.getCenter()
    coords.value = { latitude: c.lat, longitude: c.lng }
    try {
      const [w, h] = await Promise.all([fetchWeather(c.lat, c.lng), fetchHourlyForecast(c.lat, c.lng)])
      weather.value = w; hourlyData.value = h; selectedHourIndex.value = -1
    } catch (e) { errorMsg.value = e instanceof Error ? e.message : '获取数据失败' }
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
  try {
    const [w, h] = await Promise.all([fetchWeather(coords.value.latitude, coords.value.longitude), fetchHourlyForecast(coords.value.latitude, coords.value.longitude)])
    weather.value = w; hourlyData.value = h; selectedHourIndex.value = -1
  } catch (e) { errorMsg.value = e instanceof Error ? e.message : '获取数据失败' }
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
  loadingMessage.value = '正在加载数据…'
  await nextTick(); await initMap(coords.value!.latitude, coords.value!.longitude)
  try {
    const [w, h] = await Promise.all([fetchWeather(coords.value!.latitude, coords.value!.longitude), fetchHourlyForecast(coords.value!.latitude, coords.value!.longitude)])
    weather.value = w; hourlyData.value = h
  } catch (e) { errorMsg.value = e instanceof Error ? e.message : '获取数据失败' }
  pageLoading.value = false
})
</script>

<style>
@keyframes pin-bounce {
  0% { transform: translate(-50%,-100%) scale(0.5); opacity: 0; }
  65% { transform: translate(-50%,-100%) scale(1.06); }
  100% { transform: translate(-50%,-100%) scale(1); opacity: 1; }
}
.switch-track-sm { position: relative; flex-shrink: 0; width: 32px; height: 18px; border-radius: 9px; background: #d1d5db; transition: background 0.3s cubic-bezier(0.4,0,0.2,1); cursor: pointer; }
.switch-track-sm.active { background: #34c759; }
.switch-knob-sm { position: absolute; width: 14px; height: 14px; border-radius: 50%; background: white; top: 2px; left: 2px; transition: transform 0.3s cubic-bezier(0.4,0,0.2,1); box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
.switch-track-sm.active .switch-knob-sm { transform: translateX(14px); }
.slide-left-enter-active, .slide-left-leave-active { transition: all 0.35s cubic-bezier(0.4,0,0.2,1); }
.slide-left-enter-from, .slide-left-leave-to { opacity: 0; transform: translateY(-50%) translateX(-20px); }
.slide-left-enter-to, .slide-left-leave-from { opacity: 1; transform: translateY(-50%) translateX(0); }
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.35s cubic-bezier(0.4,0,0.2,1); }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-100%) translateX(-50%); }
.slide-down-enter-to, .slide-down-leave-from { opacity: 1; transform: translateY(0) translateX(-50%); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
::-webkit-scrollbar { width: 2px; height: 2px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 1px; }
</style>
