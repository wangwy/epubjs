EPUBJS.Hooks.register("beforeChapterDisplay").smartimages = function(view, rendition){
  view.on("resized", function(e){
    console.log(e);
  });
};
