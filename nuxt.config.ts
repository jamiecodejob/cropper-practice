// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: [
    "@nuxt/content",
    "@nuxt/eslint",
    "@nuxt/image",
    "@nuxt/scripts",
    "@nuxt/test-utils",
    "@nuxt/ui",
  ],
  vue: {
    compilerOptions: {
      // 告訴 Vue 這些標籤是自定義元素，不要當作 Vue component 報錯
      isCustomElement: (tag) => tag.startsWith("cropper-"), // 例如 cropper-canvas, cropper-image
    },
  },
});
