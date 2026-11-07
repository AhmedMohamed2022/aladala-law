import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ScrollService } from '../../core/scroll.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  readonly year = new Date().getFullYear();

  readonly links = [
    { label: 'من نحن', target: '#about' },
    { label: 'خدماتنا', target: '#services' },
    { label: 'لماذا نحن', target: '#why' },
    { label: 'تواصل معنا', target: '#contact' },
  ];

  constructor(private scroll: ScrollService) {}

  goTo(event: Event, target: string): void {
    event.preventDefault();
    this.scroll.scrollTo(target, target === '#hero' ? 0 : -70);
  }
}
