/**
 * Created by wangwy on 15-9-7.
 */
EPUBJS.Rendition = function (book, options) {
  this.settings = EPUBJS.core.extend(this.settings || {}, {
    infinite: true,
    hidden: false,
    width: false,
    height: null,
    layoutOveride: null,
    axis: "vertical"
  });

  EPUBJS.core.extend(this.settings, options);

  this.book = book;
  this.views = null;

  EPUBJS.Hooks.mixin(this);
  this.getHooks("beforeChapterDisplay");
  this.registerHook("beforeChapterDisplay", EPUBJS.replace.links.bind(this), true);

  this.q = new EPUBJS.Queue(this);
  this.q.enqueue(this.book.opened);
  this.q.enqueue(this.parseLayoutProperties);
};

/**
 * 获取书籍的布局方式
 * @param _metadata
 * @returns {{layout: (null|EPUBJS.Book.settings.layoutOveride|*|EPUBJS.Book.parseLayoutProperties.layout|metadata.layout|EPUBJS.Renderer.layout), spread: (null|EPUBJS.Book.settings.layoutOveride|*|EPUBJS.Book.parseLayoutProperties.spread|metadata.spread|string), orientation: (null|EPUBJS.Book.settings.layoutOveride|*|EPUBJS.Book.settings.orientation|EPUBJS.Book.parseLayoutProperties.orientation|metadata.orientation)}|*}
 */
EPUBJS.Rendition.prototype.parseLayoutProperties = function (_metadata) {
  var metadata = _metadata || this.book.package.metadata;
  var layout = (this.layoutOveride && this.layoutOveride.layout) || metadata.layout || "reflowable";
  var spread = (this.layoutOveride && this.layoutOveride.spread) || metadata.spread || "auto";
  var orientation = (this.layoutOveride && this.layoutOveride.orientation) || metadata.orientation || "auto";
  this.globalLayoutProperties = {
    layout: layout,
    spread: spread,
    orientation: orientation
  };
  return this.globalLayoutProperties;
};

/**
 * 创建一个div，设置高度与宽度
 * @param _options
 * @returns {HTMLElement}
 */
EPUBJS.Rendition.prototype.initialize = function (_options) {
  var options = _options || {};
  var height = options.height;
  var width = options.width;
  var container;

  if (options.height && EPUBJS.core.isNumber(options.height)) {
    height = options.height + "px";
  }

  if (options.width && EPUBJS.core.isNumber(options.width)) {
    width = options.width + "px";
  }

  container = document.createElement("div");
  container.id = "epubjs-container:" + EPUBJS.core.uuid();
  container.setAttribute("class", "epub-container");

  container.style.fontSize = "0";
  container.style.wordSpacing = "0";
  container.style.lineHeight = "0";
  container.style.verticalAlign = "top";

  if (this.settings.axis === "horizontal") {
    container.style.whiteSpace = "nowrap";
  }

  if (width) {
    container.style.width = width;
  }

  if (height) {
    container.style.height = height;
  }

  container.style.overflow = this.settings.overflow;

  return container;
};

/**
 * 创建一个div用于隐藏container
 * @param container
 * @returns {HTMLElement}
 */
EPUBJS.Rendition.wrap = function (container) {
  var wrapper = document.createElement("div");

  wrapper.style.visibility = "hidden";
  wrapper.style.overflow = "hidden";
  wrapper.style.width = "0";
  wrapper.style.height = "0";

  wrapper.appendChild(container);
  return wrapper;
};

/**
 * 将新创建的elem添加到页面
 * @param _element
 */
EPUBJS.Rendition.prototype.attachTo = function (_element) {
  this.container = this.initialize({
    "width": this.settings.width,
    "height": this.settings.height
  });

  if (EPUBJS.core.isElement(_element)) {
    this.element = _element;
  } else if (typeof _element === "string") {
    this.element = document.getElementById(_element);
  }

  if (!this.element) {
    console.error("不是一个element");
    return;
  }

  if (this.settings.hidden) {
    this.wrapper = this.wrap(this.container);
    this.element.appendChild(this.wrapper);
  } else {
    this.element.appendChild(this.container);
  }

  this.views = new EPUBJS.Views(this.container);

  this.attachListeners();

  this.stageSize();

  this.applyLayoutMethod();

  this.trigger("attached");
};

EPUBJS.Rendition.prototype.display = function (target) {
  return this.q.enqueue(this._display, target);
};

/**
 * 展示页面
 * @param target
 * @returns {*}
 * @private
 */
EPUBJS.Rendition.prototype._display = function (url) {
  var split, href, eleId, section;
  if(url){
    split = url.split("#");
    href = split[0];
    eleId = split[1] || false;
  }
  section = this.book.spine.get(href);
  if (!section) {
    console.error("没有发现要展示的资源");
    return;
  }

  this.views.hide();

  //新建一个页面
  var view = new EPUBJS.View(section, this.viewSettings);

  this.views.clear();
  //只是添加div，iframe还没有下载
  this.views.append(view);
  view.onDisplayed = this.afterDisplayed.bind(this);

  return this.render(view).
      then(function () {
        this.views.show();
      }.bind(this)).
      then(function () {
        //如果跳转路径里有锚点，跳转到锚点所在的位置
        if (eleId) {
          this.gotoEleById(view, eleId);
        }
      }.bind(this)).
      then(function () {
        this.trigger("displayed", section);
      }.bind(this));
};

EPUBJS.Rendition.prototype.gotoEleById = function (view, eleId) {
  var eleScroll = view.getEleScroll(eleId);
  if(this.settings.axis === "vertical"){
    this.scrollBy(0, eleScroll.top, true);
  }else{
    var offsetLeft = Math.floor(eleScroll.left / this.layout.delta) * this.layout.delta;
    this.scrollBy(offsetLeft, 0, true);
  }
};

/**
 * 加载页面
 * @param view
 * @returns {*}
 */
EPUBJS.Rendition.prototype.render = function (view) {
  view.create();

  view.onLayout = this.layout.format.bind(this.layout);

  this.resizeView(view);

  return view.render(this.book.request)
      .then(function () {
        return this.triggerHooks("beforeChapterDisplay", view, this);
      }.bind(this))
      .then(function () {
        return view.display();
      })
      .then(function () {
        if (this.views.hidden === false) {
          this.q.enqueue(function (view) {
            view.show();
          }, view);
        }
        this.trigger("rendered", view.section);
      }.bind(this))
};

/**
 * 展现后的操作（此方法被重写）
 * @param view
 */
EPUBJS.Rendition.prototype.afterDisplayed = function (view) {
  this.trigger("added", view.section);
};

/**
 * 添加重置事件
 */
EPUBJS.Rendition.prototype.attachListeners = function () {
  if (!EPUBJS.core.isNumber(this.settings.width) || !EPUBJS.core.isNumber(this.settings.height)) {
    window.addEventListener("resize", this.resize.bind(this), false);
  }
};

/**
 * 重置页面
 * @param width
 * @param height
 */
EPUBJS.Rendition.prototype.resize = function (width, height) {
  this.stageSize(width, height);
  this.updateLayout();
  this.trigger("resized", {
    width: this.stage.width,
    height: this.stage.height
  });
};

/**
 * 初始化layout
 */
EPUBJS.Rendition.prototype.applyLayoutMethod = function () {
  this.layout = new EPUBJS.Layout.Scroll();
  this.updateLayout();
  this.map = new EPUBJS.Map(this.layout);
};

/**
 * 更新页面布局
 */
EPUBJS.Rendition.prototype.updateLayout = function () {
  this.layout.calculate(this.stage.width, this.stage.height);
};

/**
 * 计算显示区域的高度与宽度
 * @param _width
 * @param _height
 * @returns {{width: number, height: number}|*}
 */
EPUBJS.Rendition.prototype.stageSize = function (_width, _height) {
  var bounds;
  var width = _width || this.settings.width;
  var height = _height || this.settings.height;

  if (width === false) {
    bounds = this.element.getBoundingClientRect();

    if (bounds.width) {
      width = bounds.width;
      this.container.style.width = bounds.width + "px";
    }
  }

  if (height === false) {
    bounds = bounds || this.element.getBoundingClientRect();

    if (bounds.height) {
      height = bounds.height;
      this.container.style.height = bounds.height + "px";
    }
  }

  if (width && !EPUBJS.core.isNumber(width)) {
    bounds = this.container.getBoundingClientRect();
    width = bounds.width;
  }

  if (height && !EPUBJS.core.isNumber(height)) {
    bounds = bounds || this.container.getBoundingClientRect();
    height = bounds.height;
  }

  this.containerStyles = window.getComputedStyle(this.container);
  this.containerPadding = {
    left: parseFloat(this.containerStyles["padding-left"]) || 0,
    right: parseFloat(this.containerStyles["padding-right"]) || 0,
    top: parseFloat(this.containerStyles["padding-top"]) || 0,
    bottom: parseFloat(this.containerStyles["padding-bottom"]) || 0
  };

  this.stage = {
    width: width -
        this.containerPadding.left -
        this.containerPadding.right,
    height: height -
        this.containerPadding.top -
        this.containerPadding.bottom
  };

  return this.stage;
};

/**
 * 重置显示区域
 * @param view
 */
EPUBJS.Rendition.prototype.resizeView = function (view) {
  if (this.globalLayoutProperties.layout === "pre-paginated") {
    view.lock("both", this.stage.width, this.stage.height);
  } else {
    view.lock("width", this.stage.width, this.stage.height);
  }
};

/**
 * 判断章节是否该显示
 * @param view
 * @param offsetPrev
 * @param offsetNext
 * @param _container
 * @returns {boolean}
 */
EPUBJS.Rendition.prototype.isVisible = function (view, offsetPrev, offsetNext, _container) {
  var position = view.position();
  var container = _container || this.container.getBoundingClientRect();

  if (this.settings.axis === "horizontal" &&
      position.right > container.left - offsetPrev &&
      position.left < container.right + offsetNext) {
    return true;
  } else if (this.settings.axis === "vertical" &&
      position.bottom > container.top - offsetPrev &&
      position.top < container.bottom + offsetNext) {
    return true;
  }

  return false;
};

/**
 * 跳转多少
 * @param x
 * @param y
 * @param silent
 */
EPUBJS.Rendition.prototype.scrollBy = function (x, y, silent) {
  if (silent) {
    this.ignore = true;
  }
  if (this.settings.height) {
    if (x) this.container.scrollLeft += x;
    if (y) this.container.scrollTop += y;
  } else {
    window.scrollBy(x, y);
  }

  this.scrolled = true;
};

/**
 * 跳转到
 * @param x
 * @param y
 * @param silent
 */
EPUBJS.Rendition.prototype.scrollTo = function (x, y, silent) {
  if (silent) {
    this.ignore = true;
  }

  if (this.settings.height) {
    this.container.scrollLeft = x;
    this.container.scrollTop = y;
  } else {
    window.scrollTo(x, y);
  }

  this.scrolled = true;
};

/**
 * 获取浏览器window的高度与宽度
 * @returns {*}
 */
EPUBJS.Rendition.prototype.bounds = function () {
  var bounds;

  if (!this.settings.height) {
    bounds = EPUBJS.core.windowBounds();
  } else {
    bounds = this.container.getBoundingClientRect();
  }

  return bounds;
};

/**
 * 清楚加载的div
 */
EPUBJS.Rendition.prototype.destroy = function () {
  this.q.clear();
  this.views.clear();

  clearTimeout(this.trimTimeout);
  if (this.settings.hidden) {
    this.element.removeChild(this.wrapper);
  } else {
    this.element.removeChild(this.container);
  }
};

/**
 * 报告位置
 */
EPUBJS.Rendition.prototype.reportLocation = function () {
  return this.q.enqueue(function () {
    this.location = this.currentLocation();
    this.trigger("locationChanged", this.location);
  }.bind(this));
};

/**
 * 当前位置(会被重写)
 * @returns {*}
 */
EPUBJS.Rendition.prototype.currentLocation = function () {
  var view;
  if(this.views.length){
    view = this.views.first();
    return this.map.page(view);
  }
};

/**
 * 获取当前页的位置
 * @returns {*}
 */
EPUBJS.Rendition.prototype.getCurrentLocation = function () {
  if(this.location){
    return this.location;
  }
  return this.currentLocation();
};

/**
 * 获取在显示区域内的页面
 * @returns {Array}
 */
EPUBJS.Rendition.prototype.visible = function () {
  var container = this.bounds();
  var displayedViews = this.views.displayed();
  var visible = [];
  var isVisible;
  var view;

  for(var i = 0; i < displayedViews.length; i++){
    view = displayedViews[i];
    isVisible = this.isVisible(view, 0, 0, container);

    if(isVisible === true){
      visible.push(view);
    }
  }

  return visible;
};

RSVP.EventTarget.mixin(EPUBJS.Rendition.prototype);