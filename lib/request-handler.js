
import { Promise , E$ } from 'requires';
import { BuildRegexp , testRoute } from 'router';

export default function RequestHandler( pattern ) {
  var that = this;
  that.go = [];
  that.stop = [];
  that.pattern = BuildRegexp( pattern , true );
  E$.construct( that );
}

RequestHandler.prototype = E$.create({
  testRoute: testRoute,
  then: then,
  'catch': $catch,
  exec: exec,
  _tic: _tic
});

export function then( handler ) {
  var that = this;
  that.go.push( handler );
  return that;
}

export function $catch( handler ) {
  var that = this;
  that.stop.push( handler );
  return that;
}

export function exec( req , res ) {
  var that = this;
  var go = that.go.slice( 0 );
  return new Promise(function( resolve ) {
    resolve(
      that._tic( go , req , res )
    );
  })
  .catch(function( err ) {
    var stop = that.stop.slice( 0 );
    if (err instanceof Error) {
      that.$emit( 'error' , err );
    }
    if (stop.length) {
      return that._tic( stop , req , res , err );
    }
    else {
      res.writeHead( 500 , { 'Content-Type': 'text/plain' });
      res.end( '500 Internal Server Error\n' );
    }
  });
}

export function _tic( handlers , req , res , err ) {
  var that = this;
  var func = handlers.shift();
  return new Promise(function( resolve , reject ) {
    var args = [ req , res ];
    res.$go = resolve;
    res.$stop = reject;
    if (err) {
      args.push( err );
    }
    func.apply( null , args );
  })
  .then(function( resolvedArgs ) {
    if (handlers.length) {
      return that._tic( handlers , req , res );
    }
  });
}



















