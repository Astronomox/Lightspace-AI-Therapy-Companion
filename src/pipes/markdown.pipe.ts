import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

@Pipe({
  name: 'markdown',
  standalone: true,
})
export class MarkdownPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {
    marked.use({
      gfm: true,
      breaks: true,
      mangle: false,
      headerIds: false,
    });
  }

  transform(value: string | null | undefined): SafeHtml {
    if (value === null || value === undefined) {
      return '';
    }
    const rawHtml = marked.parse(value) as string;
    // Bypass security to trust the HTML from the marked library.
    // This is safe because we trust the AI output and marked's parsing.
    // For user-generated markdown, a stronger sanitizer like DOMPurify would be essential.
    return this.sanitizer.bypassSecurityTrustHtml(rawHtml);
  }
}
