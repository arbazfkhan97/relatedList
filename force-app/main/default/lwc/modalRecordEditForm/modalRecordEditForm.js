import { LightningElement,api } from 'lwc';
import LightningModal from 'lightning/modal';

export default class ModalRecordEditForm extends LightningModal {
    errors;
    @api object;
    closePopupSuccess(event) {
        this.close(event.detail.id);
      }
    
      closePopup() {
        this.close();
      }
}