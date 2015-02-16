
import RequestHandler from 'request-handler';
import {
  url,
  querystring,
  util,
  briskit,
  extend,
  E$
} from 'requires';


export function Router( base , options ) {

  var that = this;
  var get = [];

  get.else = new RequestHandler().then(function( req , res ) {
    var body = '404 Not Found\n';
    res.writeHead( 404 , {
      'Content-Type': 'text/plain',
      'Content-Length': body.length
    });
    res.end( body );
  });

  that.verbose = true;
  that.pattern = BuildRegexp( base || '/' , { anchor: true });
  that.routes = {
    get: get
  };

  extend( that , options );
  
  E$.construct( that );
  that.$when();
}

export function BuildRegexp( pattern , options ) {

  var defaults = {
    anchor: false,
    terminate: false,
    exclusive: false,
    modifiers: undefined
  };
  
  pattern = pattern || /.*/;
  options = extend( defaults , options );

  var prefix = options.anchor ? '^' : '';
  var suffix = options.terminate ? '\\/?$' : (options.exclusive ? '.+' : '');

  if (typeof pattern == 'string') {
    pattern = pattern.replace( /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g , '\\$&' );
    return new RegExp(( prefix + pattern + suffix ) , options.modifiers );
  }
  return pattern;
}

export function printStack( err ) {
  var stack = err.stack.split( '\n' );
  var message = stack.shift();
  stack = stack.join( '\n' );
  util.puts( message.red );
  util.puts( stack.gray );
}

Router.prototype = E$.create({
  testRoute: testRoute,
  handle: handle,
  augment: augment,
  handleE$: handleE$,
  get: get,
  destroy: destroy,
  _handleHTTP: _handleHTTP,
  _handleRequestHandler: _handleRequestHandler
});

export function testRoute( pathname ) {
  var that = this;
  return that.pattern.test( pathname );
}

export function handle( req , res ) {
  var that = this;
  var parsed = url.parse( req.url );
  that.$emit( req.method.toLowerCase() , [ req , res , parsed ]);
}

export function augment( req , res , parsed ) {
  
  var that = this;

  extend( req , {
    $path: decodeURIComponent( parsed.pathname ),
    $search: parsed.search,
    $data: querystring.parse( parsed.query ),
  });

  extend( res , {
    /*$engage: function() {
      var args = arguments;
      var namespace = args.length < 2 ? '$data' : args[0];
      var data = args.length > 1 ? args[1] : args[0];
      res[namespace] = res[namespace] || {};
      res.$busy = true;
      extend( res[namespace] , data );
    },*/
    $engage: function( data ) {
      res.$data = res.$data || {};
      res.$busy = true;
      extend( res.$data , data );
    },
    $busy: false
  });
}

export function handleE$( e ) {
  var that = this;
  if (e.target === that) {
    that._handleHTTP.apply( that , arguments );
  }
  else if (e.target instanceof RequestHandler) {
    that._handleRequestHandler.apply( that , arguments );
  }
}

export function _handleHTTP( e , req , res , parsed ) {
  
  var that = this;
  var routes = that.routes[e.type] || [];
  var reqhandler;
  var i = 0;
  var len = routes.length;

  that.augment( req , res , parsed );

  if (that.testRoute( parsed.pathname )) {
    for (; i < len; i++) {
      reqhandler = routes[i];
      if (reqhandler.testRoute( parsed.pathname ) && !res.$busy) {
        res.$engage();
        reqhandler.exec( req , res );
      }
    }
  }

  briskit(function() {
    if (!res.$busy) {
      routes.else.exec( req , res );
    }
  });
}

export function _handleRequestHandler( e , data ) {
  var that = this;
  switch (e.type) {
    case 'error':
      if (that.verbose) {
        printStack( data );
      }
    break;
  }
}

export function get( pattern ) {
  var that = this;
  var reqhandler = new RequestHandler( pattern );
  that.$watch( reqhandler );
  that.routes.get.push( reqhandler );
  return reqhandler;
}

export function destroy() {
  var that = this;
  that.$dispel( null , true );
}



















