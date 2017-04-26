var fs = require('fs');
var util = require('util');
var Readable = require('stream').Readable;

var jade = require('jade');
var _ = require('./util');
var jade_compiler = jade.Compiler;
var nodes = jade.nodes;

var fis_jade_c = function() {
  jade_compiler.apply(this,arguments);

  this.code_block_uuid = 0;
};

var fis_jade_p = fis_jade_c.prototype = Object.create(jade_compiler.prototype);
var jade_p_visitTag = fis_jade_p.visitTag;

fis_jade_p.visitTag = function( tag ) {
  var href;
  var code;
  var holder;

  if( tag.name == 'html' ){
    var framework;
    if( tag.attrs 
      && tag.attrs.length 
      &&  ( framework = tag.attrs.filter(function( attr) {
                return attr.name =='framework';
            })[0] )
    ) {
      code = {};
      code.val = code.buffer = '_yog.setFramework('+ framework.val+')';

      tag.attrs = tag.attrs.filter(function(attr) {
          return attr.name != 'framework';
      });
    }
  }

  if( tag.name == 'head' ){
    holder = new nodes.Comment( this.CSS_HOOK, this.CSS_HOOK );
  }
  else if( tag.name == 'body' ){
    holder = new nodes.Comment( this.JS_HOOK, this.JS_HOOK );
  }

  if( holder ){
    tag.block.push( holder );
  }
  
  if( tag.name == 'link' ){
    if( tag.attrs 
      && tag.attrs.length 
      && tag.attrs.some(function( attr ) {
        return attr.name == 'rel' && attr.val.match( /(['"]?)stylesheet\1/);
      })
      && tag.attrs.some(function( attr ) {
        if( attr.name == 'href' && attr.val){
          href = attr.val;
          return true;
        }
      })
    ){
      code = {};
      code.val = code.buffer = '_yog.addCss('+ href+')';
    }
  }
  else if( tag.name == 'style' ){

    
    var uuid = this.code_block_uuid++;
    var code_block_name = 'code_block_' + uuid;
    var script_code_name = 'script_code_' + uuid;
    
    this.buf.push(';' + code_block_name + ' = [];');
    this.buf.push('(function(buf){');

    this.visit(tag.block);

    this.buf.push('}('+code_block_name+'))');
    this.buf.push(';' + script_code_name + ' = ' + code_block_name +'.join(\'\');');
    this.buf.push('_yog.addStyle('+ script_code_name +')');

  }
  else if( tag.name == 'script' 
    && tag.attrs 
    && (tag.attrs.length
        ? tag.attrs.every(function( attr ) {
          return attr.name != 'no-move';
        })
        : true)
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
      var uuid = this.code_block_uuid++;
      var code_block_name = 'code_block_' + uuid;
      var script_code_name = 'script_code_' + uuid;

      //
      // will produce code like
      // 
      // var script_code_block_#{code_uuid} = [];
      // (function(buf){
      //    origin scripts here
      // }(script_code_block_#{code_uuid}));
      // _yog.addScript("'+ jade.escape(script_code_block_#{code_uuid}.join('\n')) +'")
      // 

      this.buf.push(';' + code_block_name + ' = [];');
      this.buf.push('(function(buf){');

      this.visit(tag.block);

      this.buf.push('}('+code_block_name+'))');
      this.buf.push(';' + script_code_name + ' = ' + code_block_name +'.join(\'\');');
      this.buf.push('_yog.addScript('+ script_code_name +')');
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
    try{
      // if no bigpipe conf, skip it
      fis_jade_c.prototype[name] = options._yog[name].match(/^<\!\-\-(.*)\-\-\>$/)[1];
    } catch(e){}
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