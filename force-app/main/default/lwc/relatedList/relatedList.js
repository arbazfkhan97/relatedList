import { LightningElement, wire, api, track } from 'lwc';
import fetchRecords from '@salesforce/apex/DynamicObjectFieldSetController.fetchRecords';
import getFieldset from '@salesforce/apex/DynamicObjectFieldSetController.getFieldset';
import { updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import { deleteRecord } from 'lightning/uiRecordApi';
import { NavigationMixin } from 'lightning/navigation';
import deleteRecords from '@salesforce/apex/DynamicObjectFieldSetController.deleteRecords';
import ModalRecordEditForm from "c/modalRecordEditForm";
import { getObjectInfo } from "lightning/uiObjectInfoApi";

const actions = [
    { label:'View', name:'view'},
    { label: 'Edit', name: 'edit' },
    { label: 'Delete', name: 'delete' }
];
const columns=[{ type: 'action', typeAttributes: { rowActions: actions } }];

export default class DynamicDataTable extends NavigationMixin(LightningElement) {
    @api icon;
    @api sortable=false;
    @api recordId;
    @api objectName;
    @api fieldSetName;
    @track records;
    @api editable = false;
    @track error;
    @track columns = [];
    @track draftValues = [];
    @api parentfieldName;
    @api Title;
    fieldSetOptions;
    isLoading;
    data;
    selectedRows=[];

    connectedCallback(){
        this.fieldSetOptions = {
            
            clipText: true,
            sortable: this.sortable,
             
        };
        this.isLoading=true;
        console.log('connected callback call');
    }

    @wire(getObjectInfo, { objectApiName: '$objectName' })
    objectInfo;

    @wire(getFieldset, { objectName: '$objectName', fieldSetName: '$fieldSetName' })
    wiredFieldset({ error, data }) {
        if (data) {
            console.log(this.fieldSetOptions);
            let newcolumns=data.map(field => {
                if(field.isEditable === false){
                return {
                    label: field.fieldLabel,
                    fieldName: field.fieldName,
                    ...this.fieldSetOptions 
                };
            }
                            else {
                    return {
                        label: field.fieldLabel,
                        fieldName: field.fieldName,
                        editable: this.editable,
                        ...this.fieldSetOptions
                    };
                }
                            
                        });
                        this.columns=[...newcolumns,...columns];
        console.log(this.columns);
    }
        else if(error) {
        console.log(error);
    }
}

@wire(fetchRecords, { objectName: '$objectName', fieldSetName: '$fieldSetName', parentfieldName: '$parentfieldName', recordId: '$recordId' })
wiredRecords(value) {
    this.data=value;
    const { error, data } = value;
    if (data) {
        this.records = data;
        this.isLoading=false;
        console.log(data);
        //this.columns=fieldSetFields.map(obj=>{if(obj==='Id'){ return obj;} else {return {...obj,editable:this.editable};}});
        //this.columns=getfieldSetFields;
        this.error = undefined;
    }
    else if (error) {
        this.error = error;
        this.records = undefined;
    }
}

handleRowSelection(event) {
    // Update the state with selected rows
    this.selectedRows=[];
    this.selectedRows = event.detail.selectedRows;
}

async deleteSelectedRows() {
    if(this.selectedRows.length>0){
        this.isLoading=true;
        let recordIds=[];
        this.selectedRows.forEach(selectedRow=>{recordIds.push(selectedRow.Id)});
    console.log(recordIds);
    await deleteRecords({recordIds:recordIds})
    .then(result=>{
        let msg=result;
        this.dispatchEvent(
        new ShowToastEvent({
            title: 'Success',
            message: msg,
            variant: 'success'
        })
    );
    }
    ).catch(error=>{
        let msg=error;
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Error',
                message: JSON.stringify(msg),
                variant: 'Error'
            })
        );
    })
    this.selectedRows=[];
    this.isLoading=await this.refreshHandler();
    }
    else{
        this.dispatchEvent(new ShowToastEvent({
            title: 'Error',
            message: 'Select Rows First',
            variant: 'Error'
        }));
    }
    
   
}

async handleNew(){
    const obj = {
        label:"New "+this.objectInfo.data.label,
        name:this.objectName
    }
    let recordId;
    await ModalRecordEditForm.open({
        size: "small",
        object:obj
      }).then((result) => {
        recordId=result;
    });
if(recordId){
    console.log('recordid is: '+recordId);
    await this.dispatchEvent(new ShowToastEvent({
        title: 'Success',
        message: obj.label+' created',
        variant: 'success'
    })
    );
        this.isLoading=await this.refreshHandler();

}
    
      }

handleRowAction(event) {
    const actionName = event.detail.action.name;
    const recordId=event.detail.row.Id;
    switch (actionName) {
        case 'view':
        this[NavigationMixin.GenerateUrl]({
            type: "standard__recordPage",
            attributes: {
                recordId: recordId,
                objectApiName: '$objectName',
                actionName: 'view'
            }
        }).then(url => {
            window.open(url, "_blank");
        });
                break;
        case 'edit':
                this[NavigationMixin.Navigate]({
                    type: 'standard__recordPage',
                    attributes: {
                        recordId: recordId,
                        objectApiName: '$objectName',
                        actionName: 'edit'
                    }
                });
                break;
        case 'delete':
            this.deleteTheRecord(recordId);
            break;
        default:
            
    }
}

handleSort(event) {
    const { fieldName: sortedBy, sortDirection } = event.detail;
    // Perform the sort on the data
    this.sortedBy = sortedBy;
    this.sortedDirection = sortDirection;
    this.records = this.sortData(sortedBy, sortDirection);
}

sortData(fieldName, sortDirection) {
    const parseData = JSON.parse(JSON.stringify(this.records));
    parseData.sort((a, b) => {
        let valueA = a[fieldName] ? a[fieldName].toLowerCase() : '';
        let valueB = b[fieldName] ? b[fieldName].toLowerCase() : '';

        // If sortDirection is 'asc', compare valueA to valueB
        // If sortDirection is 'desc', compare valueB to valueA
        return sortDirection === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
    });

    return parseData;
}


async handleSave(event) {
    this.isLoading=true;
    const updatedFields = event.detail.draftValues;
    const recordInputs = updatedFields.map(draft => {
        const fields = Object.assign({}, draft);
        return { fields };
    });

    const promises = recordInputs.map(recordInput => updateRecord(recordInput));
    await Promise.all(promises).then(() => {
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
                message: 'Records updated successfully',
                variant: 'success'
            })
        );
        this.draftValues = [];
        this.isLoading=this.refreshHandler();
        
    }).catch(error => {
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Error',
                message: error.body.message,
                variant: 'error'
            })
        );
        // handle error
    });
}

async deleteTheRecord(recordId) {
    try {
        this.isLoading=true;
        await deleteRecord(recordId);
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
                message: 'Record deleted Successfully',
                variant: 'success'
            })
        );
        this.isLoading=await this.refreshHandler();
    } catch (error) {
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Error deleting record',
                message: error.body.message,
                variant: 'error'
            })
        );
    }
}

async handleRefresh(){
    this.isLoading=true;
    await Promise.resolve();
    this.isLoading=await this.refreshHandler();

}

refreshHandler(){
    refreshApex(this.data);
    return false;
}


}
