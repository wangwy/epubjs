EPUBJS.Hooks.register("beforeChapterDisplay").smartimages = function(view, rendition){

//  console.log(rendition.book.toc);
  var images = view.document.querySelectorAll("img");
//  console.log(images);
  var items = Array.prototype.slice.call(images);
  items.forEach(function (item) {
    item.style.maxWidth = "100%"
  });
  /*console.log(document);
  console.log(view.document);*/
  /*view.on("resized", function(e){
    console.log(e);
  });*/
//  console.log(view.pageMap);
};
