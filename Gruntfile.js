module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-screeps');

    grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
        screeps: {
            options: {
                email: 'willcrain96@gmail.com',
                token: '1852ac98-501d-489e-9f81-828ad8a6c690',
                branch: 'SNaiL',
                server: '0'
            },
            dist: {
                src: ['src/*.js']
            }
        }
    });
}