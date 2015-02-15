(function() {

  'use strict';

  var path = require( 'path' );
  var fs = require( 'fs-extra' );
  var url = require( 'url' );
  var colors = require( 'colors' );
  var Promise = require( 'es6-promise' ).Promise;
  var http = require( 'http' );
  var mocha = require( 'mocha' );
  var chai = require( 'chai' );
  var expect = chai.expect;

  var project_root = path.resolve( __dirname , '..' );

  var pkg = fs.readJsonSync(
    path.join( project_root , 'package.json' )
  );

  var Router = require(
    path.join( project_root , pkg.main )
  );


  var PORT = 8282;
  var BASE_URL = 'http://localhost:' + PORT;
  var BASE_PATH = '/base';

  var router;
  var server = http.createServer(function ( req , res ) {
    router.handle( req , res );
  });
  server.listen( PORT );
  console.log(( 'server running at ' + BASE_URL ).cyan );


  function getRandomRoute( subdir ) {
    subdir = '/' + (subdir || '').replace( /^\// , '' );
    var guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });
    var route = path.join( subdir , guid );
    var reqPath = path.join( BASE_PATH , subdir , guid );
    var reqUrl = url.resolve( BASE_URL , reqPath );
    return {
      route: route,
      url: reqUrl
    };
  }


  describe( 'Router' , function() {

    it( 'should handle http requests' , function( done ) {

      router = new Router( BASE_PATH , { verbose: false });

      router.get( BASE_PATH ).then(function( req , res ) {
        res.writeHead( 200 );
        res.end();
      });

      var reqUrl = url.resolve( BASE_URL , BASE_PATH );
      get( reqUrl ).then(function( res ) {
        expect( res.statusCode ).to.equal( 200 );
        router.destroy();
        done();
      })
      .catch( done );
    });

    it( 'should anchor base to the beginning of the route' , function( done ) {

      router = new Router( BASE_PATH , { verbose: false });

      var group = getRandomRoute( 'foo/gnarly' );
      group.url = group.url.replace( BASE_PATH , path.join( '/gnar' , BASE_PATH ));

      router.get( group.route ).then(function( req , res ) {
        expect( false ).to.be.ok;
      });

      get( group.url ).then(function( res ) {
        expect( res.statusCode ).to.equal( 404 );
        router.destroy();
        done();
      })
      .catch( done );
    });

    it( 'should respond to base route with a trailing /' , function( done ) {

      router = new Router( BASE_PATH , { verbose: false });

      var route = path.join( BASE_PATH , '/' );

      router.get( route ).then(function( req , res ) {
        res.writeHead( 200 );
        res.end();
      });

      var reqUrl = url.resolve( BASE_URL , BASE_PATH ) + '/';
      get( reqUrl ).then(function( res ) {
        expect( res.statusCode ).to.equal( 200 );
        router.destroy();
        done();
      })
      .catch( done );
    });

    it( 'should respond to requests for an unmatching route with a 404' , function( done ) {

      router = new Router( BASE_PATH , { verbose: false });

      var reqUrl = url.resolve( BASE_URL , 'adsfjkdsa' );
      get( reqUrl ).then(function( res ) {
        expect( res.statusCode ).to.equal( 404 );
        router.destroy();
        done();
      })
      .catch( done );
    });

    it( 'should respond to requests for an unmatching base route with a 404' , function( done ) {

      router = new Router( BASE_PATH , { verbose: false });
      
      var route = path.join( BASE_PATH , 'rad' );
      var reqUrl = url.resolve( BASE_URL , 'gnarly/rad' );

      router.get( route ).then(function( req , res ) {
        res.writeHead( 200 );
        res.end();
      });

      get( reqUrl ).then(function( res ) {
        expect( res.statusCode ).to.equal( 404 );
        router.destroy();
        done();
      })
      .catch( done );
    });

    it( 'should respond with a 500 when an unhandled exception is thrown' , function( done ) {

      router = new Router( BASE_PATH , { verbose: false });
      
      var group = getRandomRoute();

      router.get( group.route ).then(function( req , res ) {
        throw new Error( 'success!' );
      });

      get( group.url ).then(function( res ) {
        expect( res.statusCode ).to.equal( 500 );
        router.destroy();
        done();
      })
      .catch( done );
    });

    it( 'should not respond unless prompted when a handled exception is thrown' , function( done ) {

      router = new Router( BASE_PATH , { verbose: false });
      
      var group = getRandomRoute();

      router.get( group.route ).then(function( req , res ) {
        throw new Error( 'success!' );
      })
      .catch(function( req , res , err ) {
        expect( err ).to.be.an.instanceOf( Error );
        res.writeHead( 200 );
        res.end();
      });

      get( group.url ).then(function( res ) {
        expect( res.statusCode ).to.equal( 200 );
        router.destroy();
        done();
      })
      .catch( done );
    });

    describe( '#get' , function() {

      it( 'should accept a string route' , function( done ) {

        router = new Router( BASE_PATH , { verbose: false });

        var group = getRandomRoute( 'foo/gnarly' );

        router.get( group.route ).then(function( req , res ) {
          res.writeHead( 403 );
          res.end();
        });

        get( group.url ).then(function( res ) {
          expect( res.statusCode ).to.equal( 403 );
          router.destroy();
          done();
        })
        .catch( done );
      });

      it( 'should accept a regexp route' , function( done ) {

        router = new Router( BASE_PATH , { verbose: false });

        var group = getRandomRoute( 'foo/gnarly' );
        var re = new RegExp( '\\' + BASE_PATH + '.*' );

        router.get( re ).then(function( req , res ) {
          res.writeHead( 200 );
          res.end();
        });

        get( group.url ).then(function( res ) {
          expect( res.statusCode ).to.equal( 200 );
          router.destroy();
          done();
        })
        .catch( done );
      });

      it( 'should be relative to router base' , function( done ) {

        router = new Router( BASE_PATH , { verbose: false });

        var group = getRandomRoute( 'foo/gnarly' );
        group.url = group.url.replace( BASE_PATH , '' );

        router.get( group.route ).then(function( req , res ) {
          res.writeHead( 404 );
          res.end();
        });

        get( group.url ).then(function( res ) {
          expect( res.statusCode ).to.equal( 404 );
          router.destroy();
          done();
        })
        .catch( done );
      });
    });

    describe( '#engage' , function() {

      it( 'should prevent the else handler from being executed' , function( done ) {

        router = new Router( BASE_PATH , { verbose: false });

        var group = getRandomRoute();

        router.get( group.route ).then(function( req , res ) {
          res.$engage({ foo: 'bar' });
          expect( res.$busy ).to.be.ok;
          setTimeout(function() {
            router.destroy();
            done();
          }, 20);
        });

        get( group.url ).then(function( res ) {
          expect( false ).to.be.ok;
        })
        .catch( done );
      });

      it( 'should extend res with a data property by default' , function( done ) {

        router = new Router( BASE_PATH , { verbose: false });

        var group = getRandomRoute();
        var data = { foo: 'bar' };

        router.get( group.route ).then(function( req , res ) {
          res.$engage( data );
          expect( res.data ).to.eql( data );
          res.end();
        });

        get( group.url ).then(function( res ) {
          expect( res.statusCode ).to.equal( 200 );
          router.destroy();
          done();
        })
        .catch( done );
      });

      it( 'should extend res with a custom property when namespace is passed' , function( done ) {

        router = new Router( BASE_PATH , { verbose: false });

        var group = getRandomRoute();
        var data = { foo: 'bar' };

        router.get( group.route ).then(function( req , res ) {
          res.$engage( 'gnarly' , data );
          expect( res.gnarly ).to.eql( data );
          res.end();
        });

        get( group.url ).then(function( res ) {
          expect( res.statusCode ).to.equal( 200 );
          router.destroy();
          done();
        })
        .catch( done );
      });

      it( 'should be implied if stop or go are called' , function( done ) {

        router = new Router( BASE_PATH , { verbose: false });

        var group = getRandomRoute();

        router.get( group.route ).then(function( req , res ) {
          res.$go();
        })
        .then(function( req , res ) {
          res.end();
        });

        get( group.url ).then(function( res ) {
          expect( res.statusCode ).to.equal( 200 );
          router.destroy();
          done();
        })
        .catch( done );
      });
    });

    describe ( 'res.$go' , function() {

      it( 'should should allow handler chain to continue after #engage is called' , function( done ) {

        router = new Router( BASE_PATH , { verbose: false });

        var group = getRandomRoute();
        var continues = 0;

        router.get( group.route ).then(function( req , res ) {
          res.$engage({
            continues: function() {
              continues++;
              return continues;
            }
          });
          expect( arguments.length ).to.equal( 2 );
          expect( res.data.continues() ).to.equal( 1 );
          setTimeout(function() {
            res.$go();
          }, 20);
        })
        .then(function( req , res ) {
          expect( arguments.length ).to.equal( 2 );
          expect( res.data.continues() ).to.equal( 2 );
          setTimeout(function() {
            res.$go();
          }, 20);
        })
        .then(function( req , res ) {
          expect( arguments.length ).to.equal( 2 );
          expect( res.data.continues() ).to.equal( 3 );
          res.end();
        });

        get( group.url ).then(function( res ) {
          expect( res.statusCode ).to.equal( 200 );
          router.destroy();
          done();
        })
        .catch( done );
      });
    });

    describe ( 'res.$stop' , function() {

      it( 'should begin execution of the error handler chain' , function( done ) {

        router = new Router( BASE_PATH , { verbose: false });

        var group = getRandomRoute();
        var error = new Error( 'error!' );
        var statusCode = 0;

        router.get( group.route ).then(function( req , res ) {
          res.$engage();
          res.$stop( error );
        })
        .then(function( req , res ) {
          expect( false ).to.be.ok;
        })
        .catch(function( req , res , err ) {
          expect( err ).to.equal( error );
          res.$go();
        })
        .then(function( req , res ) {
          expect( false ).to.be.ok;
        })
        .catch(function( req , res , err ) {
          res.end();
          setTimeout(function() {
            expect( statusCode ).to.equal( 200 );
            router.destroy();
            done();
          }, 20);
        });

        get( group.url ).then(function( res ) {
          statusCode = res.statusCode;
          expect( res.statusCode ).to.equal( 200 );
        })
        .catch( done );
      });
    });
  });


  function get( url ) {
    return new Promise(function( resolve ) {
      var options = {
        host: 'localhost',
        port: PORT,
        path: url,
        agent: false
      };
      http.get( options , resolve );
    })
    .then(function( res ) {
      return res;
    });
  }

}());



















