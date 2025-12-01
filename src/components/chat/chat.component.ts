import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../../services/gemini.service';
import { Message, TherapyMode, TherapyModeDetails } from '../../models/chat.model';
import { ThemeService } from '../../services/theme.service';
import { Theme } from '../../models/theme.model';
import { AuthService } from '../../services/auth.service';
import { TextareaAutoresizeDirective } from '../../directives/textarea-autoresize.directive';
import { MoodService } from '../../services/mood.service';
import { Mood } from '../../models/mood.model';

@Component({
  selector: 'app-chat',
  imports: [CommonModule, FormsModule, TextareaAutoresizeDirective],
  templateUrl: './chat.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComponent {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;

  private geminiService = inject(GeminiService);
  themeService = inject(ThemeService);
  authService = inject(AuthService);
  moodService = inject(MoodService);

  // Consume state directly from services
  messages = this.geminiService.messages;
  isLoading = this.geminiService.isLoading;
  currentUser = this.authService.currentUser;
  moodHistory = this.moodService.moods;

  // Component-specific state
  userInput = signal<string>('');
  showCrisisModal = signal<boolean>(false);
  showSettingsModal = signal<boolean>(false);
  showModeSelector = signal<boolean>(false);
  currentMode = signal<TherapyMode>('general');
  settingsTab = signal<'theme' | 'account' | 'mood'>('theme');

  // Auth form state
  isSigningUp = signal(false);
  authEmail = signal('');
  authPassword = signal('');
  authError = signal<string | null>(null);
  authLoading = signal(false);
  showPassword = signal(false);

  // Mood Modal State
  showMoodModal = signal(false);
  currentRating = signal(0);
  selectedEmotions = signal<string[]>([]);
  moodNote = signal('');
  
  // Message interaction state
  hoveredMessageId = signal<string | null>(null);
  copiedMessageId = signal<string | null>(null);
  editingMessage = signal<{ id: string, content: string } | null>(null);

  therapyModes: TherapyModeDetails[] = [
    { id: 'general', label: 'General', description: 'A flexible, adaptive conversation.', icon: '💬' },
    { id: 'venting', label: 'Venting', description: 'A safe space to release emotions without judgment.', icon: '💨' },
    { id: 'problem-solving', label: 'Problem-Solving', description: 'Structured exploration of challenges.', icon: '🧩' },
    { id: 'gratitude', label: 'Gratitude', description: 'Focus on positive reflections and small wins.', icon: '🙏' },
    { id: 'anxiety', label: 'Anxiety', description: 'Techniques to manage and reduce anxiety.', icon: '🧘' },
  ];
  
  readonly currentModeIcon = computed(() => this.therapyModes.find(m => m.id === this.currentMode())?.icon);

  readonly commonEmotions = [
    'Happy', 'Sad', 'Anxious', 'Excited', 'Grateful', 'Angry', 'Tired', 'Stressed', 'Calm', 'Hopeful', 'Lonely', 'Motivated'
  ];

  constructor() {
    // Effect to scroll to the bottom when new messages are added
    effect(() => {
      if (this.messages().length > 0 && !this.editingMessage()) {
        this.scrollToBottom();
      }
    });

    // Effect to load mood history when user logs in
    effect(() => {
      if(this.currentUser()) {
        this.moodService.loadMoods();
      }
    });
  }

  async handleAuth(): Promise<void> {
    this.authLoading.set(true);
    this.authError.set(null);
    try {
      if (this.isSigningUp()) {
        await this.authService.signUp(this.authEmail(), this.authPassword());
      } else {
        await this.authService.signIn(this.authEmail(), this.authPassword());
      }
    } catch (error: any) {
      this.authError.set(error.message || 'An unknown error occurred.');
    } finally {
      this.authLoading.set(false);
    }
  }

  async signOut(): Promise<void> {
    await this.authService.signOut();
    this.toggleSettingsModal(false);
  }

  async sendMessage(): Promise<void> {
    const content = this.userInput().trim();
    if (!content || this.isLoading()) {
      return;
    }

    const prompt = this.userInput();
    this.userInput.set('');
    this.scrollToBottom(); // scroll immediately for user message

    await this.geminiService.sendMessage(prompt);
  }
  
  copyMessage(content: string, id: string): void {
    navigator.clipboard.writeText(content).then(() => {
      this.copiedMessageId.set(id);
      setTimeout(() => this.copiedMessageId.set(null), 2000);
    });
  }

  startEditing(message: Message): void {
    this.editingMessage.set({ id: message.id, content: message.content });
  }

  cancelEditing(): void {
    this.editingMessage.set(null);
  }

  async saveEdit(): Promise<void> {
    const editState = this.editingMessage();
    if (!editState || editState.content.trim() === '') return;

    this.editingMessage.set(null); // Optimistically close editor
    await this.geminiService.resubmitConversation(editState.id, editState.content.trim());
  }

  changeMode(mode: TherapyMode): void {
    if (this.currentMode() !== mode) {
      this.currentMode.set(mode);
      this.geminiService.setMode(mode);
    }
    this.showModeSelector.set(false);
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
  
  toggleCrisisModal(show: boolean): void {
    this.showCrisisModal.set(show);
  }
  
  toggleSettingsModal(show: boolean): void {
    this.showSettingsModal.set(show);
  }

  toggleMoodModal(show: boolean): void {
    if (show) {
      this.resetMoodForm();
    }
    this.showMoodModal.set(show);
  }

  async saveMood(): Promise<void> {
    if (this.currentRating() === 0) return;
    // FIX: Use snake_case properties 'user_id' and 'created_at' in Omit to match the Mood model.
    const moodEntry: Omit<Mood, 'id' | 'user_id' | 'created_at'> = {
      rating: this.currentRating(),
      emotions: this.selectedEmotions(),
      note: this.moodNote().trim()
    };
    await this.moodService.addMood(moodEntry);
    this.toggleMoodModal(false);
  }

  toggleEmotion(emotion: string): void {
    this.selectedEmotions.update(emotions => {
      const index = emotions.indexOf(emotion);
      if (index > -1) {
        return emotions.filter(e => e !== emotion);
      } else {
        return [...emotions, emotion];
      }
    });
  }

  getMoodEmoji(rating: number): string {
    switch (rating) {
      case 1: return '😞';
      case 2: return '😟';
      case 3: return '😐';
      case 4: return '🙂';
      case 5: return '😄';
      default: return '';
    }
  }

  private resetMoodForm(): void {
    this.currentRating.set(0);
    this.selectedEmotions.set([]);
    this.moodNote.set('');
  }

  selectTheme(theme: Theme): void {
    this.themeService.setTheme(theme);
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      try {
        if (this.chatContainer?.nativeElement) {
          this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
        }
      } catch (err) {
        console.error('Could not scroll to bottom:', err);
      }
    }, 0);
  }
}