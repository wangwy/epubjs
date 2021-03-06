/**
 * Created by wangwy on 15-9-7.
 */
EPUBJS.Section = function(item){
  this.idref = item.idref;
  this.linear = item.linear;
  this.properties = item.properties;
  this.index = item.index;
  this.href = item.href;
  this.url = item.url;
  this.next = item.next;
  this.prev = item.prev;

  EPUBJS.Hooks.mixin(this);
  this.getHooks("replacements");
  this.registerHook("replacements", this.replacements.bind(this), false);
};


EPUBJS.Section.prototype.replacements = function(_document){
  var task = new RSVP.defer();
  var base = _document.createElement("base");
  var head;
  base.setAttribute("href", this.url);

  if(_document){
    head = _document.querySelector("head");
  }
  if(head){
    head.insertBefore(base, head.firstChild);
    task.resolve();
  }else{
    task.reject(new Error("没有要插入的head"));
  }
  return task.promise;
};

/**
 * 格式化页面
 * @param _request
 * @returns {*}
 */
EPUBJS.Section.prototype.render = function (_request) {
  var rendering = new RSVP.defer();
  var rendered = rendering.promise;
  this.load(_request).then(function(contents){
    var serializer = new XMLSerializer();
    var output = serializer.serializeToString(contents);
    rendering.resolve(output);
  }).catch(function(e){
    console.error(e);
  });
  return rendered;
};

/**
 * 下载页面
 * @param _request
 * @returns {*}
 */
EPUBJS.Section.prototype.load = function(_request){
  var request = _request || this.request || EPUBJS.core.request;
  var loading = new RSVP.defer();
  var loaded = loading.promise;

  if(this.contents){
    loading.resolve(this.contents);
  }else{
    request(this.url, 'xml').
        then(function (xml) {
          this.document = xml;
          var title = xml.getElementsByTagName("title")[0];
          if(title && title.textContent == ""){
            title.textContent = this.index;
          }
          this.contents = xml.documentElement;
          return this.triggerHooks("replacements",this.document);
        }.bind(this)).
        then(function () {
          loading.resolve(this.contents);
        }.bind(this)).
        catch(function (e) {
          console.error(e);
        })
  }

  return loaded;
};