/**
 * Created by wangwy on 15-9-7.
 */
EPUBJS.replace = {};
EPUBJS.replace.links = function (view, continuous) {
  var links = view.document.querySelectorAll("a[href]");
  var replaceLinks = function (link) {
    var href = link.getAttribute("href");
    var uri = new EPUBJS.core.uri(href);
    if (uri.protocol) {
      link.setAttribute("target", "_blank");
    } else {
      if (href.indexOf("#") === 0) {
        link.onclick = function () {
          continuous.gotoEleById(view, href.split("#")[1]);
        };
      } else {
        link.onclick = function () {
          continuous.display(href);
          return false;
        }
      }
    }
  };
  for (var i = 0; i < links.length; i++) {
    replaceLinks(links[i]);
  }
};
