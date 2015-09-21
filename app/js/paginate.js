/**
 * Created by wangwy on 15-9-17.
 */
EPUBJS.Paginate = function (book, options) {
  EPUBJS.Continuous.apply(this, arguments);

  this.settings = EPUBJS.core.extend(this.settings || {}, {
    width: 600,
    height: 400,
    axis: "horizontal",
    forceSingle: false,
    minSpreadWidth: 800,
    gap: "auto",
    overflow: "hidden",
    infinite: false
  });

  EPUBJS.core.extend(this.settings, options);

  this.isForcedSingle = this.settings.forceSingle;

  this.viewSettings = {
    axis: this.settings.axis
  };
};

EPUBJS.Paginate.prototype = Object.create(EPUBJS.Continuous.prototype);
EPUBJS.Paginate.prototype.constructor = EPUBJS.Paginate;

/**
 * 重写rendition的applyLayoutMethod方法
 */
EPUBJS.Paginate.prototype.applyLayoutMethod = function () {
  this.layout = new EPUBJS.Layout.Reflowable();
  this.updateLayout();
  this.map = new EPUBJS.Map(this.layout);
};

/**
 * 重新布局
 */
EPUBJS.Paginate.prototype.updateLayout = function () {
  this.spreads = this.determineSpreads(this.settings.minSpreadWidth);
  this.layout.calculate(
      this.stage.width,
      this.stage.height,
      this.settings.gap,
      this.spreads
  );

  this.settings.offset = this.layout.delta;
};

/**
 * 判断是单页显示还是双页显示
 * @param cutoff
 * @returns {number}
 */
EPUBJS.Paginate.prototype.determineSpreads = function (cutoff) {
  if(this.isForcedSingle || !cutoff || this.bounds().width < cutoff){
    return 1; //-- 单页显示
  }else{
    return 2; //-- 双页显示
  }
};

/**
 * 下一页
 * @returns {*}
 */
EPUBJS.Paginate.prototype.next = function () {
  return this.q.enqueue(function () {
    if(this.container.scrollLeft +
       this.container.offsetWidth +
       this.layout.delta < this.container.scrollWidth){
      this.scrollBy(this.layout.delta, 0);
    }else{
      this.scrollTo(this.container.scrollWidth - this.layout.delta, 0);
    }

    return this.check();
  })
};

/**
 * 上一页
 * @returns {*}
 */
EPUBJS.Paginate.prototype.prev = function () {
  return this.q.enqueue(function(){
    this.scrollBy(-this.layout.delta, 0);
    return this.check();
  })
};