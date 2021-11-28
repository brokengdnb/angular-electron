import { Component, OnInit } from '@angular/core';
/*
import PouchDB from './../../../node_modules/pouchdb';
*/
import { TranslateService } from '@ngx-translate/core';

import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-database',
  templateUrl: './database.component.html',
  styleUrls: ['./database.component.scss']
})


export class DatabaseComponent implements OnInit {
  pouchdb: any;
  deviceInfo: any;
  serverInfo: any;
  private db: any;
  // eslint-disable-next-line @typescript-eslint/member-ordering,@typescript-eslint/ban-types
  localDatabaseData: any;
  private translate: TranslateService;

  constructor(
    private http: HttpClient
  ) {
    /*this.db = new PouchDB('first');*/
  }

  ngOnInit(): void {
    const scope = this;
    scope.localDatabaseData = {
      usage: '0',
      quota: '0',
      percent: 0
    };

    function formatBytes(bytes, decimals = 2) {
      if(bytes === 0) {return '0 Bytes';}
      const k = 1024;
      const dm = decimals < 0 ? 0 : decimals;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
    const calculateSize = async function() {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const {usage, quota} = await navigator.storage.estimate();
        const percentUsed = Math.round(usage / quota * 100);
        const usagePass = formatBytes(usage);
        const quotaPass = formatBytes(quota);

        scope.localDatabaseData = {
          usage: usagePass,
          quota: quotaPass,
          percent: percentUsed
        };
      }
    };
    calculateSize();

    this.deviceInfo = this.serverInfo = {
      description: '',
      platform: '',
      system: '',
      name: '',
      os: '',
      version: '',
      layout: ''
    };

    this.http.get<any>('http://localhost:3300/server').subscribe({
      next: data => {
        this.serverInfo = data;
      },
      error: error => {
        console.error('There was an error!', error);
      }
    });

    this.http.get<any>('http://localhost:3300/device').subscribe({
      next: data => {
        console.log(data);
        this.deviceInfo = data;
      },
      error: error => {
        console.error('There was an error!', error);
      }
    });
  }


}
