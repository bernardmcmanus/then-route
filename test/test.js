(function() {

  'use strict';

  var path = require( 'path' );
  var fs = require( 'fs-extra' );
  var url = require( 'url' );
  var request = require( 'request' );
  var querystring = require( 'querystring' );
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


  var PORT = 8675;
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

    it( 'should handle get requests' , function( done ) {

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

    it( 'should handle post requests' , function( done ) {

      router = new Router( BASE_PATH , { verbose: false });

      router.post( BASE_PATH ).then(function( req , res ) {
        expect( req.$body ).to.eql( querystring.stringify( data.form ));
        expect( req.$data ).to.eql( data.form );
        res.writeHead( 200 );
        res.end();
      })
      .catch(function( req , res , err ) {
        Router.printStack( err );
      });

      var reqUrl = url.resolve( BASE_URL , BASE_PATH );
      var data = { form: { key: 'value' }};

      post( reqUrl , data ).then(function( res ) {
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

    it( 'should match all subdirectories when route ends in a wildcard (inclusive)' , function( done ) {

      router = new Router( BASE_PATH , { verbose: false });

      var route = '/foo/gnarly*';
      var group = getRandomRoute( 'foo/gnarly' );
      var actual = [];
      var urls = [
        group.url,
        url.resolve( BASE_URL , path.join( BASE_PATH , group.route , 'child' )),
        url.resolve( BASE_URL , path.join( BASE_PATH , group.route , '../sibling' )),
        url.resolve( BASE_URL , path.join( BASE_PATH , group.route , '..' )),
        url.resolve( BASE_URL , path.join( BASE_PATH , group.route , '..' )) + '/'
      ];
      var expected = urls.map(function( url , i ) {
        return i;
      });

      router.get( route ).then(function( req , res ) {
        res.end();
      });

      var promises = urls.map(function( url ) {
        return get( url ).then(function( res ) {
          expect( res.statusCode ).to.equal( 200 );
          actual.push( actual.length );
          return actual.length - 1;
        });
      });

      Promise.all( promises ).then(function( result ) {
        expect( result.length ).to.eql( actual.length );
        expect( actual.length ).to.eql( expected.length );
        router.destroy();
        done();
      })
      .catch( done );
    });

    it( 'should match all subdirectories when route ends in a wildcard (exclusive)' , function( done ) {

      router = new Router( BASE_PATH , { verbose: false });

      var route = '/foo/gnarly/*';
      var group = getRandomRoute( 'foo/gnarly' );
      var actual = [];
      var urls = [
        group.url,
        url.resolve( BASE_URL , path.join( BASE_PATH , group.route , 'child' )),
        url.resolve( BASE_URL , path.join( BASE_PATH , group.route , '../sibling' )),
        url.resolve( BASE_URL , path.join( BASE_PATH , group.route , '..' )),
        url.resolve( BASE_URL , path.join( BASE_PATH , group.route , '..' )) + '/'
      ];
      var expected = urls.map(function( url , i ) {
        return i;
      });

      router.get( route ).then(function( req , res ) {
        res.end();
      });

      var promises = urls.map(function( url ) {
        return get( url ).then(function( res ) {
          var code = (/gnarly\/?$/).test( url ) ? 404 : 200;
          expect( res.statusCode ).to.equal( code );
          actual.push( actual.length );
          return actual.length - 1;
        });
      });

      Promise.all( promises ).then(function( result ) {
        expect( result.length ).to.eql( actual.length );
        expect( actual.length ).to.eql( expected.length );
        router.destroy();
        done();
      })
      .catch( done );
    });

    it( 'should match no subdirectories when route does not end in a wildcard (inclusive)' , function( done ) {

      router = new Router( BASE_PATH , { verbose: false });

      var route = '/foo/gnarly';
      var group = getRandomRoute( 'foo/gnarly' );
      var actual = [];
      var urls = [
        group.url,
        url.resolve( BASE_URL , path.join( BASE_PATH , group.route , 'child' )),
        url.resolve( BASE_URL , path.join( BASE_PATH , group.route , '../sibling' )),
        url.resolve( BASE_URL , path.join( BASE_PATH , group.route , '..' )),
        url.resolve( BASE_URL , path.join( BASE_PATH , group.route , '..' )) + '/'
      ];
      var expected = urls.map(function( url , i ) {
        return i;
      });

      router.get( route ).then(function( req , res ) {
        res.end();
      });

      var promises = urls.map(function( url ) {
        return get( url ).then(function( res ) {
          var code = (/gnarly\/?$/).test( url ) ? 200 : 404;
          expect( res.statusCode ).to.equal( code );
          actual.push( actual.length );
          return actual.length - 1;
        });
      });

      Promise.all( promises ).then(function( result ) {
        expect( result.length ).to.eql( actual.length );
        expect( actual.length ).to.eql( expected.length );
        router.destroy();
        done();
      })
      .catch( done );
    });

    it( 'should match no subdirectories when route does not end in a wildcard (exclusive)' , function( done ) {

      router = new Router( BASE_PATH , { verbose: false });

      var route = '/foo/gnarly/';
      var group = getRandomRoute( 'foo/gnarly' );
      var actual = [];
      var urls = [
        group.url,
        url.resolve( BASE_URL , path.join( BASE_PATH , group.route , 'child' )),
        url.resolve( BASE_URL , path.join( BASE_PATH , group.route , '../sibling' )),
        url.resolve( BASE_URL , path.join( BASE_PATH , group.route , '..' )),
        url.resolve( BASE_URL , path.join( BASE_PATH , group.route , '..' )) + '/'
      ];
      var expected = urls.map(function( url , i ) {
        return i;
      });

      router.get( route ).then(function( req , res ) {
        res.end();
      });

      var promises = urls.map(function( url ) {
        return get( url ).then(function( res ) {
          var code = (/gnarly\/?$/).test( url ) ? 200 : 404;
          expect( res.statusCode ).to.equal( code );
          actual.push( actual.length );
          return actual.length - 1;
        });
      });

      Promise.all( promises ).then(function( result ) {
        expect( result.length ).to.eql( actual.length );
        expect( actual.length ).to.eql( expected.length );
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

    it( 'should match multiple routes until engaged' , function( done ) {

      router = new Router( BASE_PATH , { verbose: false });

      var group = getRandomRoute();
      var actual = [];
      var expected = [ 0 , 1 , 2 ].map(function( i ) {
        router.get().then(function( req , res ) {
          actual.push( i );
        });
        return i;
      });

      router.get( group.route ).then(function( req , res ) {
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

      it( 'should extend res.$data' , function( done ) {

        router = new Router( BASE_PATH , { verbose: false });

        var group = getRandomRoute();
        var data = { foo: 'bar' };

        router.get( group.route ).then(function( req , res ) {
          res.$engage( data );
          expect( res.$data ).to.eql( data );
          res.end();
        });

        get( group.url ).then(function( res ) {
          expect( res.statusCode ).to.equal( 200 );
          router.destroy();
          done();
        })
        .catch( done );
      });

      it( 'should be implied if go is called' , function( done ) {

        router = new Router( BASE_PATH , { verbose: false });

        var group = getRandomRoute();

        router.get( group.route ).then(function( req , res ) {
          res.$go();
        })
        .then(function( req , res ) {
          expect( res.$busy ).to.be.ok;
          res.end();
        });

        get( group.url ).then(function( res ) {
          expect( res.statusCode ).to.equal( 200 );
          router.destroy();
          done();
        })
        .catch( done );
      });

      it( 'should be implied if stop is called' , function( done ) {

        router = new Router( BASE_PATH , { verbose: false });

        var group = getRandomRoute();

        router.get( group.route ).then(function( req , res ) {
          res.$stop();
        })
        .catch(function( req , res , err ) {
          expect( res.$busy ).to.be.ok;
          res.end();
        });

        get( group.url ).then(function( res ) {
          expect( res.statusCode ).to.equal( 200 );
          router.destroy();
          done();
        })
        .catch( done );
      });

      it( 'should not be implied if an error is thrown' , function( done ) {

        router = new Router( BASE_PATH , { verbose: false });

        var group = getRandomRoute();

        router.get( group.route ).then(function( req , res ) {
          throw new Error( 'error!' );
        })
        .catch(function( req , res , err ) {
          expect( res.$busy ).to.not.be.ok;
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

    describe ( 'req' , function() {

      var group = getRandomRoute();
      var query = 'gnarly=true';

      describe ( '$path' , function() {
        it( 'should be the absolute request path' , function( done ) {

          router = new Router( BASE_PATH , { verbose: false });

          router.get( group.route ).then(function( req , res ) {
            expect( req.$path ).to.equal( path.join( BASE_PATH , group.route ));
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

      describe ( '$search' , function() {
        it( 'should be the query string' , function( done ) {

          router = new Router( BASE_PATH , { verbose: false });

          router.get( group.route ).then(function( req , res ) {
            expect( req.$search ).to.equal( '?' + query );
            res.end();
          });

          get( group.url + '?' + query ).then(function( res ) {
            expect( res.statusCode ).to.equal( 200 );
            router.destroy();
            done();
          })
          .catch( done );
        });
      });

      describe ( '$data' , function() {
        it( 'should be the parsed query data' , function( done ) {

          router = new Router( BASE_PATH , { verbose: false });

          router.get( group.route ).then(function( req , res ) {
            expect( req.$data ).to.eql( querystring.parse( query ));
            res.end();
          });

          get( group.url + '?' + query ).then(function( res ) {
            expect( res.statusCode ).to.equal( 200 );
            router.destroy();
            done();
          })
          .catch( done );
        });
      });
    });

    describe ( 'res' , function() {

      describe ( '$go' , function() {
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
            expect( res.$data.continues() ).to.equal( 1 );
            setTimeout(function() {
              res.$go();
            }, 20);
          })
          .then(function( req , res ) {
            expect( arguments.length ).to.equal( 2 );
            expect( res.$data.continues() ).to.equal( 2 );
            setTimeout(function() {
              res.$go();
            }, 20);
          })
          .then(function( req , res ) {
            expect( arguments.length ).to.equal( 2 );
            expect( res.$data.continues() ).to.equal( 3 );
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

      describe ( '$stop' , function() {
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

  });


  function get( url , data ) {
    return new Promise(function( resolve , reject ) {
      request.get( url , data , function ( err , res , body ) {
        return err ? reject( err ) : resolve( res );
      });
    })
    .then(function( res ) {
      return res;
    });
  }

  function post( url , data ) {
    return new Promise(function( resolve , reject ) {
      request.post( url , data , function ( err , res , body ) {
        return err ? reject( err ) : resolve( res );
      });
    })
    .then(function( res ) {
      return res;
    });
  }

}());



















