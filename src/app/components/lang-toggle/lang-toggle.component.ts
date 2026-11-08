import { ChangeDetectionStrategy, Component, computed } from '@angular/core';

import { Lang, LanguageService } from '../../core/i18n/language.service';
import { LanguageTransitionService } from '../../core/i18n/language-transition.service';

@Component({
  selector: 'app-lang-toggle',
  standalone: true,
  templateUrl: './lang-toggle.component.html',
  styleUrl: './lang-toggle.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LangToggleComponent {
  /** The language the button switches TO. The visible label is written in it. */
  readonly targetLang = computed<Lang>(() =>
    this.i18n.lang() === 'ar' ? 'en' : 'ar',
  );

  constructor(
    readonly i18n: LanguageService,
    private transition: LanguageTransitionService,
  ) {}

  switch(): void {
    this.transition.toggle();
  }
}
