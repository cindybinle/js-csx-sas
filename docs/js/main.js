//
(function () {
  var module = angular.module('ng.jsoneditor', []);
  module.constant('ngJsoneditorConfig', {});

  module.directive('ngJsoneditor', ['ngJsoneditorConfig', '$timeout', function (ngJsoneditorConfig, $timeout) {
    var defaults = ngJsoneditorConfig || {};

    return {
      restrict: 'A',
      require: 'ngModel',
      scope: {'options': '=', 'ngJsoneditor': '=', 'preferText': '='},
      link: function ($scope, element, attrs, ngModel) {
        var debounceTo, debounceFrom;
        var editor;
        var internalTrigger = false;

        if (!angular.isDefined(window.JSONEditor)) {
          throw new Error("Please add the jsoneditor.js script first!");
        }

        function _createEditor(options) {
          var settings = angular.extend({}, defaults, options);
          var theOptions = angular.extend({}, settings, {
            change: function () {
              if (typeof debounceTo !== 'undefined') {
                $timeout.cancel(debounceTo);
              }

              debounceTo = $timeout(function () {
                if (editor) {
                  internalTrigger = true;
                  ngModel.$setViewValue($scope.preferText === true ? editor.getText() : editor.get());
                  internalTrigger = false;

                  if (settings && settings.hasOwnProperty('change')) {
                    settings.change();
                  }
                }
              }, settings.timeout || 100);
            }
          });

          element.html('');

          var instance = new JSONEditor(element[0], theOptions);

          if ($scope.ngJsoneditor instanceof Function) {
            $timeout(function () { $scope.ngJsoneditor(instance);});
          }

          return instance;
        }

        $scope.$watch('options', function (newValue, oldValue) {
          for (var k in newValue) {
            if (newValue.hasOwnProperty(k)) {
              var v = newValue[k];

              if (newValue[k] !== oldValue[k]) {
                if (k === 'mode') {
                  editor.setMode(v);
                } else if (k === 'name') {
                  editor.setName(v);
                } else { //other settings cannot be changed without re-creating the JsonEditor
                  editor = _createEditor(newValue);
                  $scope.updateJsonEditor();
                  return;
                }
              }
            }
          }
        }, true);

        $scope.$on('$destroy', function () {
          //remove jsoneditor?
        });

        $scope.updateJsonEditor = function (newValue) {
          if (internalTrigger) return; //ignore if called by $setViewValue

          if (typeof debounceFrom !== 'undefined') {
            $timeout.cancel(debounceFrom);
          }

          debounceFrom = $timeout(function () {
            if (($scope.preferText === true) && !angular.isObject(ngModel.$viewValue)) {
              editor.setText(ngModel.$viewValue || '{}');
            } else {
              editor.set(ngModel.$viewValue || {});
            }
          }, $scope.options.timeout || 100);
        };

        editor = _createEditor($scope.options);

        if ($scope.options.hasOwnProperty('expanded')) {
          $timeout($scope.options.expanded ? function () {editor.expandAll()} : function () {editor.collapseAll()}, ($scope.options.timeout || 100) + 100);
        }

        ngModel.$render = $scope.updateJsonEditor;
        $scope.$watch(function () { return ngModel.$modelValue; }, $scope.updateJsonEditor, true); //if someone changes ng-model from outside
      }
    };
  }]);
})();

//

var json = {
  "Array": [1, 2, 3],
  "Boolean": true,
  "Null": null,
  "Number": 123,
  "Object": {"a": "b", "c": "d"},
  "String": "Hello World"
};
var Module = angular.module("jsoneditor", ['ng.jsoneditor', 'angularResizable']);

Module.config(['$compileProvider', function ($compileProvider) {
  $compileProvider.aHrefSanitizationWhitelist(/^\s*(|blob|):/);
}]);


Module.controller('controller', ['$scope', '$timeout', '$window', function ($scope, $timeout, $window) {
  var today = new Date();
  $scope.obj = {
    data: json,
    options: {mode: 'code'},
    listChecked: [],
    file: null,
    fileDownload: null,
    fileName: today.getDate() + "_" + today.getMonth() + "_" + today.getFullYear() + "_" + today.getHours() + "_" + today.getMinutes() + '.json'
  };
  $scope.obj2 = {data: json, options: {mode: 'tree'}};
  $scope.alert = {errorDisplay: false, errorText: '', successDisplay: false, successText: ''};
  $scope.heightEditor = window.innerHeight - 115;
  if(window.innerWidth < 769){
    $scope.heightEditor = window.innerHeight/2 - 53;
  }
  $scope.toggleWindowBookmark = false;
  $scope.getListSaved = getDataLocalStorage().list || [];
  $scope.chooseBookmark = -1;
  $scope.$watch('obj.file', function (newVal) {
    if (newVal && isJsonString(newVal)) {
      $scope.obj.data = JSON.parse(newVal);
      $scope.alert.successDisplay = true;
      $scope.alert.successText = "Import file success!";
    }
    else if (!isJsonString(newVal)) {
      $scope.alert.errorDisplay = true;
      $scope.alert.errorText = "Format json file wrong, please choose other file!";
    }
  });

  $scope.$watch('alert.errorDisplay', function (newVal) {
    if (newVal) {
      $timeout(function () {
        $scope.alert = {errorDisplay: false, errorText: '', successDisplay: false, successText: ''};
      }, 3000);
    }
  });

  $scope.$watch('alert.successDisplay', function (newVal) {
    if (newVal) {
      $timeout(function () {
        $scope.alert = {errorDisplay: false, errorText: '', successDisplay: false, successText: ''};
      }, 3000);
    }
  });

  $scope.$watch('obj.data', function (newVal) {
    var url = $window.URL || $window.webkitURL;
    $scope.obj.fileDownload = url.createObjectURL(new Blob([JSON.stringify(newVal)], {type: 'text/plain'}));
  });

  $scope.formatTime = function (time) {
    return moment(time).fromNow();
  };

  $scope.loadData = function (data, i) {
    $scope.obj.data = data;
    $scope.chooseBookmark = i;
  };

  $scope.onClickSave = function () {
    if (typeof(Storage) !== "undefined") {
      var localstorage = getDataLocalStorage();
      var list = [];
      if (typeof localstorage.list != "undefined") {
        list = localstorage.list;
      }
      list.push({id : randomString(10) ,date: new Date(), data: $scope.obj.data});
      localstorage.list = list;
      localStorage.setItem("json_editor_online_tl", JSON.stringify(localstorage));
      $scope.alert.successDisplay = true;
      $scope.alert.successText = "Saved!";
      $scope.getListSaved = getDataLocalStorage().list || [];
    }
  };

  $scope.deleteListLocalStorage= function () {
    if (typeof(Storage) !== "undefined") {
      var localstorage = getDataLocalStorage();
      var list = [];
      if (typeof localstorage.list != "undefined") {
        list = localstorage.list;
      }
      
      $scope.obj.listChecked.map(function (v) {
        list.map(function (v2,i) {
          if(v == v2.id){
            list.splice(i,1);
          }
        })
      });
      localstorage.list = list;
      localStorage.setItem("json_editor_online_tl", JSON.stringify(localstorage));
      $scope.getListSaved = getDataLocalStorage().list || [];
      $scope.obj.listChecked=[];
    }
  };

  $scope.onClickListSave = function () {
    $scope.toggleWindowBookmark = true;
  };

  $scope.onClickListCloseSave = function () {
    $scope.toggleWindowBookmark = false;
  };

  $scope.onCheckedList= function (checked, id) {
    if(checked){
      $scope.obj.listChecked.push(id);
    }
    else{
      var indexRemove= -1;
      $scope.obj.listChecked.map(function (v ,index) {
        if(v == id) indexRemove= index;
      });
      if(indexRemove != -1){
        $scope.obj.listChecked.splice(indexRemove,1);
      }
    }
  };

  $scope.getString = function (data) {
    return JSON.stringify(data);
  }


  function getDataLocalStorage() {
    if (typeof(Storage) !== "undefined") {
      var localData = localStorage.getItem("json_editor_online_tl");
      if (localData) {
        var list=JSON.parse(localData);
        if(typeof list.list != "undefined"){
          list.list.map(function (v) {
            v.isChecked= false;
          })
        }
        return list;
      }
      else {
        return {
          list: []
        }
      }
    }
  }


}]);

//    directive

Module.directive("fileread", [function () {
  return {
    scope: {
      fileread: "="
    },
    link: function (scope, element, attributes) {
      element.bind("change", function (changeEvent) {
        var reader = new FileReader();
        reader.onload = function (loadEvent) {
          scope.$apply(function () {
            scope.fileread = loadEvent.target.result;
          });
        }
        reader.readAsText(changeEvent.target.files[0]);
      });
    }
  }
}]);

function isJsonString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

// Changes XML to JSON
function xmlToJson(xml) {

  // Create the return object
  var obj = {};

  if (xml.nodeType == 1) { // element
    // do attributes
    if (xml.attributes.length > 0) {
      obj["@attributes"] = {};
      for (var j = 0; j < xml.attributes.length; j++) {
        var attribute = xml.attributes.item(j);
        obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
      }
    }
  } else if (xml.nodeType == 3) { // text
    obj = xml.nodeValue;
  }

  // do children
  if (xml.hasChildNodes()) {
    for (var i = 0; i < xml.childNodes.length; i++) {
      var item = xml.childNodes.item(i);
      var nodeName = item.nodeName;
      if (typeof(obj[nodeName]) == "undefined") {
        obj[nodeName] = xmlToJson(item);
      } else {
        if (typeof(obj[nodeName].push) == "undefined") {
          var old = obj[nodeName];
          obj[nodeName] = [];
          obj[nodeName].push(old);
        }
        obj[nodeName].push(xmlToJson(item));
      }
    }
  }
  return obj;
}

function randomString(len, charSet) {
  charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var randomString = '';
  for (var i = 0; i < len; i++) {
    var randomPoz = Math.floor(Math.random() * charSet.length);
    randomString += charSet.substring(randomPoz,randomPoz+1);
  }
  return randomString;
}