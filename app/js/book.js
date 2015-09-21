/**
 * Created by wangwy on 15-9-7.
 */
EPUBJS.Book = function (_url) {
  this.opening = new RSVP.defer();
  this.opened = this.opening.promise;

  this.url = undefined;

  this.loading = {
    manifest: new RSVP.defer(),
    spine: new RSVP.defer(),
    metadata: new RSVP.defer(),
    cover: new RSVP.defer(),
    navigation: new RSVP.defer()
  };

  this.loaded = {
    manifest: this.loading.manifest.promise,
    spine: this.loading.spine.promise,
    metadata: this.loading.metadata.promise,
    cover: this.loading.cover.promise,
    navigation: this.loading.navigation.promise
  };

  this.ready = RSVP.hash(this.loaded);

  this.request = this.requestMethod.bind(this);

  this.spine = new EPUBJS.Spine(this.request);

  if(_url){
    this.open(_url);
  }
};

/**
 * 根据_url打开电子书
 * @param _url
 * @returns {*|EPUBJS.Book.opened}
 */
EPUBJS.Book.prototype.open = function(_url){
  var uri;
  var parse = new EPUBJS.Parser();
  var epubPackage;
  var book = this;
  var containerPath = "META-INF/container.xml";
  var location;
  this.containerUrl = _url + containerPath;

  epubPackage = this.request(this.containerUrl).
      then(function(containerXml){
        return parse.container(containerXml);
      }).
      then(function(paths){
        var packageUri = EPUBJS.core.uri(paths.packagePath);
        book.packageUrl = _url + paths.packagePath;
        book.encoding = paths.encoding;

        if(packageUri.origin) {
          book.url = packageUri.base;
        } else if(window){
          location = EPUBJS.core.uri(window.location.href);
          book.url = EPUBJS.core.resolveUrl(location.base, _url + packageUri.directory);
        } else {
          book.url = packageUri.directory;
        }

        return book.request(book.packageUrl);
      });

  epubPackage.then(function(packageXml) {
    //从epug opf里获取包的信息
    book.unpack(packageXml);

    book.loading.manifest.resolve(book.package.manifest);
    book.loading.metadata.resolve(book.package.metadata);
    book.loading.spine.resolve(book.spine);
    book.loading.cover.resolve(book.cover);

    book.isOpen = true;

    book.opening.resolve(book);
  });

  return this.opened;
};

/**
 * 从epug opf里获取包的信息
 * @param packageXml
 */
EPUBJS.Book.prototype.unpack = function(packageXml){
  var book = this,
      parse = new EPUBJS.Parser();

  book.package = parse.packageContents(packageXml);
  book.package.baseUrl = book.url;

  this.spine.load(book.package);

  book.navigation = new EPUBJS.Navigation(book.package, this.request);
  book.navigation.load().then(function(toc){
    book.toc = toc;
    book.loading.navigation.resolve(book.toc);
  });
  book.cover = book.url + book.package.coverPath;
};

/**
 * 获取request方法
 * @param _url
 * @returns {*}
 */
EPUBJS.Book.prototype.requestMethod = function (_url) {
  if (this.archive) {

  } else {
    return EPUBJS.core.request(_url, 'xml');
  }
};

/**
 * 根据节点与设置判断展现方式
 * @param element
 * @param options
 * @returns {*}
 */
EPUBJS.Book.prototype.renderTo = function(element, options){
  var renderer = (options && options.method) ?
      options.method.charAt(0).toUpperCase() + options.method.substr(1) :
      "Rendition";
  this.rendition = new EPUBJS[renderer](this, options);
  this.rendition.attachTo(element);
  return this.rendition;
};

RSVP.EventTarget.mixin(EPUBJS.Book.prototype);