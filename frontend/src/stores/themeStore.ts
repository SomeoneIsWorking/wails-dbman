import { ref, watch } from "vue";
import { defineStore } from "pinia";

export type Theme = 'light' | 'dark';

export const useThemeStore = defineStore("theme", () => {
  const theme = ref<Theme>('light');

  // Load theme from localStorage on init
  const savedTheme = localStorage.getItem('theme') as Theme;
  if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
    theme.value = savedTheme;
  } else {
    // Default to system preference
    theme.value = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  // Apply theme immediately
  const applyTheme = (newTheme: Theme) => {
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Apply initial theme
  applyTheme(theme.value);

  // Watch for changes and save to localStorage
  watch(theme, (newTheme) => {
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  });

  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light';
  };

  const setTheme = (newTheme: Theme) => {
    theme.value = newTheme;
  };

  return {
    theme,
    toggleTheme,
    setTheme,
  };
});