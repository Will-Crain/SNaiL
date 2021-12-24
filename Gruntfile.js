// Author: Screeps user tedivm. thank you!!
module.exports = function(grunt) {

	var config = require('./.screeps.json')
	var branch = grunt.option('branch') || config.branch
	var email = grunt.option('email') || config.email
	var password = grunt.option('password') || config.password
	var private_directory = grunt.option('private_directory') || config.private_directory

	grunt.loadNpmTasks('grunt-screeps')
	grunt.loadNpmTasks('grunt-contrib-clean')
	grunt.loadNpmTasks('grunt-contrib-copy')

	grunt.initConfig({
		// ty artem for grunt-screeps
		screeps: {
			options: {
				email: email,
				password: password,
				branch: branch
			},
			dist: {
				src: ['dist/*.js'],
			}
		},

		// Remove all files from the dist folder.
		clean: {
			options: {
				force: true
			},
			default: ['dist/*'],
			private: [`${private_directory}/${branch}/*`]
		},

		copy: {
			// Copies and flattens project to dist/ so it can be shipped
			default: {
				files: [{
					expand: true,
					cwd: 'src/',
					src: '**',
					dest: 'dist/',
					filter: 'isFile',
					flatten: true
				}]
			},
			private: {
				files: [{
					expand: true,
					cwd: 'dist/',
					src: '**',
					dest: `${private_directory}/${branch}/`,
					filter: 'isFile',
					flatten: true
				}]
			}
		}
	})

	// This task creates our require file, requiring everything except main.js, 
	// then truncates the file extension off
	grunt.registerTask('makeRequireFile', function(directory='src/', dest='dist/') {
		let outStr = ''
		grunt.file.recurse(directory, function(path, rootDirectory, subDirectory, fileName) {
			if (fileName != 'main.js') {
				let name = fileName.slice(0, fileName.length-3)
				let requireString = `require('${name}')`
				outStr += `${requireString}\n`
			}
		})

		grunt.file.write(`${dest}/require.js`, outStr)
	})

	grunt.registerTask('default',	['clean', 'copy', 'makeRequireFile', 'screeps']);
	grunt.registerTask('private',	['clean', 'clean:private', 'copy', 'makeRequireFile', 'copy:private']);
	grunt.registerTask('test',		['clean', 'makeRequireFile'])
}