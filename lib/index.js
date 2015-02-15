module.exports = (function() {


  var url = require( 'url' );
  var querystring = require( 'querystring' );
  var E$ = require( 'emoney' );
  var briskit = require( 'briskit' );
  var extend = require( 'extend' );
  var RequestHandler = require( './request-handler' );


  function Router() {

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

    that.routes = {
      get: get
    };
    
    E$.construct( that );
    
    that.$when();
  }

  Router.prototype = E$.create({

    handle: function( req , res ) {
      var that = this;
      var parsed = url.parse( req.url );
      that.$emit( req.method.toLowerCase() , [ req , res , parsed ]);
    },

    extend: function( req , res , parsed ) {
      
      var that = this;

      extend( req , {
        path: decodeURIComponent( parsed.pathname ),
        search: parsed.search,
        query: querystring.parse( parsed.query ),
      });

      extend( res , {
        engage: function( data ) {
          extend( res , data );
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
      briskit(function() {
        if (!res.busy) {
          routes.else.exec( req , res );
        }
      });
    },

    get: function( pattern ) {
      var that = this;
      var reqhandler = new RequestHandler( pattern || /.*/ );
      that.routes.get.push( reqhandler );
      return reqhandler;
    }

  });


  return Router;


}());



















