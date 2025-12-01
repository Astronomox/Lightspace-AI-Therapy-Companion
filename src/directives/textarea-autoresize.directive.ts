import { Directive, ElementRef, HostListener, OnInit } from '@angular/core';

@Directive({
  selector: 'textarea[appTextareaAutoresize]',
  standalone: true,
})
export class TextareaAutoresizeDirective implements OnInit {
  constructor(private elementRef: ElementRef) {}

  @HostListener(':input')
  onInput(): void {
    this.resize();
  }

  ngOnInit(): void {
    // Initial resize
    setTimeout(() => this.resize());
  }

  private resize(): void {
    const textarea = this.elementRef.nativeElement as HTMLTextAreaElement;
    textarea.style.height = 'auto'; // Reset height
    textarea.style.height = `${textarea.scrollHeight}px`; // Set to scroll height
  }
}
