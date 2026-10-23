import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Sfx } from '../../../content/audio/sound-ids';
import { TEST_ROOM_STAGE_ID } from '../../../content/manifests/stage-ids';
import type { SaveNotice } from '../../core/models/save-data.model';
import { AudioService } from '../../core/services/audio.service';
import { ProgressionService } from '../../core/services/progression.service';
import { SaveService } from '../../core/services/save.service';
import { DEV_TOOLS_ENABLED } from '../../core/utilities/dev-tools';
import { MenuNavDirective } from '../../shared/ui/menu-nav.directive';

const NOTICE_TEXT: Readonly<Record<SaveNotice, string>> = {
  'restored-backup': 'Your save was damaged, so the last good copy was restored.',
  'reset-corrupt': 'Your save was damaged and could not be restored. A new one was started.',
  'storage-unavailable':
    'This browser is not letting the game save. Progress lasts until you close the tab.',
};

@Component({
  imports: [RouterLink, MenuNavDirective],
  selector: 'app-main-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './main-menu.component.css',
  templateUrl: './main-menu.component.html',
})
export class MainMenuComponent {
  private readonly audio = inject(AudioService);
  private readonly save = inject(SaveService);
  private readonly progression = inject(ProgressionService);

  protected readonly devTools = inject(DEV_TOOLS_ENABLED);
  protected readonly testRoomStageId = TEST_ROOM_STAGE_ID;
  protected readonly rank = this.progression.rank;
  protected readonly coins = this.progression.coins;
  protected readonly stars = this.progression.stars;
  protected readonly maxStars = this.progression.maxStars;
  protected readonly noticeText = computed(() => {
    const notice = this.save.notice();
    return notice === null ? null : NOTICE_TEXT[notice];
  });

  constructor() {
    this.audio.playMenuMusic();
  }

  protected confirmSelection(): void {
    this.audio.playSfx(Sfx.menuSelect);
  }

  protected dismissNotice(): void {
    this.save.dismissNotice();
  }
}
