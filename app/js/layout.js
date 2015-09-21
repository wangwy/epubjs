/**
 * Created by wangwy on 15-9-8.
 */
EPUBJS.Layout = EPUBJS.Layout || {};

/**
 * 滚动显示的布局
 * @constructor
 */
EPUBJS.Layout.Scroll = function () {

};

EPUBJS.Layout.Scroll.prototype.calculate = function (_width) {
  this.spread = _width;
  this.column = _width;
  this.gap = 0;
};

EPUBJS.Layout.Scroll.prototype.format = function (view) {
  var $doc = view.document.documentElement;
  $doc.style.width = "auto";
  $doc.style.height = "auto";
};

/**
 * 横向显示的布局
 * @constructor
 */
EPUBJS.Layout.Reflowable = function () {
};

/**
 * 计算每一个的宽度、高度、间隔等
 * @param _width
 * @param _height
 * @param _gap
 * @param _devisor
 */
EPUBJS.Layout.Reflowable.prototype.calculate = function (_width, _height, _gap, _devisor) {
  var divisor = _devisor || 1;

  //计算显示区域的宽度
  var fullWidth = Math.floor(_width);
  var width = (fullWidth % 2 === 0) ? fullWidth : fullWidth - 1;

  //计算每页之间的间隔
  var section = Math.floor(width / 8);
  var gap = (_gap >= 0) ? _gap : ((section % 2 === 0) ? section : section - 1);

  //每页宽度
  var colWidth;
  var spreadWidth;
  var delta;

  if (divisor > 1) {
    colWidth = Math.floor((width - gap) / divisor);
  } else {
    colWidth = width;
  }

  spreadWidth = colWidth * divisor;
  delta = (colWidth + gap) * divisor;

  this.columnAxis = EPUBJS.core.prefixed('columnAxis');
  this.columnGap = EPUBJS.core.prefixed('columnGap');
  this.columnWidth = EPUBJS.core.prefixed('columnWidth');
  this.columnFill = EPUBJS.core.prefixed('columnFill');

  this.width = width;
  this.height = _height;
  this.spread = spreadWidth;
  this.delta = delta;

  this.column = colWidth;
  this.gap = gap;
  this.divisor = divisor;
};

/**
 * 初始化页面，为页面添加分栏样式
 * @param view
 */
EPUBJS.Layout.Reflowable.prototype.format = function (view) {
  var $doc = view.document.documentElement;
  var $body = view.document.body;

  $doc.style.width = this.width + "px";
  $body.style.height = this.height + "px";

  $body.style[this.columnAxis] = "horizontal";
  $body.style[this.columnFill] = "auto";
  $body.style[this.columnGap] = this.gap + "px";
  $body.style[this.columnWidth] = this.column + "px";

  view.iframe.style.marginRight = this.gap + "px";
};