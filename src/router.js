import RequestHandler from 'request-handler';
import {
  url,
  querystring,
  util,
  colors,
  briskit,
  extend,
  E$
} from 'requires';


export function Router( base , config ) {

  var that = this;
  var get = [];
  var post = [];
  var options = [];
  var rescue = [];
  /*var $else = new RequestHandler().then(function( req , res ) {
    var body = '404 Not Found\n';
    res.writeHead( 404 , {
      'Content-Type': 'text/plain',
      'Content-Length': body.length
    });
    res.end( body );
  });

  get.else = $else;
  post.else = $else;*/

  get.else = new RequestHandler().then(function( req , res ) {
    var body = '404 Not Found\n';
    res.writeHead( 404 , {
      'Content-Type': 'text/plain',
      'Content-Length': body.length
    });
    res.end( body );
  });

  post.else = new RequestHandler().then(function( req , res ) {
    var body = '404 Not Found\n';
    res.writeHead( 404 , {
      'Content-Type': 'text/plain',
      'Content-Length': body.length
    });
    res.end( body );
  });

  options.else = new RequestHandler().then(function( req , res ) {
    res.end();
  });

  rescue.else = new RequestHandler().then(function( req , res ) {
    res.end();
  });

  that.verbose = true;
  that.pattern = BuildRegexp( base || '/' , { anchor: true });
  that.routes = {
    get: get,
    post: post,
    options: options,
    rescue: rescue
  };

  extend( that , config );
  
  E$.construct( that );
  that.$when();
}

Router.prototype = E$.create({
  get: get,
  post: post,
  options: options,
  testRoute: testRoute,
  handle: handle,
  augment: augment,
  handleE$: handleE$,
  destroy: destroy,
  _addRoute: _addRoute,
  _handleHTTP: _handleHTTP,
  _handleRequestHandler: _handleRequestHandler
});

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
  util.puts( colors.red( message ));
  util.puts( colors.gray( stack ));
}

export function testRoute( pathname ) {
  var that = this;
  return that.pattern.test( pathname );
}

function get( pattern ) {
  var that = this;
  return that._addRoute( 'get' , pattern );
}

function post( pattern ) {
  var that = this;
  return that._addRoute( 'post' , pattern );
}

function options( pattern ) {
  var that = this;
  return that._addRoute( 'options' , pattern );
}

function _addRoute( type , pattern ) {
  var that = this;
  var reqhandler = new RequestHandler( pattern );
  that.$watch( reqhandler );
  that.routes[type].push( reqhandler );
  return reqhandler;
}

function handle( req , res ) {
  var that = this;
  var parsed = url.parse( req.url );
  that.$emit( req.method.toLowerCase() , [ req , res , parsed ]);
}

function augment( req , res , parsed ) {
  
  var that = this;
  var length = parseInt( req.headers[ 'content-length' ] , 10 ) || 0;

  extend( req , {
    $path: decodeURIComponent( parsed.pathname ),
    $search: parsed.search,
    $body: req.$body || new Buffer( length ),
    $_buffIndex: 0,
    $_data: parsed.query
  });

  if (!req.$data) {
    Object.defineProperty( req , '$data' , {
      get: function() {
        var data;
        try {
          if (req.$body.length) {
            data = req.$body.toString( 'utf-8' );
          }
          else {
            data = req.$_data;
          }
          data = querystring.parse( data );
        }
        catch( err ) {
          printStack( err );
          data = {};
        }
        finally {
          return data;
        }
      }
    });
  }

  extend( res , {
    $engage: function( data ) {
      res.$data = res.$data || {};
      res.$busy = true;
      extend( res.$data , data );
    },
    $busy: false
  });
}

function handleE$( e ) {
  var that = this;
  if (e.target === that) {
    that._handleHTTP.apply( that , arguments );
  }
  else if (e.target instanceof RequestHandler) {
    that._handleRequestHandler.apply( that , arguments );
  }
}

function _handleHTTP( e , req , res , parsed ) {
  
  var that = this;
  var routes = that.routes[e.type] || that.routes.rescue;
  var reqhandler;
  var i = 0;
  var len = routes.length;

  that.augment( req , res , parsed );

  if (that.testRoute( parsed.pathname )) {
    for (; i < len; i++) {
      reqhandler = routes[i];
      if (reqhandler.testRoute( parsed.pathname ) && !res.$busy) {
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

function _handleRequestHandler( e , data ) {
  var that = this;
  switch (e.type) {
    case 'error':
      if (that.verbose) {
        printStack( data.err );
      }
    break;
    case 'chunk':
      (function( req , chunk ) {
        var offset = req.$_buffIndex;
        for (var i = 0; i < chunk.length; i++) {
          req.$body[i + offset] = chunk[i];
        }
        req.$_buffIndex = i;
      }( data.req , data.chunk ));
    break;
    case 'go':
    case 'stop':
      data.res.$engage();
    break;
    case 'end':
      // do something on response end
    break;
  }
}

function destroy() {
  var that = this;
  that.$dispel( null , true );
}



















