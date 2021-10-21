import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { DatabaseComponent } from './database.component';

const routes: Routes = [
  {
    path: 'database',
    component: DatabaseComponent,
    data: { animation: 'fade' }
  }
];

@NgModule({
  declarations: [],
  imports: [CommonModule, RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DatabaseRoutingModule {}
