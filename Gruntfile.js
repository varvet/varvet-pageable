module.exports = function(grunt) {
  // configure the tasks
  grunt.initConfig({
    clean: {
      build: {
        src: ['dist']
      }
    },
    uglify: {
      build: {
        options: {
          mangle: true,
          preserveComments: 'some'
        },
        files: {
          'dist/pageable-0.1.js': [ 'src/*.js' ]
        }
      }
    }
  });
 
  // load the tasks
  grunt.loadNpmTasks('grunt-version');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-uglify');
 
  // define the tasks
  grunt.registerTask(
    'build', 
    'Compiles all of the assets and copies the files to the dist directory.', 
    [ 'clean', 'uglify' ]
  );
};