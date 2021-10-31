import { Component, HostBinding } from '@angular/core';
import { ElectronService } from './core/services';
import { TranslateService } from '@ngx-translate/core';
import { APP_CONFIG } from '../environments/environment';
import {Router, RouterOutlet} from '@angular/router';

import { HttpClient } from '@angular/common/http';

import { fader } from './app.animations';
import {CookieService} from 'ngx-cookie-service';

import {FormControl} from '@angular/forms';


// darkmode
import { ThemeService } from './theme.service';


// login
import { TokenStorageService } from './_services/token-storage.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import {OverlayContainer} from '@angular/cdk/overlay';


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
  isLoggedIn = false;
  showAdminBoard = false;
  showModeratorBoard = false;
  username?: string;

  isDarkMode: boolean;


  private roles: string[] = [];
  constructor(
    private tokenStorageService: TokenStorageService,
    private cookieService: CookieService,
    private router: Router,
    private http: HttpClient,
    private electronService: ElectronService,
    private translate: TranslateService,
    private snackBarLogin: MatSnackBar,
    private themeService: ThemeService,
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

    this.isLoggedIn = !!this.tokenStorageService.getToken();

    if (this.isLoggedIn) {
      const user = this.tokenStorageService.getUser();
      this.roles = user.roles;

      this.showAdminBoard = this.roles.includes('ROLE_ADMIN');
      this.showModeratorBoard = this.roles.includes('ROLE_MODERATOR');

      this.username = user.username;
    }

    this.themeService.initTheme();
    this.isDarkMode = this.themeService.isDarkMode();
  }

  // eslint-disable-next-line @angular-eslint/use-lifecycle-interface
  ngOnInit(): void {


  }

  toggleDarkMode() {
    this.isDarkMode = this.themeService.isDarkMode();

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this.isDarkMode
      ? this.themeService.update('light-mode')
      : this.themeService.update('dark-mode');
  }

  logout(): void {
    this.tokenStorageService.signOut();
    const snackBarRef = this.snackBarLogin.open('logging out, please wait', null, {
      duration: 2000
    });
    snackBarRef.afterDismissed().subscribe(info => {
      window.location.reload();
    });
  }

  public prepareRoute(outlet: RouterOutlet) {
    return outlet && outlet.activatedRouteData && outlet.activatedRouteData.animation;
  }

  public translateTo(lang) {
    this.translate.setDefaultLang(lang);
    this.cookieService.set('locale', lang);
  }
}
