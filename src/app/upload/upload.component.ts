
import { Component, ViewEncapsulation, ViewChild } from '@angular/core';
import { SwiperComponent } from 'swiper/angular';

// import Swiper core and required modules
import SwiperCore, { Mousewheel, Pagination } from 'swiper';

import { MatDialog } from '@angular/material/dialog';
import { DialogComponent } from './dialog/dialog.component';
import { UploadService } from './upload.service';

// install Swiper modules
SwiperCore.use([Mousewheel, Pagination]);

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss'],
  encapsulation: ViewEncapsulation.None,

})
export class UploadComponent {
  constructor(public dialog: MatDialog, public uploadService: UploadService) { }

  public openUploadDialog() {
    this.dialog.open(DialogComponent, { width: '50%', height: '50%' });
  }
}
