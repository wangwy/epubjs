EPUBJS.View = function (section, options) {
  this.settings = options || {};
  this.id = "epubjs-view:" + EPUBJS.core.uuid();
  this.section = section;
  this.index = section.index;

  this.element = document.createElement('div');
  this.element.setAttribute("class", "epub-view");

  this.element.style.height = "0px";
  this.element.style.width = "0px";
  this.element.style.overflow = "hidden";

  this.displayed = false;
  this.rendered = false;
  if (this.settings.axis && this.settings.axis == "horizontal") {
    this.element.style.display = "inline-block";
  } else {
    this.element.style.display = "block";
  }
  this.listenedEvents = ["keydown", "keyup", "keypressed", "mouseup", "mousedown", "click", "touchend", "touchstart"];

};

/**
 * 创建iframe
 * @returns {HTMLElement|*}
 */
EPUBJS.View.prototype.create = function () {
  this.iframe = document.createElement('iframe');
  this.iframe.id = this.id;
  this.iframe.scrolling = "no";
  this.iframe.style.overflow = "hidden";
  this.iframe.seamless = "seamless";
  this.iframe.style.border = "none";

  this.element.style.visibility = "hidden";
  this.iframe.style.visibility = "hidden";

  this.iframe.style.width = "0";
  this.iframe.style.height = "0";
  this.iframe.style.margin = "0";
  this._width = 0;
  this._height = 0;

  this.element.appendChild(this.iframe);
  this.elementBounds = EPUBJS.core.bounds(this.element);

  return this.iframe;
};


EPUBJS.View.prototype.lock = function (what, width, height) {

  var elBorders = EPUBJS.core.borders(this.element);
  var iframeBorders;

  if (this.iframe) {
    iframeBorders = EPUBJS.core.borders(this.iframe);
  } else {
    iframeBorders = {width: 0, height: 0};
  }

  if (what == "width" && EPUBJS.core.isNumber(width)) {
    this.lockedWidth = width - elBorders.width - iframeBorders.width;
    this.resize(this.lockedWidth, width);
  }

  if (what == "height" && EPUBJS.core.isNumber(height)) {
    this.lockedHeight = height - elBorders.height - iframeBorders.height;
    this.resize(width, this.lockedHeight);
  }

  if (what === "both" &&
      EPUBJS.core.isNumber(width) &&
      EPUBJS.core.isNumber(height)) {

    this.lockedWidth = width - elBorders.width - iframeBorders.width;
    this.lockedHeight = height - elBorders.height - iframeBorders.height;

    this.resize(this.lockedWidth, this.lockedHeight);
  }
};

/**
 * 获取页面的高度与宽度并重置页面
 */
EPUBJS.View.prototype.expand = function () {
  var width = this.lockedWidth;
  var height = this.lockedHeight;

  var textWidth, textHeight;
  if (!this.iframe || this._expanding) return;

  this._expanding = true;

  // Expand Horizontally
  if (height && !width) {
    // Get the width of the text
    textWidth = this.textWidth();
    // Check if the textWidth has changed
    if (textWidth != this._textWidth) {
      // Get the contentWidth by resizing the iframe
      // Check with a min reset of the textWidth
      width = this.contentWidth(textWidth);
      // Save the textWdith
      this._textWidth = textWidth;
      // Save the contentWidth
      this._contentWidth = width;
    } else {
      // Otherwise assume content height hasn't changed
      width = this._contentWidth;
    }
  }

  // 竖屏展示
  if (width && !height) {
    //页面里文本的高度
    textHeight = this.textHeight();
    if (textHeight != this._textHeight) {
      height = this.contentHeight(textHeight);
      this._textHeight = textHeight;
      this._contentHeight = height;
    } else {
      height = this._contentHeight;
    }
  }

  // 只有当尺寸发生了变化调整或者框架仍是隐藏的，所以需要重新规划
  if (this._needsReframe || width != this._width || height != this._height) {
    this.resize(width, height);
  }

  this._expanding = false;
};

EPUBJS.View.prototype.contentWidth = function (min) {
  var prev;
  var width;

  // Save previous width
  prev = this.iframe.style.width;
  // Set the iframe size to min, width will only ever be greater
  // Will preserve the aspect ratio
  this.iframe.style.width = (min || 0) + "px";
  // Get the scroll overflow width
  width = this.document.body.scrollWidth;
  // Reset iframe size back
  this.iframe.style.width = prev;
  return width;
};

/**
 * 计算body元素内容的高度包含padding
 * @param min
 * @returns {number}
 */
EPUBJS.View.prototype.contentHeight = function (min) {
  var prev;
  var height;

  prev = this.iframe.style.height;
  this.iframe.style.height = (min || 0) + "px";
  height = this.document.body.scrollHeight;
  this.iframe.style.height = prev;
  return height;
};

/**
 * body的宽度
 * @returns {Number}
 */
EPUBJS.View.prototype.textWidth = function () {
  var width;
  var range = this.document.createRange();

  range.selectNodeContents(this.document.body);
  width = range.getBoundingClientRect().width;
  return width;

};

/**
 * body文本内容的高度
 * @returns {Number}
 */
EPUBJS.View.prototype.textHeight = function () {
  var height;
  var range = this.document.createRange();

  range.selectNodeContents(this.document.body);

  height = range.getBoundingClientRect().height;
  return height;
};

/**
 * 重新改变iframe大小
 * @param width
 * @param height
 */
EPUBJS.View.prototype.resize = function (width, height) {

  if (!this.iframe) return;

  if (EPUBJS.core.isNumber(width)) {
    this.iframe.style.width = width + "px";
    this._width = width;
  }

  if (EPUBJS.core.isNumber(height)) {
    this.iframe.style.height = height + "px";
    this._height = height;
  }

  this.iframeBounds = EPUBJS.core.bounds(this.iframe);

  this.reframe(this.iframeBounds.width, this.iframeBounds.height);

};

/**
 * 重新改变iframe父元素大小
 * @param width
 * @param height
 */
EPUBJS.View.prototype.reframe = function (width, height) {

  if (!this.displayed) {
    this._needsReframe = true; //重新规划
    return;
  }

  if (EPUBJS.core.isNumber(width)) {
    this.element.style.width = width + "px";
  }

  if (EPUBJS.core.isNumber(height)) {
    this.element.style.height = height + "px";
  }

  this.prevBounds = this.elementBounds;

  this.elementBounds = EPUBJS.core.bounds(this.element);

  this.trigger("resized", {
    width: this.elementBounds.width,
    height: this.elementBounds.height,
    widthDelta: this.elementBounds.width - this.prevBounds.width,
    heightDelta: this.elementBounds.height - this.prevBounds.height
  });

};

/**
 * 下载页面
 * @param _request
 * @returns {*|Promise}
 */
EPUBJS.View.prototype.render = function (_request) {

  this.rendering = true;

  return this.section.render(_request)
      .then(function (contents) {
        return this.load(contents);
      }.bind(this));
};

/**
 * iframe加载页面
 * @param contents
 * @returns {*}
 */
EPUBJS.View.prototype.load = function (contents) {
  var loading = new RSVP.defer();
  var loaded = loading.promise;

  if (!this.iframe) {
    loading.reject(new Error("没有可用的iframe！"));
    return loaded;
  }

  this.iframe.onload = function () {
    this.window = this.iframe.contentWindow;
    this.document = this.iframe.contentDocument;
    this.rendering = false;
    loading.resolve(this);

  }.bind(this);

  this.document = this.iframe.contentDocument;

  if (!this.document) {
    loading.reject(new Error("没有有效的document"));
    return loaded;
  }

  this.document.open();
  this.document.write(contents);
  this.document.close();
  return loaded;
};

/**
 * 页面显示之前所做的准备工作
 * @returns {*}
 */
EPUBJS.View.prototype.display = function () {
  var displayed = new RSVP.defer();

  this.displayed = true;

  this.layout();

  this.listeners();

  this.expand();

  this.onDisplayed(this);

  displayed.resolve(this);

  return displayed.promise;
};

/**
 * 更改页面的布局
 * @param layoutFunc
 */
EPUBJS.View.prototype.layout = function (layoutFunc) {

  this.iframe.style.display = "inline-block";
  this.document.body.style.margin = "0";
  if (layoutFunc) {
    layoutFunc(this);
  }

  this.onLayout(this);

};

/**
 * 添加图片下载事件、鼠标事件、选中事件
 */
EPUBJS.View.prototype.listeners = function () {
  // Wait for fonts to load to finish
  // http://dev.w3.org/csswg/css-font-loading/
  // Not implemented fully except in chrome

  if (this.document.fonts && this.document.fonts.status === "loading") {
    // console.log("fonts unloaded");
    this.document.fonts.onloadingdone = function () {
      // console.log("loaded fonts");
      this.expand();
    }.bind(this);
  }

  this.imageLoadListeners();

  this.addEventListeners();

  this.addSelectionListeners();
};

EPUBJS.View.prototype.removeListeners = function () {

  this.removeEventListeners();

  this.removeSelectionListeners();
};

EPUBJS.View.prototype.imageLoadListeners = function () {
  var images = this.document.body.querySelectorAll("img");
  var img;
  for (var i = 0; i < images.length; i++) {
    img = images[i];

    if (typeof img.naturalWidth !== "undefined" &&
        img.naturalWidth === 0) {
      img.onload = this.expand.bind(this);
    }
  }
};

EPUBJS.View.prototype.show = function () {

  this.element.style.visibility = "visible";

  if (this.iframe) {
    this.iframe.style.visibility = "visible";
  }

  this.trigger("shown", this);
};

EPUBJS.View.prototype.hide = function () {
  this.element.style.visibility = "hidden";
  this.iframe.style.visibility = "hidden";

  this.trigger("hidden", this);
};

EPUBJS.View.prototype.position = function () {
  return this.element.getBoundingClientRect();
};

EPUBJS.View.prototype.bounds = function () {
  if (!this.elementBounds) {
    this.elementBounds = EPUBJS.core.bounds(this.element);
  }
  return this.elementBounds;
};

/**
 * 销毁页面
 */
EPUBJS.View.prototype.destroy = function () {

  if (this.displayed) {
    this.removeListeners();

    this.element.removeChild(this.iframe);
    this.displayed = false;
    this.iframe = null;

    this._textWidth = null;
    this._textHeight = null;
    this._width = null;
    this._height = null;
  }
};

/**
 * 添加鼠标与键盘事件
 */
EPUBJS.View.prototype.addEventListeners = function () {
  if (!this.document) {
    return;
  }
  this.listenedEvents.forEach(function (eventName) {
    this.document.addEventListener(eventName, this.triggerEvent.bind(this), false);
  }, this);

};

EPUBJS.View.prototype.removeEventListeners = function () {
  if (!this.document) {
    return;
  }
  this.listenedEvents.forEach(function (eventName) {
    this.document.removeEventListener(eventName, this.triggerEvent, false);
  }, this);

};

EPUBJS.View.prototype.triggerEvent = function (e) {
  this.trigger(e.type, e);
};

EPUBJS.View.prototype.addSelectionListeners = function () {
  if (!this.document) {
    return;
  }
  this.document.addEventListener("selectionchange", this.onSelectionChange.bind(this), false);
};

EPUBJS.View.prototype.removeSelectionListeners = function () {
  if (!this.document) {
    return;
  }
  this.document.removeEventListener("selectionchange", this.onSelectionChange, false);
};

EPUBJS.View.prototype.onSelectionChange = function (e) {
  if (this.selectionEndTimeout) {
    clearTimeout(this.selectionEndTimeout);
  }
  this.selectionEndTimeout = setTimeout(function () {
    this.selectedRange = this.window.getSelection();
    this.trigger("selected", this.selectedRange);
  }.bind(this), 500);
};

RSVP.EventTarget.mixin(EPUBJS.View.prototype);
