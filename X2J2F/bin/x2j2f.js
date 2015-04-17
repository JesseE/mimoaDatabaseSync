(function () {
	'use strict';

	// Required modules
	var path = require('path');
	var fs = require('fs');
	var Promise = require('node-promise').Promise;
	var xml2json = require('xml-to-json');

	// Promises
	var promiseXmlToJson = new Promise();
	var promiseCleanJson = new Promise();
	var promiseFirebaseImport = new Promise();

	// Kick off application

	init();

	// Handle promises
	promiseXmlToJson.then(function (configuration) {
		console.log('[+] XML to JSON successful');

		// Remove illegal characters from the JSON
		createCleanJSON(configuration);
	}, function (error) {
		console.log('[-] Failed to convert XML to JSON', error);
	});

	promiseCleanJson.then(function (configuration) {
		console.log('[+] Clean JSON file created:', configuration.outputFile);

		if (configuration.firebaseUrl) {
			// Import the generated JSON in Firebase
			firebaseImport(configuration);
		}
	}, function (error) {
		console.log('[-] Failed to clean JSON', error);
	});

	promiseFirebaseImport.then(function (result) {
		console.log(result.stdout);
		//console.log(result.execCmd);
		//console.log('[+] Imported in', result.configuration.firebaseUrl);
	}, function(error) {
		console.log('[-] Failed to import JSON in to Firebase', error.stderr);
		//console.log('[-] Error log:', error.error);
	});

	/**
	 * Init the application
	 */
	function init() {

		// Get arguments from command line
        var options = getArguments();

		// Configuration object
		var configuration = getConfiguration(options);

		// Convert XML to JSON
		xmlToJson(configuration);
	}

	/**
	 * Create the configuration object with file paths etc.
	 *
	 * @param options
	 * @returns {{firebaseUrl: string, nodeBinPath: string, inputFile: string, outputFile: string}}
	 */
	function getConfiguration(options) {
		var projectRoot = process.cwd();
		var inputFilePath = options.xml;
		var outputDir = path.dirname(projectRoot + path.sep + inputFilePath);
		var outputFile = path.basename(projectRoot + path.sep + inputFilePath, path.extname(inputFilePath));

		return {
			firebaseUrl: options['firebase-url'],
			nodeBinPath: projectRoot + '/node_modules/.bin/', // Using full path to avoid adding 'node_modules/.bin' to the $PATH
			inputFile: projectRoot + path.sep + inputFilePath,
			outputFile: outputDir + path.sep + outputFile + '.json'
		};
	}

	/**
	 * Get the command line arguments or show a
	 * usage message / error when required arguments are missing
	 *
	 * @returns {Object} Command line arguments
	 */
	function getArguments() {
		// Get arguments from command line and create usage
		return require('yargs')
			.usage('Usage: $0 -x <path/to/file.xml> [-f [https://myProject.firebaseIO.com]')
			.alias('x', 'xml')
			.describe('x', 'Path to XML file')
			.alias('f', 'firebase-url')
			.describe('f', 'URL to Firebase project, when omitted only the JSON file gets created')
			.demand(['xml'])
			.argv;
	}

	/**
	 * Convert XML to JSON
	 *
	 * @param {Object} configuration
	 */
	function xmlToJson(configuration) {

		xml2json({
            input: configuration.inputFile,
			output: configuration.outputFile
		}, function (error, result) {
			if (error) {
				promiseXmlToJson.reject(error);
			} else {
				configuration.json = result;

                promiseXmlToJson.resolve(configuration);
            }
		});
	}

	/**
	 * Clean a JSON file to not contain any characters
	 * in the key that are deemed illegal by Firebase (".", "#", "$", "[", or "]")
	 *
	 * @param {Object} configuration
	 */
	function createCleanJSON(configuration) {
		// Write clean JSON file to disk
		fs.writeFile(configuration.outputFile, textReplace(JSON.stringify(configuration.json)), 'utf8', function (error) {
			if (error) {
				promiseCleanJson.reject(error);
			} else {
				promiseCleanJson.resolve(configuration);
			}
		});
	}

	/**
	 * Replace matched characters with a describing text
	 * Matching characters (".", "#", "$", "[", or "]")
	 *
	 * @param {String} text
	 * @returns {XML|string|void}
	 */
	function textReplace(text) {
		return text.replace(/"([\.#\$\[\]])":/g, function (group0, group1) {
			var replaced = group1;

			// @TODO: Replace the special characters with something meaningful
			switch (group1) {
				case '.':
				case '#':
				case '$':
				case '[':
				case ']':
					replaced = '_attributes';
					break;
			}

			return '"' + replaced + '":';
		});
	}

	/**
	 * Import JSON to Firebase
	 *
	 * @param {Object} configuration
	 */
	function firebaseImport(configuration) {
		// Required modules
		var sys = require('sys');
		var exec = require('child_process').exec;

		var execCmd = configuration.nodeBinPath
			+ 'firebase-import -f '
			+ configuration.firebaseUrl
			+ ' -j '
			+ configuration.outputFile
			+ ' --force';

		exec(execCmd, function(error, stdout, stderr) {
			// @TODO: Figure out why the import outputs an error but
			// successfully imports the data anyway
			//if (error) {
			//	promiseFirebaseImport.reject({
			//		stderr: stderr,
			//		error: error
			//	});
			//} else {
			//	promiseFirebaseImport.resolve({
			//		configuration: configuration,
			//		stdout: stdout,
			//		execCmd: execCmd
			//	});
			//}

			promiseFirebaseImport.resolve({
				configuration: configuration,
				stdout: stdout,
				execCmd: execCmd
			});
		});
	}
}());