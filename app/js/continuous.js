EPUBJS.Continuous = function(book, options) {

  EPUBJS.Rendition.apply(this, arguments);

  this.settings = EPUBJS.core.extend(this.settings || {}, {
    infinite: true,
    overflow: "auto",
    axis: "vertical",
    offset: 500,
    offsetDelta: 250
  });

  EPUBJS.core.extend(this.settings, options);

  this.viewSettings = {};
  if(this.settings.hidden) {
    this.wrapper = this.wrap(this.container);
  }
};

//继承continuous
EPUBJS.Continuous.prototype = Object.create(EPUBJS.Rendition.prototype);
EPUBJS.Continuous.prototype.constructor = EPUBJS.Continuous;

EPUBJS.Continuous.prototype.attachListeners = function(){

  if(!EPUBJS.core.isNumber(this.settings.width) ||
      !EPUBJS.core.isNumber(this.settings.height) ) {
    window.addEventListener("resize", this.resize.bind(this), false);
  }

  if(this.settings.infinite) {
    this.start();
  }

};

/**
 * 页面展示之后判断前后页面是否显示
 * @param currView
 */
EPUBJS.Continuous.prototype.afterDisplayed = function(currView){
  var next = currView.section.next();
  var prev = currView.section.prev();
  var index = this.views.indexOf(currView);
  var prevView, nextView;

  if(index + 1 === this.views.length && next) {
    nextView = new EPUBJS.View(next, this.viewSettings);
    this.q.enqueue(this.append, nextView);
  }

  if(index === 0 && prev) {
    prevView = new EPUBJS.View(prev, this.viewSettings);
    this.q.enqueue(this.prepend, prevView);
  }
};

/**
 * 添加下一页
 * @param view
 * @returns {*}
 */
EPUBJS.Continuous.prototype.append = function(view){

  view.onDisplayed = this.afterDisplayed.bind(this);

  this.views.append(view);

  return this.check();
};

/**
 * 添加上一页
 * @param view
 * @returns {*}
 */
EPUBJS.Continuous.prototype.prepend = function(view){
  view.onDisplayed = this.afterDisplayed.bind(this);

  this.views.prepend(view);
  return this.check();
};

/**
 * 判断页面是否渲染
 * @param _offset
 * @returns {*}
 */
EPUBJS.Continuous.prototype.check = function(_offset){
  var checking = new RSVP.defer();
  var container = this.bounds();
  var promises = [];
  var offset = _offset || this.settings.offset;

  this.views.each(function(view){
    var visible = this.isVisible(view, offset, offset, container);

    if(visible) {

      if(!view.displayed && !view.rendering) {
        promises.push(this.render(view));
      }

    } else {

      if(view.displayed) {
        this.q.enqueue(view.destroy.bind(view));
        clearTimeout(this.trimTimeout);
        this.trimTimeout = setTimeout(function(){
          this.q.enqueue(this.trim);
        }.bind(this), 250);
      }

    }

  }.bind(this));


  if(promises.length){

    return RSVP.all(promises)
        .then(function() {
          this.q.enqueue(this.check);

        }.bind(this));

  } else {
    checking.resolve();

    return checking.promise;
  }

};

EPUBJS.Continuous.prototype.trim = function(){
  var task = new RSVP.defer();
  var displayed = this.views.displayed();
  var first = displayed[0];
  var last = displayed[displayed.length-1];
  var firstIndex = this.views.indexOf(first);
  var lastIndex = this.views.indexOf(last);
  var above = this.views.slice(0, firstIndex);
  var below = this.views.slice(lastIndex+1);

  for (var i = 0; i < above.length-1; i++) {
    this.erase(above[i], above);
  }

  for (var j = 1; j < below.length; j++) {
    this.erase(below[j]);
  }

  task.resolve();
  return task.promise;
};

EPUBJS.Continuous.prototype.erase = function(view, above){ //Trim
  var prevTop;
  var prevLeft;

  if(this.settings.height) {
    prevTop = this.container.scrollTop;
    prevLeft = this.container.scrollLeft;
  } else {
    prevTop = window.pageYOffset;
    prevLeft = window.pageXOffset;
  }

  var bounds = view.bounds();

  this.views.remove(view);

  if(above) {

    if(this.settings.axis === "vertical") {
      this.scrollTo(0, prevTop - bounds.height, true);
    } else {
      this.scrollTo(prevLeft - bounds.width, 0, true);
    }
  }

};

EPUBJS.Continuous.prototype.start = function() {
  this.tick = EPUBJS.core.requestAnimationFrame;

  if(this.settings.height) {
    this.prevScrollTop = this.container.scrollTop;
    this.prevScrollLeft = this.container.scrollLeft;
  } else {
    this.prevScrollTop = window.pageYOffset;
    this.prevScrollLeft = window.pageXOffset;
  }

  this.scrollDeltaVert = 0;
  this.scrollDeltaHorz = 0;

  window.addEventListener("scroll", function(e){
    if(!this.ignore) {
      this.scrolled = true;
    } else {
      this.ignore = false;
    }
  }.bind(this));

  window.addEventListener('unload', function(){
    this.ignore = true;
    this.destroy();
  }.bind(this));

  this.tick.call(window, this.onScroll.bind(this));

  this.scrolled = false;

};

EPUBJS.Continuous.prototype.onScroll = function(){
  if(this.scrolled) {
    var scrollTop, scrollLeft;
    if(this.settings.height) {
      scrollTop = this.container.scrollTop;
      scrollLeft = this.container.scrollLeft;
    } else {
      scrollTop = window.pageYOffset;
      scrollLeft = window.pageXOffset;
    }

    if(!this.ignore) {
      if((this.scrollDeltaVert === 0 &&
          this.scrollDeltaHorz === 0) ||
          this.scrollDeltaVert > this.settings.offsetDelta ||
          this.scrollDeltaHorz > this.settings.offsetDelta) {
        this.q.enqueue(this.check);

        this.scrollDeltaVert = 0;
        this.scrollDeltaHorz = 0;

      }

    } else {
      this.ignore = false;
    }

    this.scrollDeltaVert += Math.abs(scrollTop-this.prevScrollTop);
    this.scrollDeltaHorz += Math.abs(scrollLeft-this.prevScrollLeft);

    if(this.settings.height) {
      this.prevScrollTop = this.container.scrollTop;
      this.prevScrollLeft = this.container.scrollLeft;
    } else {
      this.prevScrollTop = window.pageYOffset;
      this.prevScrollLeft = window.pageXOffset;
    }


    clearTimeout(this.scrollTimeout);
    this.scrollTimeout = setTimeout(function(){
      this.scrollDeltaVert = 0;
      this.scrollDeltaHorz = 0;
    }.bind(this), 150);


    this.scrolled = false;
  }

  this.tick.call(window, this.onScroll.bind(this));
};


EPUBJS.Continuous.prototype.resizeView = function(view) {

  if(this.settings.axis === "horizontal") {
    view.lock("height", this.stage.width, this.stage.height);
  } else {
    view.lock("width", this.stage.width, this.stage.height);
  }

};

