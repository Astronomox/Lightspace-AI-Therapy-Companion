import { Injectable, signal } from '@angular/core';
import { Theme } from '../models/theme.model';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly THEME_KEY = 'lightspace-theme';

  readonly themes = signal<Theme[]>([
    { id: 'default', name: 'Aurora Blue', class: 'theme-default', color: 'rgb(96 165 250)' },
    { id: 'sunset', name: 'Golden Hour', class: 'theme-sunset', color: 'rgb(251 146 60)' },
    { id: 'forest', name: 'Emerald Grove', class: 'theme-forest', color: 'rgb(45 212 191)' },
    { id: 'lavender', name: 'Twilight Haze', class: 'theme-lavender', color: 'rgb(167 139 250)' },
  ]);

  readonly currentTheme = signal<Theme>(this.themes()[0]);

  constructor() {
    this.loadTheme();
  }

  setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
    localStorage.setItem(this.THEME_KEY, theme.class);
    this.applyTheme(theme.class);
  }

  private loadTheme(): void {
    const savedThemeClass = localStorage.getItem(this.THEME_KEY) || 'theme-default';
    const savedTheme = this.themes().find(t => t.class === savedThemeClass);
    if (savedTheme) {
      this.currentTheme.set(savedTheme);
    }
    this.applyTheme(savedThemeClass);
  }

  private applyTheme(themeClass: string): void {
    document.documentElement.className = themeClass;
  }
}