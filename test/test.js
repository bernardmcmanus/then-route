(function() {

  'use strict';

  var path = require( 'path' );
  var fs = require( 'fs-extra' );

  var project_root = path.resolve( __dirname , '../..' );

  var pkg = fs.readJsonSync(
    path.join( project_root , 'package.json' )
  );

  var router = require(
    path.join( project_root , pkg.main )
  );

  // tests

}());



















