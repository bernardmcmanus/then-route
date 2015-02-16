node-http-router
===============

> promise-based, asynchronous http request router

## Instantiation
```javascript
// defaults
var base = '/';
var options = { verbose: true };

var router = new Router( base , options );
```

## Server Hook
```javascript
var server = http.createServer(function ( req , res ) {
  router.handle( req , res );
});
```

## Routing
```javascript
router.get( '/pattern' ).then(function( req , res ) {
  // matches only "/pattern" or "/pattern/"
});

router.get( '/pattern/*' ).then(function( req , res ) {
  // matches only "/pattern/[child]"
});

router.get( '/pattern*' ).then(function( req , res ) {
  // matches "/pattern", "/pattern/", or "/pattern/[child]"
});

router.get( /^\/\w{2}\d{3}/ ).then(function( req , res ) {
  // matches anything of the format "/XX000"
});
```

## Default Responses
```javascript
// 404 Not Found
router.get( '/pattern' ).then(function( req , res ) {
  // unhandled
});

// 500 Internal Server Error
router.get( '/pattern' ).then(function( req , res ) {
  throw new Error( 'error!' );
});
```

## Synchronous Responses
```javascript
router.get( '/pattern?gnarly=true' ).then(function( req , res ) {
  
  // read data from request
  var body = {
    path: req.$path,
    search: req.$search,
    data: req.$data
  };
  
  // {
  //   "path": "/pattern",
  //   "search": "gnarly=true",
  //   "data": {
  //     "gnarly": true
  //   }
  // }
  var json = JSON.parse( body );
  
  // send response headers
  res.writeHead( 200 , {
    'Content-Type': 'application/json'
  });
  
  // send response body
  res.end( json );
});
```

## Asynchronous Responses
```javascript
router.get( '/pattern' ).then(function( req , res ) {
  
  // a data object to pass along the chain
  var data = { token: 'xxxxx' };

  // let the router know we don't
  // want to keep looking for a match
  // and extend res.$data with data
  res.$engage( data );
  
  // continue to the next block
  res.$go();
})
.then(function( req , res ) {

  doSomeAsyncTask(function( data ) {
  
    // data: { gnarly: true }
    // extend res.$data again
    res.$engage( data );
    
    // continue to the next block
    res.$go();
  });
})
.then(function( req , res ) {
  
  // {
  //   "token": "xxxxx",
  //   "gnarly": true
  // }
  var json = JSON.stringify( res.$data );
  
  // send response headers
  res.writeHead( 200 , {
    'Content-Type': 'application/json'
  });
  
  // send response body
  res.end( json );
});

```

## Error Handling
```javascript
// thrown errors
router.get( '/pattern' ).then(function( req , res ) {
  throw new Error( 'error!' );
})
.catch(function( req , res , err ) {
  // continue to the next block
  res.$go();
})
.catch(function( req , res , err ) {
  var message = err ? err.message : 'error';
  if (err instanceof Error) {
    Router.printStack( err );
  }
  res.end( message );
});

// res.$stop()
router.get( '/pattern' ).then(function( req , res ) {
  // go to the catch block
  res.$stop();
})
.catch(function( req , res , err ) {
  // continue to the next block
  res.$go();
})
.catch(function( req , res , err ) {
  res.writeHead( 403 );
  res.end( '403 Forbidden' );
});

```























