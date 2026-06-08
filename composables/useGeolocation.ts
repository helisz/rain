export function useGeolocation() {
  const coords = ref<{ latitude: number; longitude: number } | null>(null)
  const error = ref<string | null>(null)
  const loading = ref(false)

  function getCurrentPosition(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const msg = '浏览器不支持地理定位功能'
        error.value = msg
        reject(new Error(msg))
        return
      }

      loading.value = true
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
          coords.value = loc
          loading.value = false
          resolve(loc)
        },
        (err) => {
          let msg = '获取位置失败'
          switch (err.code) {
            case err.PERMISSION_DENIED:
              msg = '用户拒绝了定位请求'
              break
            case err.POSITION_UNAVAILABLE:
              msg = '无法获取位置信息'
              break
            case err.TIMEOUT:
              msg = '定位请求超时'
              break
          }
          error.value = msg
          loading.value = false
          reject(new Error(msg))
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      )
    })
  }

  return {
    coords,
    error,
    loading,
    getCurrentPosition
  }
}
