module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-screeps');

    grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
        screeps: {
            options: {
                email: 'willcrain96@gmail.com',
                token: '3c040726-bbc4-4d51-9cd9-24edf957bd85',
                branch: 'SNaiL',
                server: '0'
            },
            dist: {
                src: ['src/*.js']
            }
        }
    });
}