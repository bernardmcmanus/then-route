/*! node-http-router - 0.1.0 - Bernard McManus - master - ed7fac5 - 2015-02-15 */

(function() {
    "use strict";
    var requires$$url = require( 'url' );

    var requires$$path = require( 'path' );

    var requires$$querystring = require( 'querystring' );

    var requires$$E$ = require( 'emoney' );

    var requires$$briskit = require( 'briskit' );

    var requires$$extend = require( 'extend' );

    var requires$$Promise = require( 'es6-promise' ).Promise;
    function request$handler$$RequestHandler( pattern ) {
      var that = this;
      that.go = [];
      that.stop = [];
      that.pattern = request$handler$$RequestHandler.RegExp( pattern );
    }

    var request$handler$$default = request$handler$$RequestHandler;

    request$handler$$RequestHandler.RegExp = function( pattern ) {
      if (typeof pattern == 'string') {
        pattern = pattern.replace( /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g , '\\$&' );
        return new RegExp( '^' +  pattern + '$' );
      }
      return pattern;
    };

    request$handler$$RequestHandler.prototype = {
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
        return new requires$$Promise(function( resolve ) {
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
        return new requires$$Promise(function( resolve , reject ) {
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

    function router$$Router() {

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

      that.routes = {
        get: get
      };
      
      requires$$E$.construct( that );
      
      that.$when();
    }

    var router$$default = router$$Router;

    router$$Router.prototype = requires$$E$.create({

      handle: function( req , res ) {
        var that = this;
        var parsed = requires$$url.parse( req.url );
        that.$emit( req.method.toLowerCase() , [ req , res , parsed ]);
      },

      extend: function( req , res , parsed ) {
        
        var that = this;

        requires$$extend( req , {
          path: decodeURIComponent( parsed.pathname ),
          search: parsed.search,
          query: requires$$querystring.parse( parsed.query ),
        });

        requires$$extend( res , {
          engage: function( data ) {
            requires$$extend( res , data );
            res.busy = true;
          },
          busy: false
        });
      },

      handleE$: function( e , req , res , parsed ) {
        var that = this;
        var routes = that.routes[e.type] || [];
        var reqhandler;
        for (var i = 0; i < routes.length; i++) {
          reqhandler = routes[i];
          if (reqhandler.test( parsed.pathname ) && !res.busy) {
            that.extend( req , res , parsed );
            reqhandler.exec( req , res );
          }
        }
        requires$$briskit(function() {
          if (!res.busy) {
            routes.else.exec( req , res );
          }
        });
      },

      get: function( pattern ) {
        var that = this;
        var reqhandler = new request$handler$$default( pattern || /.*/ );
        that.routes.get.push( reqhandler );
        return reqhandler;
      }

    });

    var $$index$$default = router$$default;

    if (typeof define == 'function' && define.amd) {
      define([], function() { return $$index$$default });
    }
    else {
      module.exports = $$index$$default;
    }
}).call(this);

