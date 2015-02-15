
module.exports = function( grunt ) {


  var fs = require( 'fs-extra' );
  var cp = require( 'child_process' );
  var transpiler = require( 'es6-module-transpiler' );
  var Container = transpiler.Container;
  var FileResolver = transpiler.FileResolver;
  var BundleFormatter = transpiler.formatters.bundle;


  var LIB = 'lib/*.js';


  grunt.initConfig({

    pkg: grunt.file.readJSON( 'package.json' ),

    'git-describe': {
      'options': {
        prop: 'git-version'
      },
      dist: {}
    },

    jshint: {
      all: [ /*'Gruntfile.js' ,*/ LIB ],
      options: {
        esnext: true
      }
    },

    'import-clean': {
      all: LIB
    },

    clean: {
      'dist': [ 'dist' ],
      'tmp': [ 'tmp' ]
    },

    watch: {
      debug: {
        files: [ 'Gruntfile.js' , LIB , 'build/*.js' , 'test/*.js' ],
        tasks: [ 'test' ]
      }
    },

    concat: {
      options: {
        banner: '/*! <%= pkg.name %> - <%= pkg.version %> - <%= pkg.author.name %> - <%= grunt.config.get( \'git-branch\' ) %> - <%= grunt.config.get( \'git-hash\' ) %> - <%= grunt.template.today("yyyy-mm-dd") %> */\n\n'
      },
      build: {
        src: 'tmp/<%= pkg.name %>.js',
        dest: 'dist/<%= pkg.name %>.js'
      }
    }

  });

  
  [
    'grunt-contrib-jshint',
    'grunt-contrib-clean',
    'grunt-git-describe',
    'grunt-contrib-concat',
    'grunt-contrib-watch',
    'grunt-import-clean'
  ]
  .forEach( grunt.loadNpmTasks );


  function transpile( umd , out , formatter ) {

    formatter = formatter || BundleFormatter;

    var container = new Container({
      resolvers: [new FileResolver([ 'lib/' ])],
      formatter: new formatter()
    });

    container.getModule( umd );
    container.write( out );

    modifyTranspiled( out );
  }

  function modifyTranspiled( out ) {

    var transpiled = fs.readFileSync( out , 'utf-8' );

    // remove sourceMappingURL
    var sourceMapRegex = /(^.*sourceMappingURL.*\n?$)/mi;
    transpiled = transpiled.replace( sourceMapRegex , '' );

    // replace multiple line breaks
    var lbRegex = /\n{2,}/g;
    transpiled = transpiled.replace( lbRegex , '\n\n' );

    fs.writeFileSync( out , transpiled );
  }


  grunt.registerTask( 'transpile' , function() {
    var name = grunt.config.get( 'pkg.name' );
    transpile( '../build/' + name + '.umd' , 'tmp/' + name + '.js' );
  });


  grunt.registerTask( 'git-hash' , function() {

    grunt.task.requires( 'git-describe' );

    var rev = grunt.config.get( 'git-version' );
    var matches = rev.match( /\-?([A-Za-z0-9]{7})\-?/ );

    var hash = matches
      .filter(function( match ) {
        return match.length === 7;
      })
      .pop();

    if (matches && matches.length > 1) {
      grunt.config.set( 'git-hash' , hash );
    }
    else{
      grunt.config.set( 'git-hash' , rev );
    }
  });


  grunt.registerTask( 'git-branch' , function() {
    var done = this.async();
    cp.exec( 'git status' , function( err , stdout , stderr ) {
      if (!err) {
        var branch = stdout
          .split( '\n' )
          .shift()
          .replace( /on\sbranch\s/i , '' );
        grunt.config.set( 'git-branch' , branch );
      }
      done();
    });
  });


  grunt.registerTask( 'runTests' , function() {

    var done = this.async();
    var child = cp.spawn( 'npm' , [ 'test' ] , {stdio:['pipe','pipe','ignore']});

    child.on( 'exit' , function( code ) {
      if (code !== 0) {
        throw grunt.util.error( 'Tests process failed with exit code ' + code + '.\n' );
      }
    });

    child.stdout.pipe( process.stdout );
    child.stdout.on( 'end' , done );
  });


  grunt.registerTask( 'git' , [
    'git-describe',
    'git-hash',
    'git-branch'
  ]);


  grunt.registerTask( 'default' , [
    'clean',
    'build',
    'test'
  ]);


  grunt.registerTask( 'build' , [
    'git',
    'clean:dist',
    'transpile',
    'concat',
    'clean:tmp'
  ]);


  grunt.registerTask( 'test' , [
    'jshint',
    'import-clean',
    'build',
    'runTests'
  ]);


  grunt.registerTask( 'debug' , [
    'test',
    'watch:debug'
  ]);

};

















