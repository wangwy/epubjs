/**
 * Created by wangwy on 15-9-7.
 */
EPUBJS.core = {};

EPUBJS.core.request = function (url, type, withCredentials) {
  var supportsURL = window.URL;
  var BLOB_RESPONSE = supportsURL ? "blob" : "arraybuffer";

  var deferred = new RSVP.defer();

  var xhr = new XMLHttpRequest();

  //-- Check from PDF.js:
  //   https://github.com/mozilla/pdf.js/blob/master/web/compatibility.js
  var xhrPrototype = XMLHttpRequest.prototype;

  if (!('overrideMimeType' in xhrPrototype)) {
    // IE10 might have response, but not overrideMimeType
    Object.defineProperty(xhrPrototype, 'overrideMimeType', {
      value: function xmlHttpRequestOverrideMimeType(mimeType) {
      }
    });
  }
  if (withCredentials) {
    xhr.withCredentials = true;
  }
  xhr.open("GET", url, true);
  xhr.onreadystatechange = handler;

  if (type == 'blob') {
    xhr.responseType = BLOB_RESPONSE;
  }

  if (type == "json") {
    xhr.setRequestHeader("Accept", "application/json");
  }

  if (type == 'xml') {
    xhr.overrideMimeType('text/xml');
  }

  if (type == "binary") {
    xhr.responseType = "arraybuffer";
  }

  xhr.send();

  function handler() {
    if (this.readyState === this.DONE) {
      if (this.status === 200) { // || this.responseXML-- Firefox is reporting 0 for blob urls
        var r;

        if (type == 'xml') {
          r = new DOMParser().parseFromString(this.responseText, 'text/xml');
        } else if (type == 'json') {
          r = JSON.parse(this.responseText);
        } else if (type == 'blob') {

          if (supportsURL) {
            r = this.responseText;
          } else {
            //-- Safari doesn't support responseType blob, so create a blob from arraybuffer
            r = new Blob([this.responseText]);
          }

        } else {
          r = this.responseText;
        }

        deferred.resolve(r);
      } else {
        deferred.reject({
          message: this.responseText,
          stack: new Error().stack
        });
      }
    }
  }

  return deferred.promise;
};


/**
 * 格式化url路径
 * @param url
 * @returns {{protocol: string, host: string, path: string, origin: string, directory: string, base: string, filename: string, extension: string, fragment: string, href: *}}
 */
EPUBJS.core.uri = function (url) {
  var uri = {
        protocol: '',
        host: '',
        path: '',
        origin: '',
        directory: '',
        base: '',
        filename: '',
        extension: '',
        fragment: '',
        href: url
      },
      blob = url.indexOf('blob:'),
      doubleSlash = url.indexOf('://'),
      search = url.indexOf('?'),
      fragment = url.indexOf("#"),
      withoutProtocol,
      dot,
      firstSlash;

  if (blob === 0) {
    uri.protocol = "blob";
    uri.base = url.indexOf(0, fragment);
    return uri;
  }

  if (fragment != -1) {
    uri.fragment = url.slice(fragment + 1);
    url = url.slice(0, fragment);
  }

  if (search != -1) {
    uri.search = url.slice(search + 1);
    url = url.slice(0, search);
    href = url;
  }

  if (doubleSlash != -1) {
    uri.protocol = url.slice(0, doubleSlash);
    withoutProtocol = url.slice(doubleSlash + 3);
    firstSlash = withoutProtocol.indexOf('/');

    if (firstSlash === -1) {
      uri.host = uri.path;
      uri.path = "";
    } else {
      uri.host = withoutProtocol.slice(0, firstSlash);
      uri.path = withoutProtocol.slice(firstSlash);
    }


    uri.origin = uri.protocol + "://" + uri.host;

    uri.directory = EPUBJS.core.folder(uri.path);

    uri.base = uri.origin + uri.directory;
    // return origin;
  } else {
    uri.path = url;
    uri.directory = EPUBJS.core.folder(url);
    uri.base = uri.directory;
  }

  //-- Filename
  uri.filename = url.replace(uri.base, '');
  dot = uri.filename.lastIndexOf('.');
  if (dot != -1) {
    uri.extension = uri.filename.slice(dot + 1);
  }
  return uri;
};

/**
 * 获取url的路径
 * @param url
 * @returns {string}
 */
EPUBJS.core.folder = function (url) {

  var lastSlash = url.lastIndexOf('/');

  if (lastSlash == -1) var folder = '';

  folder = url.slice(0, lastSlash + 1);

  return folder;

};

/**
 * 获取路径的绝对路径
 * @param base
 * @param path
 * @returns {*}
 */
EPUBJS.core.resolveUrl = function (base, path) {
  var url,
      segments = [],
      uri = EPUBJS.core.uri(path),
      folders = base.split("/"),
      paths;

  if (uri.host) {
    return path;
  }

  folders.pop();

  paths = path.split("/");
  paths.forEach(function (p) {
    if (p === "..") {
      folders.pop();
    } else {
      segments.push(p);
    }
  });

  url = folders.concat(segments);

  return url.join("/");
};

/**
 * 检验数字是否为有效数字（非无穷大、非NaN）
 * @param n
 * @returns {boolean}
 */
EPUBJS.core.isNumber = function(n){
  return !isNaN(parseFloat(n)) && isFinite(n);
};

/**
 * 将对象的属性复制给target
 * @param target
 * @returns {*}
 */
EPUBJS.core.extend = function(target){
  var sources = [].slice.call(arguments,1);
  sources.forEach(function(source){
    if(!source) return;
    Object.getOwnPropertyNames(source).forEach(function(propName){
      Object.defineProperty(target, propName, Object.getOwnPropertyDescriptor(source, propName));
    });
  });
  return target;
};

/**
 * 页面加载前所执行的动画函数
 */
EPUBJS.core.requestAnimationFrame = window.requestAnimationFrame;

/**
 * 形成唯一标识
 * @returns {string}
 */
EPUBJS.core.uuid = function() {
  var d = new Date().getTime();
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = (d + Math.random()*16)%16 | 0;
    d = Math.floor(d/16);
    return (c=='x' ? r : (r&0x7|0x8)).toString(16);
  });
  return uuid;
};

/**
 * 判断是否是节点
 * @param obj
 * @returns {boolean}
 */
EPUBJS.core.isElement = function(obj){
  return !!(obj && obj.nodeType == 1);
};

/**
 * 获取节点的高度与宽度
 * @param el
 * @returns {{height: number, width: number}}
 */
EPUBJS.core.bounds = function(el){
  var style = window.getComputedStyle(el);
  var widthProps = ["width", "paddingRight", "paddingLeft", "marginRight", "marginLeft", "borderRightWidth", "borderLeftWidth"];
  var heightProps = ["height", "paddingTop", "paddingBottom", "marginTop", "marginBottom", "borderTopWidth", "borderBottomWidth"];

  var width = 0;
  var height = 0;

  widthProps.forEach(function(prop){
    width += parseFloat(style[prop]) || 0;
  });

  heightProps.forEach(function(prop){
    height += parseFloat(style[prop]) || 0;
  });

  return {
    height: height,
    width: width
  };
};

/**
 * 获取节点的边框的宽度
 * @param el
 * @returns {{height: number, width: number}}
 */
EPUBJS.core.borders = function(el) {

  var style = window.getComputedStyle(el);
  var widthProps = ["paddingRight", "paddingLeft", "marginRight", "marginLeft", "borderRightWidth", "borderLeftWidth"];
  var heightProps = ["paddingTop", "paddingBottom", "marginTop", "marginBottom", "borderTopWidth", "borderBottomWidth"];

  var width = 0;
  var height = 0;

  widthProps.forEach(function(prop){
    width += parseFloat(style[prop]) || 0;
  });

  heightProps.forEach(function(prop){
    height += parseFloat(style[prop]) || 0;
  });

  return {
    height: height,
    width: width
  };

};

/**
 * 获取浏览器视口的高度与宽度
 * @returns {{top: number, left: number, right: Number, bottom: Number, width: Number, height: Number}}
 */
EPUBJS.core.windowBounds = function() {

  var width = window.innerWidth;
  var height = window.innerHeight;

  return {
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    width: width,
    height: height
  };

};

/**
 * 根据浏览器，为样式添加前缀
 * @param unprefixed
 * @returns {*}
 */
EPUBJS.core.prefixed = function (unprefixed) {
  var vendors = ["Webkit", "Moz", "O", "ms"],
      upper = unprefixed[0].toUpperCase() + unprefixed.slice(1),
      length = vendors.length;

  if(typeof(document.body.style[unprefixed]) != 'undefined'){
    return unprefixed;
  }

  for(var i = 0; i < length; i++){
    if(typeof (document.body.style[vendors[i] + upper]) != 'undefined'){
      return vendors[i] + upper;
    }
  }

  return unprefixed;
};