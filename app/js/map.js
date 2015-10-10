/**
 * Created by wangwy on 15-9-8.
 */
EPUBJS.Map = function (layout) {
  this.layout = layout;
};

/**
 * 获得页面的开始与结束的range
 * @param view
 * @param start
 * @param end
 * @returns {{start: *, end: *}}
 */
EPUBJS.Map.prototype.page = function (view, start, end) {
  var root = view.document.body;
  return {
    start: this.findStart(root, start, end),
    end: this.findEnd(root, start, end)
  }
};

/**
 * 取出root底下的所有text节点
 * @param root
 * @param func
 * @returns {*}
 */
EPUBJS.Map.prototype.walk = function (root, func) {
  var treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null, false);
  var node;
  var result;
  var children;
  while ((node = treeWalker.nextNode())) {
    children = Array.prototype.slice.call(node.childNodes);
    children.forEach(function (node) {
      if (node.nodeType == Node.TEXT_NODE &&
          node.textContent.trim().length) {
        result = func(node);
      }
    });
    if (result) break;
  }
  return result;
};

/**
 * 获得每页开始的range
 * @param root
 * @param start
 * @param end
 * @returns {*}
 */
EPUBJS.Map.prototype.findStart = function (root, start, end) {
  var stack = [root];
  var $el;
  var found;
  var $prev = root;
  var startOffset = 0;
  while (stack.length) {
    $el = stack.shift();
    found = this.walk($el, function (node) {
      var left, right;
      var elPos;
      var elRange;

      if (node.nodeType == Node.TEXT_NODE) {
        elRange = document.createRange();
        elRange.selectNodeContents(node);
        elPos = elRange.getBoundingClientRect();
      } else {
        elPos = node.getBoundingClientRect();
      }

      left = elPos.left;
      right = elPos.right;

      if (left >= start && left <= end) {
        return node;
      } else if (right > start) {
        return node;
      } else {
        $prev = node;
        stack.push(node);
      }
      startOffset += node.textContent.trim().length;
    });

    if (found) {
      return {
        startRange: this.findTextStartRange(found, start, end),
        startOffset: startOffset
      };
    }
  }

  return {
    startRange: this.findTextStartRange($prev, start, end),
    startOffset: startOffset
  };
};

/**
 * 获得每页结束的range
 * @param root
 * @param start
 * @param end
 * @returns {*}
 */
EPUBJS.Map.prototype.findEnd = function (root, start, end) {
  var stack = [root];
  var $el;
  var $prev = root;
  var found;
  var endOffset = 0;
  while (stack.length) {

    $el = stack.shift();

    found = this.walk($el, function (node) {

      var left, right;
      var elPos;
      var elRange;


      if (node.nodeType == Node.TEXT_NODE) {
        elRange = document.createRange();
        elRange.selectNodeContents(node);
        elPos = elRange.getBoundingClientRect();
      } else {
        elPos = node.getBoundingClientRect();
      }

      left = elPos.left;
      right = elPos.right;

      if (left > end && $prev) {
        return $prev;
      } else if (right > end) {
        return node;
      } else {
        $prev = node;
        stack.push(node);
      }

      endOffset += node.textContent.trim().length;
    });


    if (found) {
      return {
        endRange: this.findTextEndRange(found, start, end),
        endOffset: endOffset
      };
    }

  }

  return {
    endRange: this.findTextEndRange($prev, start, end),
    endOffset: endOffset
  };
};

EPUBJS.Map.prototype.findTextStartRange = function (node, start, end) {
  var ranges = this.splitTextNodeIntoRanges(node);
  var range;
  var pos;

  for (var i = 0; i < ranges.length; i++) {
    range = ranges[i];

    pos = range.getBoundingClientRect();

    if (pos.left >= start) {
      return range;
    }
  }

  return ranges[0];
};

EPUBJS.Map.prototype.findTextEndRange = function (node, start, end) {
  var ranges = this.splitTextNodeIntoRanges(node);
  var prev;
  var range;
  var pos;

  for (var i = 0; i < ranges.length; i++) {
    range = ranges[i];

    pos = range.getBoundingClientRect();

    if (pos.left > end && prev) {
      return prev;
    } else if (pos.right > end) {
      return range;
    }

    prev = range;

  }

  // Ends before limit
  return ranges[ranges.length - 1];

};

EPUBJS.Map.prototype.splitTextNodeIntoRanges = function (node, _splitter) {
  var ranges = [];
  var textContent = node.textContent || "";
  var text = textContent.trim();
  var range;
  var doc = node.ownerDocument;
  var splitter = _splitter || " ";

  var pos = 0;
  range = doc.createRange();
  range.setStart(node, 0);
  range.setEnd(node, pos);
  ranges.push(range);

  range = null;

  while (pos < text.length) {
    if (range) {
      range.setEnd(node, pos);
      ranges.push(range);
    }

    range = doc.createRange();
    range.setStart(node, pos);
    pos++;
  }

  if (range) {
    range.setEnd(node, text.length);
    ranges.push(range);
  }

  return ranges;
};