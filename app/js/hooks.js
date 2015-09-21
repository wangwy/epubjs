/**
 * Created by wangwy on 15-9-7.
 */
EPUBJS.Hook = function(context){
  this.context = context || this;
  this.hooks = [];
};

/**
 * 在一个hook完成之前添加一个方法
 * @param func
 */
EPUBJS.Hook.prototype.register = function(func){
  this.hooks.push(func);
};

/**
 * 触发一个hook运行里面所有的方法
 * @returns {*}
 */
EPUBJS.Hook.prototype.trigger = function(){
  var args = arguments;
  var context = this.context;
  var promises = [];
  this.hooks.forEach(function(task){
    var executing = task.apply(context, args);
    if(executing && typeof executing["then"] === "function"){
      promises.push(executing);
    }
  });

  return RSVP.all(promises);
};
