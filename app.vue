<template>
  <div id="app">
    <ClientOnly>
      <NuxtPage />
      <template #fallback>
        <div class="ssr-loading">
          <div class="ssr-spinner"></div>
          <p>正在加载应用…</p>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
    'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  overflow: hidden;
}

#__nuxt {
  width: 100%;
  height: 100%;
}

.ssr-loading {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: #f8fafc;
  color: #64748b;
}

.ssr-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
