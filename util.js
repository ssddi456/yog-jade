var reg_escape = /(\\[^\\])|([\."\/\\])|(\n\r)/g;
module.exports = {
  safe_escape : function( code ) {
    return code.replace(reg_escape,function( $, $1, $2) {
      if( $1 ){
        return '\\\\' + $1;
      }
      if( $2 ){
        return '\\' + $2;
      }
      if( $3 ){
        return '\\' + $3;
      }
    });
  }
}