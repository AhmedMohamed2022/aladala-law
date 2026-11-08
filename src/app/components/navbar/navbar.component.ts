import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  ViewChild,
  signal,
} from '@angular/core';
import { gsap } from 'gsap';
import { ScrollService } from '../../core/scroll.service';
import { LanguageService } from '../../core/i18n/language.service';
import { LanguageTransitionService } from '../../core/i18n/language-transition.service';
import { LangToggleComponent } from '../lang-toggle/lang-toggle.component';

interface NavLink {
  /** Key into the dictionary: i18n.t().nav[key] */
  key: 'about' | 'services' | 'why' | 'contact';
  target: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [LangToggleComponent],

  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent implements AfterViewInit, OnDestroy {
  @ViewChild('header', { static: true }) headerRef!: ElementRef<HTMLElement>;

  readonly menuOpen = signal(false);

  readonly links: NavLink[] = [
    { key: 'about', target: '#about' },
    { key: 'services', target: '#services' },
    { key: 'why', target: '#why' },
    { key: 'contact', target: '#contact' },
  ];

  private ctx?: gsap.Context;

  constructor(
    private scroll: ScrollService,
    private zone: NgZone,
    readonly i18n: LanguageService,
    readonly transition: LanguageTransitionService,
  ) {}

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.onScroll, { passive: true });
      this.onScroll();

      // Entrance animation (skipped when reduced motion is on)
      if (!this.scroll.reducedMotion) {
        this.ctx = gsap.context(() => {
          gsap.from(this.headerRef.nativeElement, {
            y: -40,
            opacity: 0,
            duration: 1,
            delay: 0.3,
            ease: 'power3.out',
            clearProps: 'transform,opacity',
          });
        }, this.headerRef.nativeElement);
      }
    });
  }

  // Toggle the "scrolled" look directly on the DOM (no change detection needed)
  private onScroll = (): void => {
    this.headerRef.nativeElement.classList.toggle(
      'scrolled',
      window.scrollY > 40,
    );
  };

  goTo(event: Event, target: string): void {
    event.preventDefault();
    this.closeMenu();
    // Small delay so the menu starts closing and Lenis is running again
    setTimeout(() => this.scroll.scrollTo(target), 50);
  }

  toggleMenu(): void {
    this.menuOpen() ? this.closeMenu() : this.openMenu();
  }

  openMenu(): void {
    this.menuOpen.set(true);
    this.scroll.stop();
  }

  closeMenu(): void {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    this.scroll.start();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMenu();
  }

  // Close the menu if the viewport grows to desktop size
  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 900) this.closeMenu();
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onScroll);
    this.ctx?.revert();
    if (this.menuOpen()) this.scroll.start();
  }
}
