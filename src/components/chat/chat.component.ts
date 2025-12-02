import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../../services/gemini.service';
import { Message, TherapyMode, TherapyModeDetails } from '../../models/chat.model';
import { ThemeService, DisplayMode } from '../../services/theme.service';
import { Theme } from '../../models/theme.model';
import { AuthService } from '../../services/auth.service';
import { TextareaAutoresizeDirective } from '../../directives/textarea-autoresize.directive';
import { MoodService } from '../../services/mood.service';
import { Mood } from '../../models/mood.model';
import { MarkdownPipe } from '../../pipes/markdown.pipe';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, TextareaAutoresizeDirective, MarkdownPipe],
  templateUrl: './chat.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComponent {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  @ViewChild('textInput') private textInput!: ElementRef<HTMLTextAreaElement>;

  private geminiService = inject(GeminiService);
  themeService = inject(ThemeService);
  authService = inject(AuthService);
  moodService = inject(MoodService);

  // Consume state directly from services
  messages = this.geminiService.messages;
  isLoading = this.geminiService.isLoading;
  streamingResponse = this.geminiService.streamingResponse;
  currentUser = this.authService.currentUser;
  moodHistory = this.moodService.moods;

  // Component-specific state
  userInput = signal<string>('');
  showCrisisModal = signal<boolean>(false);
  showSettingsModal = signal<boolean>(false);
  showModeSelector = signal<boolean>(false);
  currentMode = signal<TherapyMode>('general');
  settingsTab = signal<'theme' | 'profile' | 'mood'>('theme');

  // Auth form state
  authScreen = signal<'signIn' | 'signUp' | 'forgotPassword'>('signIn');
  authEmail = signal('');
  authPassword = signal('');
  confirmPassword = signal('');
  authError = signal<string | null>(null);
  authLoading = signal(false);
  showPassword = signal(false);
  resetSent = signal(false);

  // Computed for password validation
  passwordsMatch = computed(() => this.authPassword() === this.confirmPassword());
  
  // Profile state
  uploadingAvatar = signal(false);
  avatarError = signal<string | null>(null);
  userAvatarUrl = computed(() => this.currentUser()?.user_metadata?.['avatar_url'] ?? null);

  // Mood Modal State
  showMoodModal = signal(false);
  currentRating = signal(0);
  selectedEmotions = signal<string[]>([]);
  moodNote = signal('');
  
  // Message interaction state
  hoveredMessageId = signal<string | null>(null);
  copiedMessageId = signal<string | null>(null);
  editingMessage = signal<{ id: string, content: string } | null>(null);

  // Input area state
  charCount = computed(() => this.userInput().length);
  showCharCount = computed(() => this.charCount() > 1800);

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
    effect(() => {
      if ((this.messages().length > 0 || this.streamingResponse()) && !this.editingMessage()) {
        this.scrollToBottom();
      }
    });

    effect(() => {
      if(this.currentUser()) {
        this.moodService.loadMoods();
      }
    });
  }

  async handleAuth(): Promise<void> {
    this.authLoading.set(true);
    this.authError.set(null);
    this.resetSent.set(false);

    try {
      switch (this.authScreen()) {
        case 'signIn':
          await this.authService.signIn(this.authEmail(), this.authPassword());
          break;
        case 'signUp':
          if (!this.passwordsMatch()) {
            throw new Error("Passwords do not match.");
          }
          if(this.authPassword().length < 6) {
             throw new Error("Password must be at least 6 characters.");
          }
          await this.authService.signUp(this.authEmail(), this.authPassword());
          break;
        case 'forgotPassword':
          await this.authService.sendPasswordResetEmail(this.authEmail());
          this.resetSent.set(true);
          break;
      }
    } catch (error: any) {
      this.authError.set(error.message || 'An unknown error occurred.');
    } finally {
      this.authLoading.set(false);
    }
  }

  switchAuthView(view: 'signIn' | 'signUp' | 'forgotPassword'): void {
    this.authScreen.set(view);
    this.authEmail.set('');
    this.authPassword.set('');
    this.confirmPassword.set('');
    this.authError.set(null);
    this.resetSent.set(false);
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

    this.editingMessage.set(null);
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

  toggleDisplayMode(mode: DisplayMode): void {
    this.themeService.setDisplayMode(mode);
  }

  async handleAvatarUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadingAvatar.set(true);
    this.avatarError.set(null);
    try {
      await this.authService.uploadAvatar(file);
    } catch (error: any) {
      this.avatarError.set(error.message);
    } finally {
      this.uploadingAvatar.set(false);
    }
  }
  
  formatText(format: 'bold' | 'italic' | 'list'): void {
    const textarea = this.textInput.nativeElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = this.userInput().substring(start, end);
    let newText = '';

    switch (format) {
      case 'bold':
        newText = `**${selectedText}**`;
        break;
      case 'italic':
        newText = `*${selectedText}*`;
        break;
      case 'list':
        const lines = selectedText.split('\n');
        newText = lines.map(line => `- ${line}`).join('\n');
        break;
    }
    
    const updatedValue = this.userInput().substring(0, start) + newText + this.userInput().substring(end);
    this.userInput.set(updatedValue);
    
    // Focus and set cursor position after update
    setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + newText.length - (format === 'list' ? 0 : selectedText.length);
        textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
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
