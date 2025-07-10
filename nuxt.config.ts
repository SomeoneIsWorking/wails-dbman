import { defineNuxtConfig } from "nuxt/config";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ["@nuxt/ui", "@nuxt/icon", "nuxt-monaco-editor"],
  devtools: { enabled: true },
  css: ["~/app.css"],
  compatibilityDate: "2025-03-22",
});
