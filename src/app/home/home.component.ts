import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';



import { TranslateService } from '@ngx-translate/core';


// @ts-ignore
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})

export class HomeComponent implements OnInit {

  constructor(
    private router: Router,
    private translate: TranslateService
  ) {}

  public translateTo(lang) {
    this.translate.setDefaultLang(lang);
  }

  ngOnInit(): void {
    console.log('HomeComponent INIT');
  }

}
