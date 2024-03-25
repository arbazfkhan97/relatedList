import { LightningElement, wire, api, track } from 'lwc';
import fetchRecords from '@salesforce/apex/DynamicObjectFieldSetController.fetchRecords';

export default class DynamicDataTable extends LightningElement {
    @api objectName;
    @api fieldSetName;
    @track records;
    @track error;

    @wire(fetchRecords, { objectName: '$objectName', fieldSetName: '$fieldSetName' })
    wiredRecords({ error, data }) {
        if (data) {
            this.records = data;
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.records = undefined;
        }
    }
}
