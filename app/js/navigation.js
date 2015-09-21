/**
 * Created by wangwy on 15-9-7.
 */
EPUBJS.Navigation = function(_package, _request){
  var navigation = this;
  var parse = new EPUBJS.Parser();
  var request = _request || EPUBJS.core.request;

  this.package = _package;
  this.toc = [];
  this.tocByHref = {};
  this.tocById = {};

  if(_package.navPath){
    this.navUrl = _package.baseUrl + _package.navPath;
    this.nav = {};
    this.nav.load = function(){
      var loading = new RSVP.defer();
      var loaded = loading.promise;
      request(navigation.navUrl, 'xml').then(function(xml){
        navigation.toc = parse.nav(xml);
        navigation.loaded(navigation.toc);
        loading.resolve(navigation.toc);
      });
      return loaded;
    }
  }
  if(_package.ncxPath){
    this.ncxUrl = _package.baseUrl + _package.ncxPath;
    this.ncx = {};

    this.ncx.load = function(){
      var loading = new RSVP.defer();
      var loaded = loading.promise;

      request(navigation.ncxUrl, 'xml').then(function(xml){
        navigation.toc = parse.ncx(xml);
        navigation.loaded(navigation.toc);
        loading.resolve(navigation.toc);
      });

      return loaded;
    };
  }
};

/**
 * 获取tocByHref tocById对象
 * @param toc
 */
EPUBJS.Navigation.prototype.loaded = function(toc){
  var item;
  for(var i = 0; i < toc.length; i++){
    item = toc[i];
    this.tocByHref[item.href] = i;
    this.tocById[item.id] = i;
  }
};

/**
 * 下载导航文件（目录）
 */
EPUBJS.Navigation.prototype.load = function(){
  var loading, loaded;
  if(this.nav){
    loading = this.nav.load();
  }else if(this.ncx){
    loading = this.ncx.load();
  }else{
    loaded = new RSVP.defer();
    loaded.resolve([]);
    loading = loaded.promise;
  }

  return loading;
};