/**
 * Created by wangwy on 15-8-28.
 */
EPUBJS.Parser = function () {
};

/**
 * 序列化containerXml
 * @param containerXml
 * @returns {{packagePath: string, basePath: (string|*), encoding: string}}
 */
EPUBJS.Parser.prototype.container = function (containerXml) {
  var rootfile, fullpath, folder, encoding;
  if (!containerXml) {
    console.error("Container File Not Found");
    return;
  }

  rootfile = containerXml.querySelector("rootfile");

  if (!rootfile) {
    console.error("No RootFile Found");
    return;
  }

  fullpath = rootfile.getAttribute("full-path");
  folder = EPUBJS.core.uri(fullpath).directory;
  encoding = containerXml.xmlEncoding;

  return {
    'packagePath': fullpath,
    'basePath': folder,
    'encoding': encoding
  }
};

/**
 * 序列化opf文件
 * @param packageXml
 * @param baseUrl
 * @returns {{metadata: *, spine: *, manifest: *, navPath: *, tocPath: *, coverPath: *, spineNodeIndex: number, spineIndexByURL: {}}}
 */
EPUBJS.Parser.prototype.packageContents = function (packageXml, baseUrl) {
  var parse = this;
  var metadataNode, manifestNode, spineNode;
  var manifest, navPath, ncxPath, coverPath;
  var spineNodeIndex;
  var spine;
  var spineIndexByURL;
  var metadata;

  if (baseUrl) this.baseUrl = baseUrl;

  if (!packageXml) {
    console.error("Package File Not Found");
    return;
  }

  metadataNode = packageXml.querySelector("metadata");
  if (!metadataNode) {
    console.error("No Metadata Found");
    return;
  }

  manifestNode = packageXml.querySelector("manifest");
  if (!manifestNode) {
    console.error("No Manifest Found");
    return;
  }

  spineNode = packageXml.querySelector("spine");
  if (!spineNode) {
    console.error("No Spine Found");
    return;
  }


  manifest = parse.manifest(manifestNode);
  navPath = parse.findNavPath(manifestNode);
  ncxPath = parse.findNcxPath(manifestNode);
  coverPath = parse.findCoverPath(manifestNode);

  spineNodeIndex = Array.prototype.indexOf.call(spineNode.parentNode.childNodes, spineNode);

  spine = parse.spine(spineNode, manifest);
  spineIndexByURL = {};
  spine.forEach(function (item) {
    spineIndexByURL[item.href] = item.index;
  });
  metadata = parse.metadata(metadataNode);

  metadata.direction = spineNode.getAttribute("page-progression-direction");

  return {
    'metadata': metadata,
    'spine': spine,
    'manifest': manifest,
    'navPath': navPath,
    'ncxPath': ncxPath,
    'coverPath': coverPath,
    'spineNodeIndex': spineNodeIndex,
    'spineIndexByURL': spineIndexByURL
  }
};

/**
 * 序列化opf文件里的manifest子集
 * @param manifestXml
 * @returns {{}}
 */
EPUBJS.Parser.prototype.manifest = function (manifestXml) {
  var baseUrl = this.baseUrl,
      manifest = {};

  var selected = manifestXml.querySelectorAll("item"),
      items = Array.prototype.slice.call(selected);

  items.forEach(function (item) {
    var id = item.getAttribute('id'),
        href = item.getAttribute('href') || '',
        type = item.getAttribute('media-type') || '',
        properties = item.getAttribute('properties') || '';
    manifest[id] = {
      'href': href,
      'url': baseUrl + href,
      'type': type,
      'properties': properties
    };
  });

  return manifest;
};

/**
 * 查找nav目录文件
 * @param manifestNode
 * @returns {string}
 */
EPUBJS.Parser.prototype.findNavPath = function (manifestNode) {
  var node = manifestNode.querySelector("item[properties$='nav'], item[properties^='nav '], item[properties*=' nav ']");

  return node ? node.getAttribute("href") : false;
};

/**
 * 查找toc目录文件
 * @param manifestNode
 * @param spineNode
 * @returns {string}
 */
EPUBJS.Parser.prototype.findNcxPath = function (manifestNode) {
  var node = manifestNode.querySelector("item[media-type='application/x-dtbncx+xml']");

  return node ? node.getAttribute("href") : false;
};

/**
 * 查找封面文件
 * @param manifestNode
 * @returns {string}
 */
EPUBJS.Parser.prototype.findCoverPath = function (manifestNode) {
  var node = manifestNode.querySelector("item[properties='cover-image']");
  return node ? node.getAttribute('href') : false;
};

/**
 * 序列化opf文件spine的子集
 * @param spineXml
 * @param manifest
 * @returns {Array}
 */
EPUBJS.Parser.prototype.spine = function (spineXml, manifest) {
  var spine = [];

  var selected = spineXml.querySelectorAll("itemref"),
      items = Array.prototype.slice.call(selected);

  items.forEach(function (item, index) {
    var idref = item.getAttribute('idref');
    var props = item.getAttribute('properties') || '';
    var propArray = props.length ? props.split(' ') : [];
    var vert = {
      'idref': idref,
      'linear': item.getAttribute('linear') || '',
      'properties': propArray,
      'index': index
    };
    spine.push(vert);
  });

  return spine;
};

/**
 * 序列化opf文件metadata子集
 * @param xml
 * @returns {{}}
 */
EPUBJS.Parser.prototype.metadata = function (xml) {
  var metadata = {},
      p = this;

  metadata.bookTitle = p.getElementText(xml, 'title');
  metadata.creator = p.getElementText(xml, 'creator');
  metadata.description = p.getElementText(xml, 'description');

  metadata.pubdate = p.getElementText(xml, 'date');

  metadata.publisher = p.getElementText(xml, 'publisher');

  metadata.identifier = p.getElementText(xml, "identifier");
  metadata.language = p.getElementText(xml, "language");
  metadata.rights = p.getElementText(xml, "rights");

  metadata.modified_date = p.querySelectorText(xml, "meta[property='dcterms:modified']");
  metadata.layout = p.querySelectorText(xml, "meta[property='rendition:layout']");
  metadata.orientation = p.querySelectorText(xml, "meta[property='rendition:orientation']");
  metadata.spread = p.querySelectorText(xml, "meta[property='rendition:spread']");

  return metadata;
};

/**
 * 获取xml文件里的tag标签里的文本内容
 * @param xml
 * @param tag
 * @returns {*}
 */
EPUBJS.Parser.prototype.getElementText = function (xml, tag) {
  var found = xml.getElementsByTagNameNS("http://purl.org/dc/elements/1.1/", tag),
      el;

  if (!found || found.length === 0) return '';

  el = found[0];

  if (el.childNodes.length) {
    return el.childNodes[0].nodeValue;
  }

  return '';

};

/**
 * 查找xml文件里的第一个q标签内的文本内容
 * @param xml
 * @param q
 * @returns {*}
 */
EPUBJS.Parser.prototype.querySelectorText = function (xml, q) {
  var el = xml.querySelector(q);

  if (el && el.childNodes.length) {
    return el.childNodes[0].nodeValue;
  }

  return '';
};

/**
 * 序列化nav目录文件
 * @param navHtml
 * @returns {*}
 */
EPUBJS.Parser.prototype.nav = function (navHtml) {
  var navEl = navHtml.querySelector('nav[*|type="toc"]'),
      idCounter = 0;
  if (!navEl) return [];
  function findListItems(parent) {
    var items = [];
    Array.prototype.slice.call(parent.childNodes).forEach(function (node) {
      if ('ol' == node.tagName) {
        Array.prototype.slice.call(node.childNodes).forEach(function (item) {
          if ('li' == item.tagName) {
            items.push(item)
          }
        });
      }
    });

    return items;
  }

  function findAnchorOrSpan(parent) {
    var item = null;

    Array.prototype.slice.call(parent.childNodes).forEach(function (node) {
      if ('a' == node.tagName || 'span' == node.tagName) {
        item = node;
      }
    });

    return item;
  }

  function getToc(parent) {
    var list = [],
        nodes = findListItems(parent),
        items = Array.prototype.slice.call(nodes),
        length = items.length;

    if (length === 0) return false;

    items.forEach(function (item) {
      var id = item.getAttribute('id') || false,
          content = findAnchorOrSpan(item),
          href = content.getAttribute('href') || '',
          text = content.textContent || "",
          subitems = getToc(item);

      item.setAttribute('id', id);
      list.push({
        "id": id,
        "href": href,
        "label": text,
        "subitems": subitems,
        "parent": parent ? parent.getAttribute('id') : null
      });
    });
    return list;
  }

  return getToc(navEl);
};

/**
 * 序列化toc目录文件
 * @param tocXml
 * @returns {*}
 */
EPUBJS.Parser.prototype.ncx = function (tocXml) {
  var navMap = tocXml.querySelector("navMap");
  if (!navMap) return [];

  function getToc(parent) {
    var list = [],
        snapshot = parent.querySelectorAll("navPoint"),
        length = snapshot.length;

    if(length === 0) return [];

    for(var i = 0; i < length; i++){
      var item = snapshot[i];
      var id = item.getAttribute('id') || false,
          content = item.querySelector("content"),
          src = content.getAttribute('src'),
          navLabel = item.querySelector("navLabel"),
          text = navLabel.textContent ? navLabel.textContent : "",
          subitems = getToc(item);

      list.push({
        "id": id,
        "href": src,
        "label": text,
        "subitems": subitems,
        "parent": parent ? parent.getAttribute("id") : null
      });
    }

    return list;
  }

  return getToc(navMap);
};