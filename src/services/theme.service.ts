import { Injectable, signal, effect } from '@angular/core';
import { Theme } from '../models/theme.model';

export type DisplayMode = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly THEME_KEY = 'mindspace-theme';
  private readonly DISPLAY_MODE_KEY = 'mindspace-display-mode';

  readonly themes = signal<Theme[]>([
    { id: 'default', name: 'Aurora Blue', class: 'theme-default', color: 'rgb(96 165 250)' },
    { id: 'sunset', name: 'Golden Hour', class: 'theme-sunset', color: 'rgb(251 146 60)' },
    { id: 'forest', name: 'Emerald Grove', class: 'theme-forest', color: 'rgb(45 212 191)' },
    { id: 'lavender', name: 'Twilight Haze', class: 'theme-lavender', color: 'rgb(167 139 250)' },
  ]);

  readonly currentTheme = signal<Theme>(this.themes()[0]);
  readonly displayMode = signal<DisplayMode>('system');

  private systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  constructor() {
    this.loadPreferences();
    
    effect(() => {
      const theme = this.currentTheme();
      const mode = this.displayMode();
      
      localStorage.setItem(this.THEME_KEY, theme.class);
      localStorage.setItem(this.DISPLAY_MODE_KEY, mode);
      
      this.applyTheme(theme.class, mode);
    });

    // Listen for system changes
    this.systemPrefersDark.addEventListener('change', e => {
      if (this.displayMode() === 'system') {
        this.applyTheme(this.currentTheme().class, 'system');
      }
    });
  }

  setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
  }
  
  setDisplayMode(mode: DisplayMode): void {
    this.displayMode.set(mode);
  }

  private loadPreferences(): void {
    const savedThemeClass = localStorage.getItem(this.THEME_KEY) || 'theme-default';
    const savedDisplayMode = (localStorage.getItem(this.DISPLAY_MODE_KEY) || 'system') as DisplayMode;
    
    const savedTheme = this.themes().find(t => t.class === savedThemeClass);
    if (savedTheme) {
      this.currentTheme.set(savedTheme);
    }
    this.displayMode.set(savedDisplayMode);
    this.applyTheme(savedThemeClass, savedDisplayMode);
  }

  private applyTheme(themeClass: string, mode: DisplayMode): void {
    // Apply color theme class
    document.documentElement.classList.remove(...this.themes().map(t => t.class));
    document.documentElement.classList.add(themeClass);

    // Apply display mode class
    let effectiveMode = mode;
    if (mode === 'system') {
      effectiveMode = this.systemPrefersDark.matches ? 'dark' : 'light';
    }

    if (effectiveMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}