/**
 * Created by wangwy on 15-9-7.
 */
EPUBJS.hooks = {};
EPUBJS.Hooks = (function () {
  function hooks() {
  }

  /**
   * 获取早先注册的hook
   */
  hooks.prototype.getHooks = function () {
    var plugs = [];
    this.hooks = {};
    Array.prototype.slice.call(arguments).forEach(function (arg) {
      this.hooks[arg] = [];
    }, this);

    for (var plugType in this.hooks) {
      for (var key in EPUBJS.hooks[plugType]) {
        plugs.push(EPUBJS.hooks[plugType][key])
      }

      plugs.forEach(function (hook) {
        this.registerHook(plugType, hook, false);
      }, this)
    }
  };

  /**
   * 注册hook
   * @param type
   * @param toAdd
   * @param toFront
   */
  hooks.prototype.registerHook = function (type, toAdd, toFront) {
    if (typeof(this.hooks[type]) != "undefined") {
      if (typeof(toAdd) === "function") {
        if (toFront) {
          this.hooks[type].unshift(toAdd);
        } else {
          this.hooks[type].push(toAdd);
        }
      } else if (Array.isArray(toAdd)) {
        toAdd.forEach(function (hook) {
          if (toFront) {
            this.hooks[type].unshift(hook);
          } else {
            this.hooks[type].push(hook);
          }
        }, this);
      } else {
        this.hooks[type] = [toAdd];
      }
    }
  };

  /**
   * 触发注册完的函数
   * @param type
   * @param callback
   * @param passed
   * @returns {boolean}
   */
  hooks.prototype.triggerHooks = function () {
    var arg = Array.prototype.slice.call(arguments);
    var hooks, type = arg.shift();
    if (typeof(this.hooks[type]) == "undefined") return false;

    hooks = this.hooks[type];
    hooks.forEach(function (hook) {
      hook.apply(this, arg);
    }, this)
  };

  return {
    register: function (name) {
      if (EPUBJS.hooks[name] === undefined) {
        EPUBJS.hooks[name] = {};
      }
      if (typeof EPUBJS.hooks[name] !== 'object') {
        console.error(name + "已经注册")
      }
      return EPUBJS.hooks[name];
    },
    mixin: function (object) {
      for (var prop in hooks.prototype) {
        object[prop] = hooks.prototype[prop];
      }
    }
  }
})();