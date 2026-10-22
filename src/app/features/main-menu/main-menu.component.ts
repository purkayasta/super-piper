import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  selector: 'app-main-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './main-menu.component.css',
  templateUrl: './main-menu.component.html',
})
export class MainMenuComponent {}
