var fs = require('fs');
var util = require('util');
var Readable = require('stream').Readable;

var jade = require('jade');
var _ = require('./util');

var jade_compiler = jade.Compiler;
var nodes = jade.nodes;

var fis_jade_c = function() {
  jade_compiler.apply(this,arguments);
};

var fis_jade_p = fis_jade_c.prototype = Object.create(jade_compiler.prototype);
var jade_p_visitTag = fis_jade_p.visitTag;

fis_jade_p.visitTag = function( tag ) {
  var href;
  var code;
  var holder;
  if( tag.name == 'head' ){
    holder = new nodes.Comment( this.CSS_HOOK, this.CSS_HOOK );
  }
  else if( tag.name == 'body' ){
    holder = new nodes.Comment( this.JS_HOOK, this.CSS_HOOK );
  }

  if( holder ){
    tag.block.push( holder );
  }
  
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
  else if( tag.name == 'style' ){
    var scripts = (tag.block.nodes||[])
                .map(function( node ) {
                  return _.safe_escape(node.val);
                })
                .join('\\n');
    code = {};
    code.val = code.buffer = '_yog.addStyle("' + scripts + '")';
  }
  else if( tag.name == 'script' 
    && tag.attrs 
    && tag.attrs.length
    && tag.attrs.every(function( attr ) {
      return attr.name != 'no-move';
    })
  ){
    if( tag.attrs.some(function( attr ) {
          if( attr.name == 'src' && attr.val){
            href = attr.val;
            return true;
          }
        })
    ){
      code = {};
      code.val = code.buffer = '_yog.addJs('+ href+')';
    } else {
      var scripts = (tag.block.nodes||[])
                      .map(function( node ) {
                        return _.safe_escape(node.val);
                      })
                      .join('\\n');
      code = {};
      code.val = code.buffer = '_yog.addScript("'+ scripts +'")';
    }
  } else{
    jade_p_visitTag.apply(this, arguments);
  }
  if( code ){
    this.visitCode( code );
  }
}

function render_jade( path, options ) {
  options = options || {};

  options.compiler = fis_jade_c;
  [
    'CSS_HOOK',
    'JS_HOOK',
    'BIGPIPE_HOOK'
  ].forEach(function( name ) {
    fis_jade_c.prototype[name] = options._yog[name].match(/^<\!\-\-(.*)\-\-\>$/)[1];
  });

  return jade.renderFile( path, options);
}

var jade_stream = function() {
  Readable.call(this);
}

util.inherits(jade_stream,Readable);
var jsp = jade_stream.prototype;

jsp._read = function(n) {
  try{
    this.push(render_jade(this.view, this.options));
    this.push(null);
  }catch(e){
    this.emit('error',e);
  }
};

jsp.destroy = function() {
  this.removeAllListeners();
};

module.exports = function() {
  return {
    makeStream : function(view, options) {
      var ret = new jade_stream();
      ret.view = view;
      ret.options = options;
      return ret;
    }
  }
};