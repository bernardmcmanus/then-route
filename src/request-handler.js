import { Promise , E$ } from 'requires';
import { BuildRegexp , testRoute } from 'router';

export default function RequestHandler( pattern ) {
  var that = this;
  that.go = [];
  that.stop = [];
  that.pattern = ParsePattern( pattern );
  E$.construct( that );
}

RequestHandler.prototype = E$.create({
  testRoute: testRoute,
  then: then,
  'catch': $catch,
  exec: exec,
  _tic: _tic
});

function ParsePattern( pattern ) {
  var reTerminate = /\*$/;
  var reExclusive = /\/\*?$/;
  var terminate = false;
  var exclusive = false;
  if (typeof pattern == 'string') {
    terminate = !reTerminate.test( pattern );
    exclusive = reExclusive.test( pattern );
    pattern = pattern
      .replace( reTerminate , '' )
      .replace( reExclusive , function( match ) {
        return terminate ? '' : match;
      });
  }
  return BuildRegexp( pattern , { terminate: terminate, exclusive: exclusive });
}

function then( handler ) {
  var that = this;
  that.go.push( handler );
  return that;
}

function $catch( handler ) {
  var that = this;
  that.stop.push( handler );
  return that;
}

function exec( req , res ) {
  var that = this;
  var go = that.go.slice( 0 );
  return new Promise(function( resolve ) {
    switch (req.method.toLowerCase()) {
      case 'get':
        resolve();
      break;
      case 'post':
        if (req.$body.length) {
          req.on( 'data' , function( chunk ) {
            that.$emit( 'chunk' , { req: req, chunk: chunk });
          });
          req.on( 'end' , resolve );
        }
        else {
          resolve();
        }
      break;
    }
  })
  .then(function() {
    return new Promise(function( resolve , reject ) {
      that.$emit( 'end' , { req: req } , resolve );
      reject();
    })
    .then(function() {
      return that._tic( go , req , res );
    });
  })
  .catch(function( err ) {
    var stop = that.stop.slice( 0 );
    if (err instanceof Error) {
      that.$emit( 'error' , { req: req, err: err });
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

function _tic( handlers , req , res , err ) {
  var that = this;
  var func = handlers.shift();
  return new Promise(function( resolve , reject ) {
    var args = [ req , res ];
    res.$go = function() {
      that.$emit( 'go' , { res: res });
      resolve.apply( null , arguments );
    };
    res.$stop = function() {
      that.$emit( 'stop' , { res: res });
      reject.apply( null , arguments );
    };
    if (err) {
      args.push( err );
    }
    func.apply( null , args );
  })
  .then(function() {
    if (handlers.length) {
      return that._tic( handlers , req , res );
    }
  });
}



















