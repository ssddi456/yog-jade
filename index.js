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
      code.val = code.buffer = '_fis_addCss('+ href+')';
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
      code.val = code.buffer = '_fis_addJs('+ href+')';    
    }
  } else{
    jade_p_visitTag.apply(this, arguments);
  }
  if( code ){
    this.visitCode( code );
  }

  if( tag.name == 'head' ){
    this.buf.push( place_holders.css + this.buf.pop() );
  }
  else if( tag.name == 'body' ){
    this.buf.push( place_holders.js + this.buf.pop() );
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
  var jses = [];
  var csses = [];
  options._fis_addJs = function( val ) {
    jses.push( val );
  };
  options._fis_addCss = function( val ) {
    csses.push( val );
  };

  var csslink = function( css ) {
    return '<link rel="stylesheet" href="' + css + '" />';
  }
  var jslink  = function( js ) {
    return '<script src="'+ js +'"></script>';
  }
  return jade.renderFile( path, options, function( err, res ) {
    
    fn( err, 
      res.replace( place_holders.js,  jses.map(jslink)  .join('') )
         .replace( place_holders.css, csses.map(csslink).join('') ) );
  });
}

var jade_stream = function() {
    
}

util.inherits(jade_stream,Readable);
var jsp = jade_stream.prototype;

jsp._read = function(n) {
  if( !this.buzy && this.view ){
    if (this.buzy){
      return;
    }
    this.buzy = true;

    render_jade(this.view, this.locals,function( err, res ) {
      if (err) {
        return self.emit('error', err);
      }

      self.push(res);
      self.push(null);
    });
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
