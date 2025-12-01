import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ChatComponent } from './components/chat/chat.component';
import { ThemeService } from './services/theme.service';
import { SupabaseService } from './services/supabase.service';
import { AuthService } from './services/auth.service';
import { MoodService } from './services/mood.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChatComponent]
})
export class AppComponent {
  // Inject services to ensure they're initialized on startup
  private themeService = inject(ThemeService);
  private supabaseService = inject(SupabaseService);
  private authService = inject(AuthService);
  private moodService = inject(MoodService);
}