
import { Promise } from 'requires'


export default function RequestHandler( pattern ) {
  var that = this;
  that.go = [];
  that.stop = [];
  that.pattern = RequestHandler.RegExp( pattern );
}

RequestHandler.RegExp = function( pattern ) {
  if (typeof pattern == 'string') {
    pattern = pattern.replace( /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g , '\\$&' );
    return new RegExp( '^' +  pattern + '$' );
  }
  return pattern;
};

RequestHandler.prototype = {
  test: function( pathname ) {
    var that = this;
    return that.pattern.test( pathname );
  },
  then: function( handler ) {
    var that = this;
    that.go.push( handler );
    return that;
  },
  catch: function( handler ) {
    var that = this;
    that.stop.push( handler );
    return that;
  },
  exec: function( req , res ) {
    var that = this;
    var go = that.go.slice( 0 );
    return new Promise(function( resolve ) {
      resolve(
        that._execNextHandler( go , [ req , res ])
      );
    })
    .catch(function( err ) {
      var stop = that.stop.slice( 0 );
      if (err instanceof Error) {
        console.log(err.stack);
      }
      if (stop.length) {
        return that._execNextHandler( stop , [ req , res , err ]);
      }
      else {
        res.writeHead( 500 , { 'Content-Type': 'text/plain' });
        res.end( '500 Internal Server Error\n' );
      }
    });
  },
  _execNextHandler: function( handlers , args ) {
    var that = this;
    var func = handlers.shift();
    return new Promise(function( resolve , reject ) {
      /*args[2] = resolve;
      args[3] = reject;*/
      var context = { go: resolve, stop: reject };
      func.apply( context , args );
    })
    .then(function( resolvedArgs ) {
      if (handlers.length) {
        // args[4] = resolvedArgs;
        return that._execNextHandler( handlers , args.slice( 0 , 2 ).concat( resolvedArgs ));
      }
    });
  }
};



















