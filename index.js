var fs = require('fs');
var util = require('util');
var Readable = require('stream').Readable;

var jade = require('jade');

var jade_compiler = jade.Compiler;

var fis_jade_c = function() {
  jade_compiler.apply(this,arguments);
};

var fis_jade_p = fis_jade_c.prototype = Object.create(jade_compiler.prototype);
var jade_p_visitTag = fis_jade_p.visitTag;

fis_jade_p.visitTag = function( tag ) {
  var href;
  var code;
  if( tag.name == 'link' ){
    if( tag.attrs 
      && tag.attrs.length 
      && tag.attrs.some(function( attr ) {
        return attr.name == 'rel' && attr.val == '"stylesheet"';
      })
      && tag.attrs.some(function( attr ) {
        return attr.name == 'type' && attr.val== '"text/css"';
      })
      && tag.attrs.some(function( attr ) {
        if( attr.name == 'href' && attr.val){
          href = attr.val;
        }
        return true;
      })
    ){
      code = {};
      code.val = code.buffer = '_yog.addCss('+ href+')';
    }
  }
  else if( tag.name == 'script' ){
    if( tag.attrs 
      && tag.attrs.length
      && tag.attrs.some(function( attr ) {
        if( attr.name == 'src' && attr.val){
          href = attr.val;
        }
        return true;
      })
    ){
      code = {};
      code.val = code.buffer = '_yog.addJs('+ href+')';    
    }
  } else{
    jade_p_visitTag.apply(this, arguments);
  }
  if( code ){
    this.visitCode( code );
  }

  if( tag.name == 'head' ){
    this.buf.push( this.CSS_HOOK + this.buf.pop() );
  }
  else if( tag.name == 'body' ){
    this.buf.push( this.JS_HOOK + this.buf.pop() );
  } else {
    return;
  }
}

function render_jade( path, options, fn ) {
  // support callback API
  if ('function' == typeof options) {
    fn = options, options = undefined;
  }

  options = options || {};

  options.compiler = fis_jade_c;

  fis_jade_c.prototype.CSS_HOOK = options._yog.CSS_HOOK;
  fis_jade_c.prototype.JS_HOOK = options._yog.JS_HOOK;
  fis_jade_c.prototype.BIGPIPE_HOOK = options._yog.BIGPIPE_HOOK;

  var jses = [];
  var csses = [];


  var csslink = function( css ) {
    return '<link rel="stylesheet" href="' + css + '" />';
  }
  var jslink  = function( js ) {
    return '<script src="'+ js +'"></script>';
  }
  return jade.renderFile( path, options);
}

var jade_stream = function() {
  Readable.apply(this,arguments);
}

util.inherits(jade_stream,Readable);
var jsp = jade_stream.prototype;

jsp._read = function(n) {
  if( !this.buzy && this.view ){
    if (this.buzy){
      return;
    }
    this.buzy = true;
    try{
      this.push(render_jade(this.view, this.locals));
      this.push(null);
    }catch(e){
      this.emit('error',e);
    }
  }
};

jsp.makeStream = function(view, locals) {
  Readable.call(this, null);
  this.view = view;
  this.locals = locals;
  return this;
};

jsp.destroy = function() {
  this.removeAllListeners();
};


module.exports = jade_stream;