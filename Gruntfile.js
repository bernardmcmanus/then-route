
module.exports = function( grunt ) {


  var fs = require( 'fs-extra' );
  var cp = require( 'child_process' );
  var util = require( 'util' );
  var Promise = require( 'es6-promise' ).Promise;
  var colors = require( 'colors' );
  var AMDFormatter = require( 'es6-module-transpiler-amd-formatter' );
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
      all: [ 'Gruntfile.js' , LIB ],
      options: {
        esnext: true
      }
    },

    'import-clean': {
      all: LIB
    },

    clean: {
      'dist': [ 'dist' ],
      'tmp': [ 'tmp' ],
      'common-dev': [ 'dist/<%= pkg.name %>-<%= pkg.version %>.js' ],
      'common-prod': [ 'dist/<%= pkg.name %>-<%= pkg.version %>.min.js' ],
      'amd-dev': [ 'dist/<%= pkg.name %>-<%= pkg.version %>.amd.js' ],
      'amd-prod': [ 'dist/<%= pkg.name %>-<%= pkg.version %>.amd.min.js' ]
    },

    replace: {
      npm: {
        options: {
          patterns: [
            {
              match: /(\"version\")(.*?)(\")(.{1,}?)(\")/i,
              replacement: '\"version\": \"<%= pkg.version %>\"'
            },
            {
              match: /(\"main\")(.*?)(\")(.{1,}?)(\")/i,
              replacement: '\"main\": \"dist/<%= pkg.name %>-<%= pkg.version %>.js\"'
            }
          ]
        },
        files: [{
          src: 'package.json',
          dest: 'package.json'
        }]
      }
    },

    watch: {
      debug: {
        files: [ 'Gruntfile.js' , LIB , 'build/*.js' , 'test/*.js' ],
        tasks: [ 'test' ]
      }
    },

    transpile: {
      amd: {
        type: 'amd',
        files: [{
          expand: true,
          cwd: 'lib/',
          src: [ '**/*.js' ],
          dest: 'tmp/',
          ext: '.amd.js'
        }]
      }
    },

    concat: {
      options: {
        banner: '/*! <%= pkg.name %> - <%= pkg.version %> - <%= pkg.author.name %> - <%= grunt.config.get( \'git-branch\' ) %> - <%= grunt.config.get( \'git-hash\' ) %> - <%= grunt.template.today("yyyy-mm-dd") %> */\n\n'
      },
      amd: {
        src: 'tmp/**/*.amd.js',
        dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.amd.js'
      },
      common: {
        src: 'tmp/<%= pkg.name %>.common.js',
        dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.js'
      }
    },

    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> - <%= pkg.version %> - <%= pkg.author.name %> - <%= grunt.config.get( \'git-branch\' ) %> - <%= grunt.config.get( \'git-hash\' ) %> - <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      amd: {
        files: {
          'dist/<%= pkg.name %>-<%= pkg.version %>.amd.min.js': 'tmp/**/*.amd.js'
        }
      },
      common: {
        files: {
          'dist/<%= pkg.name %>-<%= pkg.version %>.min.js': 'tmp/**/*.js'
        }
      }
    }

  });

  
  [
    'grunt-contrib-jshint',
    'grunt-contrib-clean',
    'grunt-git-describe',
    'grunt-replace',
    'grunt-contrib-concat',
    'grunt-contrib-uglify',
    'grunt-contrib-watch',
    'grunt-es6-module-transpiler',
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


  grunt.registerTask( 'transpile:common' , function() {
    var name = grunt.config.get( 'pkg.name' );
    transpile( '../build/' + name + '.umd' , 'tmp/' + name + '.common.js' );
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


  grunt.registerTask( 'build:describe-prod' , function() {
    var files = grunt.file.expand( LIB );
    var pkg = grunt.config.get( 'pkg' );
    var name = pkg.name + '-' + pkg.version + '.min.js';
    var bytesInit = files.reduce(function( prev , current ) {
      return prev + fs.statSync( current ).size;
    }, 0);
    var bytesFinal = fs.statSync( 'dist/' + name ).size;
    var kbInit = (Math.round( bytesInit / 10 ) / 100);
    var kbFinal = (Math.round( bytesFinal / 10 ) / 100).toString();
    console.log('File ' + name.cyan + ' created: ' + (kbInit + ' kB').green + ' \u2192 ' + (kbFinal + ' kB').green);
  });


  grunt.registerTask( 'runTests' , function() {
    var done = this.async();
    new Promise(function( resolve ) {
      var task = cp.spawn( 'npm' , [ 'test' ]);
      resolve( task.stdout );
    })
    .then(function( readable ) {
      readable.pipe( process.stdout );
      return new Promise(function( resolve , reject ) {
        readable.on( 'end' , resolve );
        readable.on( 'error' , reject );
      })
      .catch(function( err ) {
        return err;
      });
    })
    .then( done );
  });


  grunt.registerTask( 'git' , [
    'git-describe',
    'git-hash',
    'git-branch'
  ]);


  grunt.registerTask( 'default' , [
    'clean',
    'build',
    'replace',
    'test',
    'build:describe-prod'
  ]);


  grunt.registerTask( 'build' , [
    'git',
    'clean:dist',
    //'build:amd',
    'build:common'
  ]);


  grunt.registerTask( 'build:common' , [
    'build:common-dev',
    'build:common-prod'
  ]);


  grunt.registerTask( 'build:common-prod' , [
    'clean:common-prod',
    'transpile:common',
    'uglify:common',
    'clean:tmp'
  ]);


  grunt.registerTask( 'build:common-dev' , [
    'clean:common-dev',
    'transpile:common',
    'concat:common',
    'clean:tmp'
  ]);


  grunt.registerTask( 'build:amd' , [
    'build:amd-dev',
    'build:amd-prod'
  ]);


  grunt.registerTask( 'build:amd-prod' , [
    'clean:amd-prod',
    'transpile:amd',
    'uglify:amd',
    'clean:tmp'
  ]);


  grunt.registerTask( 'build:amd-dev' , [
    'clean:amd-dev',
    'transpile:amd',
    'concat:amd',
    'clean:tmp'
  ]);


  grunt.registerTask( 'test' , [
    'jshint',
    'import-clean',
    'build:common-dev',
    'runTests'
  ]);


  grunt.registerTask( 'debug' , [
    'test',
    'watch:debug'
  ]);

};

















