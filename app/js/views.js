/**
 * Created by wangwy on 15-9-8.
 */
EPUBJS.Views = function(container){
  this.container = container;
  this._views = [];
  this.length = 0;
  this.hidden = false;
};

/**
 * 隐藏所有页面
 */
EPUBJS.Views.prototype.hide = function(){
  var view;
  var len = this.length;
  for(var i = 0; i < len; i++){
    view = this._views[i];
    if(view.displayed){
      view.hide();
    }
  }
  this.hidden = true;
};

/**
 * 销毁显示的页面
 * @param view
 */
EPUBJS.Views.prototype.destroy = function(view){
  view.off("resized");

  if(view.displayed){
    view.destroy();
  }
  this.container.removeChild(view.element);
  view = null;
};

/**
 * 添加页面到最后
 * @param view
 * @returns {*}
 */
EPUBJS.Views.prototype.append = function(view){
  this._views.push(view);
  this.container.appendChild(view.element);
  this.length++;
  return view;
};

/**
 * 添加页面到最前
 * @param view
 * @returns {*}
 */
EPUBJS.Views.prototype.prepend = function (view) {
  this._views.unshift(view);
  this.container.insertBefore(view.element, this.container.firstChild);
  this.length++;
  return view;
};

/**
 * 展示页面
 * @returns {Array}
 */
EPUBJS.Views.prototype.displayed = function () {
  var displayed = [];
  var view;
  var len = this.length;

  for(var i = 0; i < len; i++){
    view = this._views[i];
    if(view.displayed){
      displayed.push(view);
    }
  }

  return displayed;
};

/**
 * 检查view位置
 * @param view
 * @returns {number}
 */
EPUBJS.Views.prototype.indexOf = function(view) {
  return this._views.indexOf(view);
};

EPUBJS.Views.prototype.slice = function() {
  return this._views.slice.apply(this._views, arguments);
};

/**
 * 移除页面
 * @param view
 */
EPUBJS.Views.prototype.remove = function (view) {
  var index = this._views.indexOf(view);

  if(index > -1){
    this._views.splice(index, 1);
  }
  this.destroy(view);
  this.length--;
};

/**
 * 显示所有页面
 */
EPUBJS.Views.prototype.show = function () {
  var view;
  var len = this.length;

  for(var i = 0; i < len; i++){
    view = this._views[i];
    if(view.displayed){
      view.show();
    }
  }

  this.hidden = false;
};

/**
 * 循环所有的页面
 */
EPUBJS.Views.prototype.each = function () {
  return this._views.forEach.apply(this._views,arguments);
};

/**
 * 清楚view
 */
EPUBJS.Views.prototype.clear = function () {
  var view;
  var len = this.length;
  if(!this.length) return;
  for(var i = 0; i < len; i++){
    view = this._views[i];
    this.destroy(view);
  }
  this._views = [];
  this.length = 0;
};