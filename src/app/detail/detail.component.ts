import { Component, OnInit } from '@angular/core';
/*
import PouchDB from './../../../node_modules/pouchdb';
*/
import {FormBuilder, FormControl, FormGroup} from '@angular/forms';

@Component({
  selector: 'app-detail',
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.scss']
})
export class DetailComponent implements OnInit {
  pouchdb: any;
  addForm: any;
  private db: any;

  constructor(
    private formBuilder: FormBuilder
  ) {
    /*this.db = new PouchDB('first');
    this.addForm = new FormGroup({
      _id: new FormControl(),
      name: new FormControl(),
      emailid: new FormControl()
    });*/
  }

  ngOnInit(): void {
    console.log('DetailComponent INIT');
   }

  /*getAll() {
    // get all items from storage including details
    return this.db.allDocs({
      // eslint-disable-next-line @typescript-eslint/naming-convention
      include_docs: true
    })
      .then(db =>
        // re-map rows to collection of items
         db.rows.map(row => row.doc)
      );
  }

  create(item) {
    this.db.put(item, function(result, error) {
      console.log(error);
      if (!error) {
        return 'Pouch form saved successfully';
      }
    });
  }
  get(id) {
    // find item by id
    return this.db.get(id);
  }

  save(item) {
    // add or update an item depending on _id
    // eslint-disable-next-line no-underscore-dangle
    return item._id ?
      this.update(item) :
      this.add(item);
  }

  add(item) {
    // add new item
    return this.db.post(item);
  }

  update(item) {
    // find item by id
    // eslint-disable-next-line no-underscore-dangle
    return this.db.get(item._id)
      .then(updatingItem => {
        // update item
        Object.assign(updatingItem, item);
        return this.db.put(updatingItem);
      });
  }

  remove(id) {
    // find item by id
    return this.db.get(id)
      .then(item => this.db.remove(item));
  }

  listAll() {
    this.getAll().then(function(data){
      console.log(data);
    });
  }

  saveForm() {
    const pouchForm = {
      _id: new Date().toISOString(),
      name: this.addForm.value.name,
      emailid: this.addForm.value.emailid
    };
    this.create(pouchForm);
  }*/
}
