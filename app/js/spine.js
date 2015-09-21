/**
 * Created by wangwy on 15-9-7.
 */
EPUBJS.Spine = function(_request){
  this.request = _request;
  this.spineItems = [];
  this.spineByHref = {};
  this.spineById = {};
};

/**
 * 重新格式化spine添加href,url,prev,next属性
 * @param _package
 */
EPUBJS.Spine.prototype.load = function(_package){
  this.items = _package.spine;
  this.manifest = _package.manifest;
  this.spineNodeIndex = _package.spineNodeIndex;
  this.baseUrl = _package.baseUrl || '';
  this.length = this.items.length;

  this.items.forEach(function(item, index){
    var manifestItem = this.manifest[item.idref];
    var spineItem;
    if(manifestItem){
      item.href = manifestItem.href;
      item.url = this.baseUrl + item.href;
      if(manifestItem.properties.length){
        item.properties.push.apply(item.properties, manifestItem.properties);
      }
    }

    item.prev = function(){return this.get(index - 1);}.bind(this);
    item.next = function(){return this.get(index + 1);}.bind(this);

    spineItem = new EPUBJS.Section(item);
    this.append(spineItem);
  }.bind(this));
};

/**
 * 根据target获得spine里的元素
 * @param target
 * @returns {*|null}
 */
EPUBJS.Spine.prototype.get = function(target){
  var index = 0;
  if(target && (typeof target === "number" || isNaN(target) === false)){
    index = target;
  }
  return this.spineItems[index] || null;
};

/**
 * 获取spineItems
 * @param section
 * @returns {Array.length|*}
 */
EPUBJS.Spine.prototype.append = function(section){
  var index = this.spineItems.length;
  section.index = index;

  this.spineItems.push(section);
  this.spineByHref[section.href] = index;
  this.spineById[section.idref] = index;

  return index;
};

