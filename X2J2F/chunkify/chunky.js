/**
 * Created by jesseeikema on 4/13/15.
 */
/**
 * Created by jesse on 27/02/15.
 */
var async = require('async');
var fs = require('graceful-fs');
var xml2js = require('xml2js');
var parser = new xml2js.Parser();
var http = require('http');
var url = 'http://www.mimoa.eu/widgets/mapps/';
var MongoClient = require('mongodb').MongoClient;
var schedule = require('node-schedule');
//setup timed function each night
//var runFunction = schedule.scheduleJob({hour: 1, minute: 00}, function(){
//    removeFilesInDirectory();
//});
removeFilesInDirectory();
// there are files in this directory remove them
function removeFilesInDirectory() {
    fs.readdir('X2J2F/jsonOutput', function(err, res) {
        if(err) { throw err;} else {
            var files = res;
            if(files.length == 0){
                console.log('no json files');
                removeXMLfeed();
            }else {
                for (var i = 0; i < files.length; i++) {
                    fs.unlink('X2J2F/jsonOutput/' + files[i], function (err, res) {
                        if (err) {
                            throw err;
                        } else {
                            console.log('remove files in jsonOutput');
                        }
                    });
                }
                removeXMLfeed();
            }
        }
    });
}
function removeXMLfeed() {
    fs.readdir('X2J2F/mimoaDB', function(err, res) {
        if(err) {throw err;} else{
            //console.log(res);
            var files = res;
            if(files.length == 0) {
                //console.log('no xml files');
                requestXMLFeed();
            } else {
                fs.unlink('X2J2F/mimoaDB/'+files, function(err, res) {
                     if(err) {throw err;} else {
                         console.log('removed xml files now fetching the new xml feed');
                         requestXMLFeed();
                     }
                });

            }
        }
    });
}
//requesting xml output from url
function requestXMLFeed() {
    http.get(url, function (res) {
        var xml = '';
        res.on('data', function (chunk) {
            xml += chunk;
        });
        res.on('end', function () {
            //write the feed to one xml file in this directory
            fs.writeFile('X2J2F/mimoaDB/mimoaDBFeed.xml', xml, function (err) {
                if (err) {
                    console.log(err);
                } else {
                    fetchXMLFile();
                }
            });
        });
    });
}
//get the xml file
function fetchXMLFile() {
    fs.readFile('X2J2F/mimoaDB/mimoaDBFeed.xml', function(err, data) {
        parser.parseString(data, function (err, result) {
            var xmlFileData = result.Document.item;
            writeXMLChunks(xmlFileData);
        });
    });
}
//return json file for each document item from the xml feed
function writeXMLChunks(xmlFileData){
    for (var i = 0; i < xmlFileData.length; i++) {
        fs.appendFileSync("X2J2F/jsonOutput/mimoaProjects" + i + ".json", JSON.stringify(xmlFileData[i]));
    }
    connectToDB();
}
//wait till the previous functions are done
function connectToDB() {
    MongoClient.connect("mongodb://JesseEikema:Eikema23@ds061651.mongolab.com:61651/mimoa", function(err, db) {
       if(err){
           console.log(err);
            throw err;
       } else {
           console.log('find collection and reset');

               if(err){throw err;}else{
                   console.log('there are no documents start uploading to mongolab');
                   fs.readdir('X2J2F/jsonOutput', function (err, files) {
                       if (err) {
                           console.log(err);
                           throw err;
                       } else {
                           async.forEach(files, function (file){
                               fs.readFile('X2J2F/jsonOutput/' + file, 'utf-8', function (err, data) {
                                   if (err) {
                                       console.log(err);
                                       throw err;
                                   } else {
                                       console.log('do JSON magic and Mongo Magic');
                                       var dirtyString = data;
                                       var cleanString = dirtyString.replace(/[$]/g, "value");
                                       var JSONobject = JSON.parse(cleanString);
                                       //if(mimoaDatabase.count > 8000) {
                                       db.collection('mimoaDatabase').update({id: JSONobject.id}, JSONobject, {upsert: true}, {multi: true}, function (err, res) {
                                              if(err) {console.log(err);} else {

                                              }
                                       });
                                       //}else{
                                       //  db.collection('mimoaDatabase').remove();
                                       //}

                                   }
                               });
                           }, function(err,res){
                               db.close();
                               if(err) {throw err;} else{
                                   console.log('no magic was need');
                               }
                           });

                       }
                   });
               }

       }
    });
}