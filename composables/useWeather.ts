export interface WeatherData {
  /** 温度 (℃) */
  temperature: number
  /** 天气描述 */
  description: string
  /** 天气图标代码 */
  icon: string
  /** 1小时降雨量 (mm) */
  rain1h: number
  /** 3小时降雨量 (mm) */
  rain3h: number
  /** 湿度 (%) */
  humidity: number
  /** 风速 (m/s) */
  windSpeed: number
  /** 城市名 */
  cityName: string
  /** 数据来源 */
  source: 'api' | 'mock'
}

/**
 * 获取模拟降雨数据（当 API Key 未配置时使用）
 */
function getMockWeather(lat: number, lng: number): WeatherData {
  // 使用经纬度生成一个伪随机但稳定的降雨量
  const seed = Math.sin(lat * lng * 0.1) * 100
  const mockRain = Math.abs(Math.round((seed % 5) * 10)) / 10

  return {
    temperature: Math.round(22 + (seed % 10)),
    description: '模拟数据 — 小雨',
    icon: '09d',
    rain1h: mockRain,
    rain3h: Math.round(mockRain * 2.5 * 10) / 10,
    humidity: Math.round(65 + Math.abs(seed % 30)),
    windSpeed: Math.round((3 + Math.abs(seed % 5)) * 10) / 10,
    cityName: '当前位置',
    source: 'mock'
  }
}

export function useWeather() {
  const config = useRuntimeConfig()
  const apiKey = config.public.openWeatherApiKey as string | undefined

  const weatherData = ref<WeatherData | null>(null)
  const error = ref<string | null>(null)
  const loading = ref(false)

  /**
   * 获取指定位置的天气（含降雨量）
   */
  async function fetchWeather(lat: number, lng: number): Promise<WeatherData> {
    loading.value = true
    error.value = null

    // 如果没配 API Key，使用模拟数据
    if (!apiKey || apiKey === 'your_api_key_here') {
      const mock = getMockWeather(lat, lng)
      weatherData.value = mock
      loading.value = false
      return mock
    }

    try {
      // OpenWeatherMap 当前天气 API
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&lang=zh_cn`
      const res = await fetch(url)

      if (!res.ok) {
        throw new Error(`API 请求失败 (${res.status})`)
      }

      const data = await res.json()

      const result: WeatherData = {
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

      weatherData.value = result
      loading.value = false
      return result
    } catch (e) {
      const msg = e instanceof Error ? e.message : '获取天气数据失败'
      error.value = msg
      loading.value = false
      throw e
    }
  }

  return {
    weatherData,
    error,
    loading,
    fetchWeather
  }
}
