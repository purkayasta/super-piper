import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Sfx } from '../../../content/audio/sound-ids';
import { FIRST_STAGE_ID, TEST_ROOM_STAGE_ID } from '../../../content/manifests/stage-ids';
import { AudioService } from '../../core/services/audio.service';
import { DEV_TOOLS_ENABLED } from '../../core/utilities/dev-tools';

@Component({
  imports: [RouterLink],
  selector: 'app-main-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './main-menu.component.css',
  templateUrl: './main-menu.component.html',
})
export class MainMenuComponent {
  private readonly audio = inject(AudioService);
  protected readonly devTools = inject(DEV_TOOLS_ENABLED);
  protected readonly firstStageId = FIRST_STAGE_ID;
  protected readonly testRoomStageId = TEST_ROOM_STAGE_ID;

  constructor() {
    this.audio.playMenuMusic();
  }

  protected confirmSelection(): void {
    this.audio.playSfx(Sfx.menuSelect);
  }
}
