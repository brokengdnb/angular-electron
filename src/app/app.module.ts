import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';

import { NgProgressModule } from 'ngx-progressbar';

import { HttpClientModule, HttpClient } from '@angular/common/http';
import { CoreModule } from './core/core.module';
import { SharedModule } from './shared/shared.module';

import 'hammerjs';
import { AppRoutingModule } from './app-routing.module';
// login
import { authInterceptorProviders } from './_helpers/auth.interceptor';
import { MatSnackBarModule } from '@angular/material/snack-bar';

// gallery
import { SwiperModule } from 'swiper/angular';

// NG Translate
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

// cookies
import { CookieService } from 'ngx-cookie-service';

// base modules
import { HomeModule } from './home/home.module';
import { DetailModule } from './detail/detail.module';
import { DatabaseModule } from './database/database.module';

import { RegisterComponent } from './register/register.component';
import { LoginComponent } from './login/login.component';
import { UploadModule } from './upload/upload.module';


// material
import { AppComponent } from './app.component';
import { NavBarComponent } from './nav-bar/nav-bar.component';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import {MatMenuModule} from '@angular/material/menu';
import {MatCardModule} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatButtonModule} from '@angular/material/button';
import {LayoutModule} from '@angular/cdk/layout';
import {MatTooltipModule} from '@angular/material/tooltip';
import { FlexLayoutModule } from '@angular/flex-layout';
import {MatInputModule} from '@angular/material/input';
import {ReactiveFormsModule} from '@angular/forms';
import {ProfileComponent} from './profile/profile.component';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';

// keyboard
import {HotkeyModule} from 'angular2-hotkeys';

// url hash
import { HashLocationStrategy, LocationStrategy } from '@angular/common';

// AoT requires an exported function for factories
const httpLoaderFactory = (http: HttpClient): TranslateHttpLoader =>  new TranslateHttpLoader(http, './assets/i18n/', '.json');

import {NgParticlesModule} from "ng-particles";
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';

@NgModule({
  declarations: [AppComponent, NavBarComponent, RegisterComponent, LoginComponent, ProfileComponent],
  imports: [
    NgParticlesModule,
    BrowserModule,
    FlexLayoutModule,
    MatExpansionModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    BrowserAnimationsModule,
    MatTooltipModule,
    MatSidenavModule,
    MatMenuModule,
    MatSelectModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    LayoutModule,
    NgProgressModule,
    HttpClientModule,
    CoreModule,
    SharedModule,
    HomeModule,
    DetailModule,
    DatabaseModule,
    AppRoutingModule,
    UploadModule,
    SwiperModule,
    HotkeyModule.forRoot(),
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: httpLoaderFactory,
        deps: [HttpClient]
      }
    }),
    MatInputModule,
    ReactiveFormsModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production,
      // Register the ServiceWorker as soon as the app is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
    })
  ],
  providers: [
    {provide: LocationStrategy, useClass: HashLocationStrategy},
    CookieService,
    authInterceptorProviders],

  bootstrap: [AppComponent]
})
export class AppModule {}
