import { Component } from '@angular/core';
import { ElectronService } from './core/services';
import { TranslateService } from '@ngx-translate/core';
import { APP_CONFIG } from '../environments/environment';
import {Router, RouterOutlet} from '@angular/router';

import { HttpClient } from '@angular/common/http';

import { fader } from './app.animations';
import {CookieService} from 'ngx-cookie-service';

//db


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [ // <-- add your animations here
    fader,
    // slider,
    // transformer,
    // stepper
  ]
})


export class AppComponent {
  constructor(
    private cookieService: CookieService,
    private router: Router,
    private http: HttpClient,
    private electronService: ElectronService,
    private translate: TranslateService
  ) {
    console.log('APP_CONFIG', APP_CONFIG);
    const localeCookieExists: boolean = this.cookieService.check('locale');

    if (localeCookieExists) {
      this.translate.setDefaultLang(this.cookieService.get('locale'));
    } else {
      this.translate.setDefaultLang('en');
      this.cookieService.set('locale', 'en');
    }
    if (electronService.isElectron) {
      console.log(process.env);
      console.log('Run in electron');
      console.log('Electron ipcRenderer', this.electronService.ipcRenderer);
      console.log('NodeJS childProcess', this.electronService.childProcess);
    } else {
      console.log('Run in browser');
    }
  }

  public prepareRoute(outlet: RouterOutlet) {
    return outlet && outlet.activatedRouteData && outlet.activatedRouteData.animation;
  }

  public translateTo(lang) {
    this.translate.setDefaultLang(lang);
    this.cookieService.set('locale', lang);
  }
}
