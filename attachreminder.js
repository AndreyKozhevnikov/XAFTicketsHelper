// ==UserScript==
// @name        AttachesReminder
// @namespace   SC3
// @description Checks new posts for missing attaches by keywords
// @include     https://isc.devexpress.com/*
// @version     1.8.5
// @grant       none
// ==/UserScript==
ko.dataFor($("form[id]")[0])

(function() {
  'use strict';

  var vmHelper = new function() {
    var self = this;
    var _vm = null;
    var _attachWords = ["attach"];

    self.getModel = function() {
      if (_vm == null)
        _vm = ko.dataFor($("form[id]")[0]);
      return _vm;
    };
    self.isTicket = function() {
      var type = pluginPageType();
      return type == "Ticket";
    };

    self.hasForgottenAttaches = function() {
      var forgotInOld = _processOld();
      var forgotInNew = _processNew();
      return forgotInOld || forgotInNew;
    };

    var _getNewItems = function() {
      return supportCenter.viewModel.newItems;
    };
    var _getOldItems = function() {
      return self.getModel().issueHistoryItems;
    };

    var _processNew = function() {
      //new_answer / answer_new_comment / question_new_comment
      var items = _getNewItems();
      for (var key in items) {
        var currentItem = items[key];
        if (_processItem(currentItem, true))
          return true;
      }
      return false;
    };
    var _processOld = function() {
      var items = _getOldItems();
      for (var key in items) {
        var currentItem = items[key];
        if (_processItem(currentItem))
          return true;

        for (var comName in currentItem.comments) {
          var currentComment = currentItem.comments[comName];
          if (_processItem(currentComment))
            return true;
        }
      }
      return false;
    };

    var _processItem = function(item, isNewItem) {
      var res = false;
      if (_shouldCheckItem(item, isNewItem)) {
        var text = isNewItem ? item.Text.currentValue.peek() : item.EditableDescription.currentValue.peek();
        if (!text) return res;
        res = _shouldCheckAttach(text) && !_hasAttach(item);
      }

      return res;
    };

    var _hasAttach = function(item) {
      var hasNewAttaches = item.NewPostAttachments && item.NewPostAttachments.attachments && item.NewPostAttachments.attachments().length > 0;
      var hasOldAttaches = item.PostAttachments;
      if (hasOldAttaches) {
        var _counter = item.PostAttachments.length;
        for (var i = 0, l = item.PostAttachments.length; i < l; i++) {
          if (item.PostAttachments[i].Removed.peek())
            _counter--;
        }
        hasOldAttaches = _counter > 0;
      }
      return hasNewAttaches || hasOldAttaches;
    };
    var _shouldCheckAttach = function(text) {
      var result = false;
      text = text.replace(/\/Attachment\/GetAttachmentFile/g, "").toLowerCase();
      for (var i = 0, l = _attachWords.length; i < l; i++) {
        result = text.indexOf(_attachWords[i]) > -1;
        if (result) break;
      }
      return result;
    };
    var _allowedItemTypes = [1, 2, 3];
    var _isCommentOrAnswer = function(item) {
      if (!item.ItemType || _allowedItemTypes.indexOf(item.ItemType) < 0)
        return false;
      return true;
    };
    var _isItemChanged = function(item) {
      var textChanged = item.EditableDescription.hasChanged();
      var attachesAdded = item.NewPostAttachments.hasChanged();
      var oldAttachesModified = item.PostAttachments.hasChanged();
      return textChanged || oldAttachesModified || attachesAdded;
    };
    var _getCurrentDraft = function(item) {
      return item.Draft.currentValue.peek();
    };
    var _shouldCheckItem = function(item, isNew) {
      if (isLicensingTicket()) return false;
      if (!_isCommentOrAnswer(item)) return false;
      var res = false,
        willBePosted = !_getCurrentDraft(item);
      if (!willBePosted) return false;

      if (isNew) {
        var isVisible = item.isPaneActive.peek();
        res = isVisible;
      } else {
        var inDraft = item.Draft.defaultValue;
        res = inDraft || _isItemChanged(item);
      }
      return res;
    };

    self.debugItem = function(item, isNew) {
      console.log('----------------');
      console.log('is new: ', isNew);
      console.log(isNew ? item.Text.currentValue.peek() : item.EditableDescription.currentValue.peek());
      console.log('is comment or answer: ', _isCommentOrAnswer(item));
      console.log('should be checked: ', _shouldCheckItem(item, isNew));
      if (!isNew)
        console.log('has changes: ', _isItemChanged(item));
      else
        console.log('new item visible: ', item.isPaneActive.peek());
      console.log('has attaches: ', _hasAttach(item));
      console.log('should check attach: ', _shouldCheckAttach(isNew ? item.Text.currentValue.peek() : item.EditableDescription.currentValue.peek()));
    };
    self.debugItems = function() {
      var newItems = _getNewItems();
      var _debugInfo = self.debugItem;
      for (var key in newItems) {
        var currentItem = newItems[key];
        _debugInfo(currentItem, true);
      }
      var items = _getOldItems();
      for (var key in items) {
        var currentItem = items[key];
        _debugInfo(currentItem);

        for (var comName in currentItem.comments) {
          var currentComment = currentItem.comments[comName];
          _debugInfo(currentComment);
        }
      }
    }

    self.ui = new function() {
      var _uiContext = this,
        _selector = "#attachmentsReminderModal"

      _uiContext.show = function() {
        _uiContext.deferred = $.Deferred();
        $(_selector).modal('show');
        return _uiContext.deferred;
      };
      var _subscribeToEvents = function() {
        $(_selector).on('shown.bs.modal', function() {
          _focusDefaultButton();
        });
        $(_selector).on('show.bs.modal', function() {
          _centerDialog(this);
        });
        $(_selector).on('hidden.bs.modal', function() {
          setTimeout(function() {
            delete _uiContext.deferred;
          }, 100);
        });
        $(_selector).find("button").on('click', function() {
          var res = $(this).attr('data-result');
          _uiContext.deferred.resolve(res);
        });
      };
      var _centerDialog = function(container) {
        var $dialog = $(container),
          _wh = $(window).outerHeight(),
          _ww = $(window).outerWidth(),
          topOffset = (_wh - $dialog.outerHeight()) / 2,
          leftOffset = (_ww - $dialog.outerWidth()) / 2,
          bottomMargin = parseInt($dialog.css('marginBottom'), 10);

        if (topOffset < bottomMargin)
          topOffset = bottomMargin;

        $dialog.css({
          "top": topOffset,
          "left": leftOffset
        });
      };
      var _focusDefaultButton = function() {
        $(_selector).find("button.btn-default").focus();
      };
      var _getTemplateHtml = function() {
        var t = '<div id="attachmentsReminderModal" class="modal fade hidden" role="dialog" tabindex="-1">\
							<div class="modal-dialog">\
								<div class="modal-content">\
								  <div class="modal-header">\
									<button type="button" class="close" data-dismiss="modal" data-result="false">&times;</button>\
									<h4 class="modal-title">Attachment Reminder</h4>\
								  </div>\
								  <div class="modal-body">\
									<p>You may have forgotten to attach a file.</p>\
								  </div>\
								  <div class="modal-footer">\
									<button type="button" class="btn btn-default" data-result="false" data-dismiss="modal">Don\'t submit</button>\
									<button type="button" class="btn" data-result="true" data-dismiss="modal">Submit anyway</button>\
								  </div>\
								</div>\
							  </div>\
							</div>';
        return t;
      };

      var initUI = function() {
        $("body").append($(_getTemplateHtml()));
        _subscribeToEvents();
      };
      initUI();
      return _uiContext;
    };

    window.attachesHelper = self;
    return self;
  };

  var init = function() {
    if (!vmHelper.isTicket())
      return;
    var bottomPanelVM = vmHelper.getModel().bottomPanelItems;
    bottomPanelVM._originalSubmit = bottomPanelVM.submitButtonClick;
    bottomPanelVM.submitButtonClick = function() {
      if (vmHelper.hasForgottenAttaches()) {
        var dialog = vmHelper.ui.show();
        dialog.done(function(result) {
          if (result == "true")
            setTimeout(function() {bottomPanelVM._originalSubmit();}, 0);
        });
      } else
        bottomPanelVM._originalSubmit();
    };
  };

  var isLicensingTicket = function() {
    if (typeof supportCenter == "undefined") return false;
    if (typeof supportCenter.model == "undefined") return false;
    if (typeof supportCenter.model.details == "undefined") return false;
    if (!typeof supportCenter.model.details.SelectedProduct) return false;
    return supportCenter.model.details.SelectedProduct.value == "308df7aa-6e50-11e3-8ede-5442496457d0";
  };

  var pluginPageType = function() {
    if (typeof supportCenter == "undefined") return "Analytics";
    if (typeof supportCenter.model == "undefined") return "User";
    if (typeof supportCenter.model.details != "undefined" && supportCenter.model.details.OwnerInfo == null) return "New";
    if (typeof supportCenter.model.ticket != "undefined") return "Ticket";
    if (typeof supportCenter.model.list != "undefined") return "TicketList";
  };
  $().ready(function() {
    init();
  });

})();