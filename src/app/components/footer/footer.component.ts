import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ScrollService } from '../../core/scroll.service';
import { LanguageService } from '../../core/i18n/language.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  readonly year = new Date().getFullYear();

  readonly links: Array<{
    key: 'about' | 'services' | 'why' | 'contact';
    target: string;
  }> = [
    { key: 'about', target: '#about' },
    { key: 'services', target: '#services' },
    { key: 'why', target: '#why' },
    { key: 'contact', target: '#contact' },
  ];

  constructor(
    private scroll: ScrollService,
    readonly i18n: LanguageService,
  ) {}

  goTo(event: Event, target: string): void {
    event.preventDefault();
    this.scroll.scrollTo(target, target === '#hero' ? 0 : -70);
  }
}
