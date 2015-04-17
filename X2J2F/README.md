# X2J2F - XML to JSON to Firebase

## Introduction

Getting a huge XML file and import it in Firebase so the data is easily accessible from your (web) application.

## Getting started

Install all dependencies by running the following in the root of the project:

	$ npm install
    $ bower install

## Usage

Basic usage:

	$ node ./tasks/x2j2f.js -x path/to/file.xml [-f https://myProject.firebaseIO.com]

Options:

	-x, --xml           Path to XML file [required]
	-f, --firebase-url  URL to Firebase project, when omitted only the JSON file gets created

