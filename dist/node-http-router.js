/*! node-http-router - 0.1.0 - Bernard McManus - master - c3680ce - 2015-02-15 */

(function() {
    "use strict";
    var requires$$url = require( 'url' );

    var requires$$path = require( 'path' );

    var requires$$querystring = require( 'querystring' );

    var requires$$util = require( 'util' );

    var requires$$E$ = require( 'emoney' );

    var requires$$briskit = require( 'briskit' );

    var requires$$extend = require( 'extend' );

    var requires$$Promise = require( 'es6-promise' ).Promise;
    function request$handler$$RequestHandler( pattern ) {
      var that = this;
      that.go = [];
      that.stop = [];
      that.pattern = router$$BuildRegexp( pattern , { terminate: true });
      requires$$E$.construct( that );
    }

    var request$handler$$default = request$handler$$RequestHandler;

    request$handler$$RequestHandler.prototype = requires$$E$.create({
      testRoute: router$$testRoute,
      then: request$handler$$then,
      'catch': request$handler$$$catch,
      exec: request$handler$$exec,
      _tic: request$handler$$_tic
    });

    function request$handler$$then( handler ) {
      var that = this;
      that.go.push( handler );
      return that;
    }

    function request$handler$$$catch( handler ) {
      var that = this;
      that.stop.push( handler );
      return that;
    }

    function request$handler$$exec( req , res ) {
      var that = this;
      var go = that.go.slice( 0 );
      return new requires$$Promise(function( resolve ) {
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

    function request$handler$$_tic( handlers , req , res , err ) {
      var that = this;
      var func = handlers.shift();
      return new requires$$Promise(function( resolve , reject ) {
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

    function router$$Router( base , options ) {

      var that = this;
      var get = [];

      get.else = new request$handler$$default().then(function( req , res ) {
        var body = '404 Not Found\n';
        res.writeHead( 404 , {
          'Content-Type': 'text/plain',
          'Content-Length': body.length
        });
        res.end( body );
      });

      that.verbose = true;
      that.pattern = router$$BuildRegexp( base || '/' , { anchor: true });
      that.routes = {
        get: get
      };

      requires$$extend( that , options );
      
      requires$$E$.construct( that );
      that.$when();
    }

    var router$$default = router$$Router;
    function router$$BuildRegexp( pattern , options ) {

      var defaults = {
        anchor: false,
        terminate: false,
        modifiers: undefined
      };
      
      pattern = pattern || /.*/;
      options = requires$$extend( defaults , options );

      var prefix = options.anchor ? '^' : '';
      var suffix = options.terminate ? '\\/?' : '';

      if (typeof pattern == 'string') {
        pattern = pattern.replace( /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g , '\\$&' );
        return new RegExp(( prefix + pattern + suffix ) , options.modifiers );
      }
      return pattern;
    }

    function router$$printStack( err ) {
      var stack = err.stack.split( '\n' );
      var message = stack.shift();
      stack = stack.join( '\n' );
      requires$$util.puts( message.red );
      requires$$util.puts( stack.gray );
    }

    router$$Router.prototype = requires$$E$.create({
      testRoute: router$$testRoute,
      handle: router$$handle,
      augment: router$$augment,
      handleE$: router$$handleE$,
      get: router$$get,
      destroy: router$$destroy,
      _handleHTTP: router$$_handleHTTP,
      _handleRequestHandler: router$$_handleRequestHandler
    });

    function router$$testRoute( pathname ) {
      var that = this;
      return that.pattern.test( pathname );
    }

    function router$$handle( req , res ) {
      var that = this;
      var parsed = requires$$url.parse( req.url );
      that.$emit( req.method.toLowerCase() , [ req , res , parsed ]);
    }

    function router$$augment( req , res , parsed ) {
      
      var that = this;

      requires$$extend( req , {
        $path: decodeURIComponent( parsed.pathname ),
        $search: parsed.search,
        $query: requires$$querystring.parse( parsed.query ),
      });

      requires$$extend( res , {
        $engage: function() {
          var args = arguments;
          var namespace = args.length < 2 ? 'data' : args[0];
          var data = args.length > 1 ? args[1] : args[0];
          res[namespace] = res[namespace] || {};
          res.$busy = true;
          requires$$extend( res[namespace] , data );
        },
        $busy: false
      });
    }

    function router$$handleE$( e ) {
      var that = this;
      if (e.target === that) {
        that._handleHTTP.apply( that , arguments );
      }
      else if (e.target instanceof request$handler$$default) {
        that._handleRequestHandler.apply( that , arguments );
      }
    }

    function router$$_handleHTTP( e , req , res , parsed ) {
      
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

      requires$$briskit(function() {
        if (!res.$busy) {
          routes.else.exec( req , res );
        }
      });
    }

    function router$$_handleRequestHandler( e , data ) {
      var that = this;
      switch (e.type) {
        case 'error':
          if (that.verbose) {
            router$$printStack( data );
          }
        break;
      }
    }

    function router$$get( pattern ) {
      var that = this;
      var reqhandler = new request$handler$$default( pattern );
      that.$watch( reqhandler );
      that.routes.get.push( reqhandler );
      return reqhandler;
    }

    function router$$destroy() {
      var that = this;
      that.$dispel( null , true );
    }

    var $$index$$default = router$$default;

    if (typeof define == 'function' && define.amd) {
      define([], function() { return $$index$$default });
    }
    else {
      module.exports = $$index$$default;
    }
}).call(this);

