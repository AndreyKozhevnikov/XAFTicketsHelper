window.onload = function() {

  let isBug = GetIsBugReport();
  if (isBug) {
    supportCenter.viewModel.bottomPanelItems._submitButtonClick = supportCenter.viewModel.bottomPanelItems.submitButtonClick;
    supportCenter.viewModel.bottomPanelItems.submitButtonClick = CustomSubmitHandler;
  }
  
};

function GetIsXAFTicket() {
  return supportCenter.model.details.SelectedProduct.value == '4172fd27-cf4e-4275-8713-858656d21847'; //eXpressApp Framework
};

function GetIsBugReport() {
  return supportCenter.model.ticket.Type == 1; //Bug Report
};

function GetIsPublic() {
  return supportCenter.model.details.Private.value = true; //change!
}

function GetIsAFD() {
  return supportCenter.model.details.SelectedStatus.value == 'ActiveForDevelopers';
}

function GetIsSubjectCorrect(subject){
  return false;
}

function CustomSubmitHandler() {
  console.log('custom submit');
  let isXAFTicket = GetIsXAFTicket();
  let isPublic = GetIsPublic();
  let isAFD = GetIsAFD();
  if (isXAFTicket && isPublic && isAFD) {
    let subject = supportCenter.viewModel.subject.Text.currentValue();
    let isSubjectCorrect=GetIsSubjectCorrect(subject);
    if (!isSubjectCorrect){
      let messageBody='XAF bugs subjects should follow the next pattern: YYY. Do you wish to use the current value?';
      supportCenter.viewModel.modalDialog.confirmHandler=function(){
        supportCenter.viewModel.modalDialog.hideDialog();
        supportCenter.viewModel.bottomPanelItems._submitButtonClick();
      }
      supportCenter.viewModel.modalDialog.showDialog('Wrong subject', messageBody);
    }
  }
  //supportCenter.common.dialogs.modalNotification.showDialog('tet1','test2')'
  //supportCenter.viewModel.modalDialog.showDialog
}