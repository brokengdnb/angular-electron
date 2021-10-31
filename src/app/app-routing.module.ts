import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PageNotFoundComponent } from './shared/components';

import { HomeRoutingModule } from './home/home-routing.module';
import { DetailRoutingModule } from './detail/detail-routing.module';
import { DatabaseRoutingModule } from './database/database-routing.module';

import { RegisterComponent } from './register/register.component';
import { LoginComponent } from './login/login.component';
import { ProfileComponent } from './profile/profile.component';
import { UploadComponent } from './upload/upload.component';


const routes: Routes = [
  { path: 'register', component: RegisterComponent, data: { animation: 'isRight' } },
  { path: 'login', component: LoginComponent, data: { animation: 'isRight' } },
  { path: 'profile', component: ProfileComponent, data: { animation: 'isRight' } },
  { path: 'upload', component: UploadComponent, data: { animation: 'isRight' } },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
    data: { animation: 'fade' }
  },
  {
    path: '**',
    component: PageNotFoundComponent,
    data: { animation: 'fade' }
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { relativeLinkResolution: 'legacy' }),
    HomeRoutingModule,
    DetailRoutingModule,
    DatabaseRoutingModule
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
