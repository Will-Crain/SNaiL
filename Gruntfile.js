// Author: Screeps user tedivm. thank you!!
module.exports = function(grunt) {

	// your `.screeps.json` file should be read like:
	/*
	{
		"email": 	"yourEmail",
		"password":	"yourScreepsPassword",
		"token": 	"anAuthenticatorTokenFromScreeps",
		"branch": 	"theBranchYouWantToCommitTo",

		"private_directory":	"C:/Users/yourUser/AppData/Local/Screeps/scripts/127_0_0_1___21025"
	}
	Make sure your .screeps.json file is in gitignore, and these grunt tasks create
	a directory 'dist' in the project folder, but it's just a flattened version of
	your code to be shipped. I also recommend adding `dist` to your gitignore

	My project is setup as follows:
	SNaiL
		dist
		src
			all the things src contains; you can see it on github repo
		.gitignore
		.screeps.json
		grunt-screeps.js
		Gruntfile.js
	*/

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

		// Remove all files from ..
		clean: {
			// force must be on so it can clear files out of directories that aren't this one (for the private server)
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
			// Copies flattened game code to my private server directory
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
		let outStr = ``
		let priorityFiles = ['globals']
		for (let fileName of priorityFiles) {
			outStr += `require('${fileName}')\n`
		}
		outStr += '\n'
		
		grunt.file.recurse(directory, function(path, rootDirectory, subDirectory, fileName) {
			if (fileName != 'main.js' && !priorityFiles.includes(fileName)) {
				let name = fileName.slice(0, fileName.length-3)
				let requireString = `require('${name}')`
				outStr += `${requireString}\n`
			}
		})

		grunt.file.write(`${dest}/require.js`, outStr)
	})

	grunt.registerTask('default',	['clean', 'copy', 'makeRequireFile', 'screeps'])
	grunt.registerTask('private',	['clean', 'makeRequireFile', 'clean:private', 'copy', 'copy:private'])

	/*
	if you want to use grunt, you'll have to navigate to this folder (cd Documents/GitHub/SNaiL for me)
	additionally, you'll need to install grunt-clean, grunt-copy, and grunt-screeps

	npm install grunt-clean
	npm install grunt-copy
	npm install grunt-screeps

	then navigate to this project's folder &
	
	npm install
	^ i dont actually know if that is necessary, i'm not very good at this

	then to execute grunt, use the following commands:
	to upload to screeps.com:		grunt
	to upload to private server:	grunt private

	
	*/
}
