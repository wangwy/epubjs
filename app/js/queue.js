/**
 * Created by wangwy on 15-9-7.
 */
EPUBJS.Queue = function (_context) {
  this._q = [];
  this.context = _context;
  this.tick = EPUBJS.core.requestAnimationFrame;
  this.running = false;
  this.paused = false;
};

/**
 * 添加一个任务
 * @returns {*}
 */
EPUBJS.Queue.prototype.enqueue = function () {
  var deferred, promise;
  var queued;
  var task = [].shift.call(arguments);
  var args = arguments;

  if (!task) {
    return console.error("没有提供任务");
  }
  if (typeof task === "function") {
    deferred = new RSVP.defer();
    promise = deferred.promise;

    queued = {
      "task": task,
      "args": args,
      "deferred": deferred,
      "promise": promise
    };
  } else {
    queued = {
      "promise": task
    };
  }

  this._q.push(queued);

  if (!this.paused && !this.running) {
    this.run();
  }

  return queued.promise;
};

/**
 * 运行一个任务
 * @returns {*}
 */
EPUBJS.Queue.prototype.dequeue = function () {
  var inwait, task, result;
  if (this._q.length) {
    inwait = this._q.shift();
    task = inwait.task;
    if (task) {
      result = task.apply(this.context, inwait.args);

      if (result && typeof result["then"] === "function") {
        return result.then(function () {
          inwait.deferred.resolve.apply(this.context, arguments);
        }.bind(this));
      } else {
        inwait.deferred.resolve.apply(this.context, result);
        return inwait.promise;
      }
    } else if (inwait.promise) {
      return inwait.promise;
    }
  } else {
    inwait = new RSVP.defer();
    inwait.deferred.resolve();
    return inwait.promise;
  }
};

/**
 * 一次运行所有的任务
 * @returns {*}
 */
EPUBJS.Queue.prototype.run = function () {
  if (!this.running) {
    this.running = true;
    this.defered = new RSVP.defer();
  }

  this.tick.call(window, function () {
    if (this._q.length) {
      this.dequeue()
          .then(function () {
            this.run();
          }.bind(this))
    } else {
      this.defered.resolve();
      this.running = false;
    }
  }.bind(this));

  if (this.paused == true) {
    this.paused = false;
  }

  return this.defered.promise;
};

/**
 * 清除所有的在等待执行的方法
 */
EPUBJS.Queue.prototype.clear = function () {
  this._q = [];
  this.running = false;
};