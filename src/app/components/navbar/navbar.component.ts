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

interface NavLink {
  label: string;
  target: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent implements AfterViewInit, OnDestroy {
  @ViewChild('header', { static: true }) headerRef!: ElementRef<HTMLElement>;

  readonly menuOpen = signal(false);

  readonly links: NavLink[] = [
    { label: 'من نحن', target: '#about' },
    { label: 'خدماتنا', target: '#services' },
    { label: 'لماذا نحن', target: '#why' },
    { label: 'تواصل معنا', target: '#contact' },
  ];

  private ctx?: gsap.Context;

  constructor(
    private scroll: ScrollService,
    private zone: NgZone,
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
