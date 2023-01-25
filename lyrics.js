const cheerio = require("cheerio");
const axios = require("axios");
const fs = require("fs");
const config = require("./config");
const { toNamespacedPath } = require("path");
const today = new Date();

const instrumentalLabelText = 'song is an instrumental';
const lyricDownloadRetryDelay = 2000;
const unknownAlbumName = 'Unknown Album';
const cmdLineArgs = process.argv;
var lyricRetryCount = 0;
var fsFileName = "";
var totalLyricDownloads = 0;
var totalSongsFound = 0;
var unresolvedLyricErrorCount = 0;

// add any command line argument artists to search in addition to config artist
if(cmdLineArgs != null){
  // command line can have a single artist or array string '["Artist1","Artist2"]'  
  var commandLineArtists = getArrayFromCommandLineParameterString(cmdLineArgs[2]);
  if(commandLineArtists.length > 0){
    report(' Note: Artist(s) string parameter (' + commandLineArtists.join(',') + ') detected - will use this instead of the artist(s) values in config.js.','SUBTLE');
    config.artistList = [];
    for(var a=0;a<commandLineArtists.length;a++) config.artistList.push(commandLineArtists[a]); // config.artistList.push(cmdLineArgs[2]); /* DEBUG */ // console.log('config.artistList? [' + config.artistList[0] + ']');
  }  
}

var date =
  today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate();
var time =
  today.getHours() + "." + today.getMinutes() + "." + today.getSeconds();
var dateTime = date + " " + time;
var dateTimeTxt = date + " " + time + ".txt";

var curPage = config.curPage;
var artistID = "";
var URLbulk = [];
var URLbulkErrors = [];
var artistNameR = "";
var inited = 0;
var firstArtistName = "";
var currArtistSearchName = "";

console.log('\n-----------------------------------------------------\n');
console.log(' Lyrics-Downloader');
console.log(' Artist(s) Search: ' + config.artistList.join(", "));
console.log('\n-----------------------------------------------------');


initializeArtist(inited);

function initializeArtist(index) {
  var safeToProceed = true;
  if (config.apiKey == "") {
    report(" ! No API key found. Please enter one in config.js first.","ERROR");
    safeToProceed = false;
  }
  if (config.artistList == null || config.artistList == '' || config.artistList.length == 0) {
    report(" ! No artists found. Please enter at least one in config.js or as a command line parameter.","ERROR");
    console.log(' Example: node lyrics "My Band Name"');
    safeToProceed = false;
  }
  if (config.pageCount < 1) {
    report(" ! Page count must be at least 1.","ERROR");
    safeToProceed = false;
  }
  if (config.curPage < 1) {
    report(" ! Current page must be at least 1.","ERROR");
    safeToProceed = false;
  }
  if(!safeToProceed){        
    return;
  }
  axios
    .get(getSearchUrl(config.artistList[index]))
    .then(function (response) {

      // new way using https://genius.com/api/search/artist?q=${query} instead of https://api.genius.com/search?q=${query}&access_token=${config.apiKey}`
      var searchResultHits = response["data"]["response"]["sections"][0]["hits"];
      currArtistSearchName = config.artistList[index];     
      // console.log('...found data for artist ["' + currArtistSearchName + '"]'); 
      if(searchResultHits.length > 0){
        // still loop for correct artist here or just accept 1st one [0] index?
        var foundArtistID = searchResultHits[0]["result"]["api_path"].split("artists/")[1];
        var foundArtistName = searchResultHits[0]["result"]["name"];
        
        report('\n Found genius.com data for artist: "' + currArtistSearchName + '" (ID: ' + foundArtistID + ')\n');

        // handle success
        artistID = foundArtistID;
        artistNameR = foundArtistName;
        if (index == 0) {
          firstArtistName = artistNameR;
        }
        getSongs();
      }else{
        if(URLbulk.length > 0){
          getSongs();
        }else{
          report('\n ... Sorry. Lyrics-Downloader did not find any artist data for [' + currArtistSearchName + '] to process.','WARNING');
        }        
      }
    })
    .catch(function (error) {
      var arg = error.toString();
      var arg2 = JSON.stringify(error, null, 2);
      logDump("error", arg);
      logDump("dump", arg2);
      report("Error fetching songs. Make sure the config is valid.","ERROR");
      console.log("Error logged at:");
      console.log("logs/error-" + dateTime + ".txt");
      console.log("Full dump logged at:");
      console.log("logs/dump-" + dateTime + ".txt");
    })
    .then(function () {
      // always executed
    });
}

/*  
    getSearchUrl(): URL/JSON Change (2023012x)
    The old method for getting artist info used a different API/URL/json structure that would sometimes pull 
    back non-direct artist hits if the artist's name was in a song title for example.
    The new method seems a more dependable way to get the legit artist id from genius.com w/out indirect hits

    Old method URL example:
    https://api.genius.com/search?q=Polaris&access_token=YOUR_ACCESS_TOKEN_HERE
    New method URL example:
    https://genius.com/api/search/artist?q=Polaris
*/
function getSearchUrl(query) {        
  var searchURL = `https://genius.com/api/search/artist?q=${query}`;
  return searchURL;
}

function getSongsURL() {
  return `https://api.genius.com/artists/${artistID}/songs?sort=popularity&page=${curPage}`;
}

function getSongs() {
  var num = 0;
  axios
    .get(getSongsURL(), {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    })
    .then(function (response) {
      // handle success
      report(" ----- Search Pass " + curPage + ") -----",'SUBTLE');
      if (response["data"]["response"]["songs"].length > 1) {
        response["data"]["response"]["songs"].forEach((element) => {
          if (
            element["primary_artist"]["id"] == artistID &&
            response["data"]["response"]["songs"].length > 1
          ) {

            if(config.excludeInstrumentalLyrics == "True" && element["full_title"].toLowerCase().indexOf("instrumental",0) > 0){                
              // skip instrumentals
              console.log(' *Skipping* (Instrumental) Song: ' + element["full_title"]);
            }else{
              // add song to download list
              console.log(" Song: " + element["full_title"]);
              URLbulk.push(element["url"]);
            }            
          }
          num++;
        });
        if (config.pageCount > curPage) {
          curPage++;
          getSongs();
        } else {
          prepareToGetLyrics();
        }
      } else {
        prepareToGetLyrics();
      }
    })
    .catch(function (error) {
      // handle error
      var arg = error.toString();
      var arg2 = JSON.stringify(error, null, 2);
      logDump("error", arg);
      logDump("dump", arg2);
      report("Error fetching songs. Make sure the config is valid.",'ERROR');
      console.log("Error logged at:");
      console.log("logs/error-" + dateTime + ".txt");
      console.log("Full dump logged at:");
      console.log("logs/dump-" + dateTime + ".txt");
    })
    .then(function () {
      // always executed
    });
}

function prepareToGetLyrics(){
  try{
    if (inited < config.artistList.length - 1) {
      inited++;
      curPage = config.curPage;
      initializeArtist(inited);
    } else {
      report('\n Found ' + URLbulk.length + ' songs for "' + currArtistSearchName + '".');
      console.log('\n Now fetching song lyrics... ');          
      totalSongsFound += URLbulk.length;
      getLyrics();
    }
  }catch(ex){
    report(' ERROR: ' + ex.message,'ERROR');
  }
}

function getLyrics() {
  var count = 1;
  var finalcount = 0;
  var errorcount = 0;

  URLbulk.sort();
  if (config.fName == "") {
    fsFileName = firstArtistName;
  } else {
    fsFileName = config.fName;
  }
  if (config.concDate) {
    fsFileName = fsFileName + "-" + dateTime;
  }
  URLbulk.forEach((urlx) => {
    axios
      .get(urlx)
      .then(function (response) {
        // handle success
        let $ = cheerio.load(response["data"]);
        
        var lyricsWrapperText = $.html('div[class*="SongPage__LyricsWrapper"]');        
        var lyricsWrapperHTML = cheerio.load(lyricsWrapperText).text(); //* DEBUG */ console.log('lyricsWrapperHTML [' + lyricsWrapperHTML + ']');                                
        var isInstrumental = (lyricsWrapperHTML.indexOf(instrumentalLabelText,0) > 0);
                            
        $("[data-lyrics-container=true]").find("br").replaceWith("\n");

        // get song and artist elsewhere?
        var songNameHTML = $.html('h1[class*="SongHeaderdesktop__Title"] span');        
        var artistNameHTML = $.html('a[class*="SongHeaderdesktop__Artist"]');
        var albumNameAndTrackNumberHTML = $.html('div[class*="AlbumWrapper"]'); /* DEBUG */ // console.log('album info [' + albumNameAndTrackNumberHTML + ']');                              
        var albumNameHTML = $.html('div[class*="HeaderTracklist__Album-"]'); /* DEBUG */ // console.log('album info [' + albumNameAndTrackNumberHTML + ']');                              
        var songNameH1Str = cheerio.load(songNameHTML).text(); 
                        
        if(albumNameAndTrackNumberHTML == undefined || albumNameAndTrackNumberHTML.trim() == '') albumNameAndTrackNumberHTML = 'Track 0 on ' + unknownAlbumName;
        
        // abort now if fail to get song name, artist name, etc
        if(songNameHTML.trim() == '' || artistNameHTML.trim() == '' || albumNameAndTrackNumberHTML.trim() == ''){
          throw new CustomError('... failed to parse page fully. skipping song song[' + songNameH1Str + 
            '] albumNameAndTrackNumberStrParts empty?????????? [artistNameATag:' + artistNameATag + '] [albumNameAndTrackNumberHTML:' + albumNameAndTrackNumberHTML + '] [artistNameATag:' + artistNameATag + ']'); 
        }
        
        // song name
        var songName = songNameH1Str;
        songName = songName.replace(" | Genius Lyrics", "");                
        songName = songName.replace(" ", " "); // cemerson 20230105 | removed weird characters in name?        
                
        var nextTextFileName = fsFileName;

        // Song Name
        var actualSongName = songNameH1Str; // CE 20230124 | artistSongInfo[1].trim();          

        // sort out album name
        var albumNameStr = cheerio.load(albumNameHTML).text(); 
        var albumName = albumNameStr; // albumName = albumNameAndTrackNumberStrParts[1].trim();
        if(albumNameStr == '' || albumNameHTML == '') albumName = unknownAlbumName;             

        // ARTIST NAME           
        var artistNameATag = cheerio.load(artistNameHTML).text();  //* DEBUG */ console.log('... song[' + songNameH1Str + '] [artistNameATag:' + artistNameATag + '] [albumNameAndTrackNumberHTML:' + albumNameAndTrackNumberHTML + '] [artistNameATag:' + artistNameATag + ']'); 
        var artistName = artistNameATag; // CE 20230124 | artistSongInfo[0].trim();
                        
        // PREFIX ALBUM WITH ALBUM YEAR? 
        // Note: Not always 100% due to user-data errors - sometimes albums in genius have different years)
        if(config.filePerSongPrefixAlbumWithYear == "True"){            
          var albumYearStr = $.html('div[class*="_ReleaseDate"]');
          if(albumYearStr != undefined && albumYearStr.trim() != ''){
            var albumYearStr = cheerio.load(albumYearStr).text(); 
            if(albumYearStr.indexOf(',',0) > 0){ // sometimes its just a year, others its Month Day, Year
              albumYearStr = albumYearStr.split(", ")[1]; 
            }          
          }else{
            albumYearStr = '0000';        
          }               
          albumName = albumYearStr + ' - ' + albumName;
        }        
        
        // sort out album, track etc if saving a lyric file per song
        if(config.filePerSong == "True"){
               
          // track number
          var albumNameAndTrackNumberStr = cheerio.load(albumNameAndTrackNumberHTML).text(); /* DEBUG */ // console.log(albumNameAndTrackNumberStr); // Should be something like "Track 12 on Album Name"
          var trackNumber = '';
          var trackNumberStr = '';          
          if(albumNameAndTrackNumberHTML.trim() != '' && albumNameAndTrackNumberStr.indexOf("Track ",0) > -1){                        
            trackNumber = albumNameAndTrackNumberStr.split("on")[0]; // from "Track X on AlbumName"
          }else{
            trackNumber = '0';            
          }                    
          // clean up and pad track number          
          trackNumber = trackNumber.replace("Track ","").trim(); 
          trackNumberStr = trackNumber.toString();            
          if(parseInt(trackNumber) < 10) trackNumberStr = '0' + trackNumber.toString();          

          // LYRIC FILENAME SETUP | artist-album-tracknum-song.txt, tracknum-song.txt, etc          
          if(config.filePerSongPrefixArtistName == "True" && config.filePerSongPrefixAlbumName == "True"){
            nextTextFileName = artistName + ' - ' + albumName + ' - ' + trackNumberStr + ' - ' + actualSongName;          
          }else if(config.filePerSongPrefixArtistName == "False" && config.filePerSongPrefixAlbumName == "True"){
            nextTextFileName = albumName + ' - ' + trackNumberStr + ' - ' + actualSongName;          
          }else if(config.filePerSongPrefixArtistName == "True" && config.filePerSongPrefixAlbumName == "False"){
            nextTextFileName = artistName + ' - ' + trackNumberStr + ' - ' + actualSongName;                      
          }else{
            nextTextFileName = trackNumberStr + ' - ' + actualSongName;                                            
          }          
          nextTextFileName = nextTextFileName
            .replace("  "," ")
            .replace("?","")
            .replace("!","")
            .replace("/","-")
            .replace("\\","-")
            .replace(",","-");
        }

        // Cleanup strings
        artistName = cleanString(artistName);
        albumName = cleanString(albumName);
        actualSongName = cleanString(actualSongName);
        songName = cleanString(songName);

        // PROCESS SONG LYRICS 
        if(isInstrumental == true){
          lyricsBare = "Song is an instrumental";
          console.log(` Skipping (likely) Instrumental Song: ` + nextTextFileName);
        }else{
          report(` Downloaded Lyrics: (${count}/${URLbulk.length}): ` + nextTextFileName);
          var lyricsBare = $("[data-lyrics-container=true]").text();
          if (config.removeSigns == "True") {
            lyricsBare = lyricsBare.toString().replace(/\[.*?\]/g, "");
            lyricsBare = lyricsBare.toString().replace(/\(.*?\)/g, "");
            lyricsBare = lyricsBare.toString().replace(/\{.*?\}/g, "");
          }
          lyricsBare = lyricsBare
            .replace(/(\r\n|\r|\n){2}/g, "$1")
            .replace(/(\r\n|\r|\n){3,}/g, "$1\n");
          if (config.removeSpaces == "True") {
            lyricsBare = lyricsBare.replace(/(\r\n|\r|\n)+/g, "$1");
          }          
        }

        // cemerson 20230105 | Add dashes and line breaks around song name title region
        if (config.hugeLump == "True") {
          if (config.songNameL == "True") {
            var addx = `-------------------------------\n${songName}\n-------------------------------\n`;
          } else {
            var addx = "";
          }
        } else {          
          if (fs.existsSync(finalFilePath)) {
            if (config.songNameL == "True") {
              var addx = `-------------------------------\n${songName}\n-------------------------------\n`;
            } else {
              var addx = `\n`;
            }
          } else {
            if (config.songNameL == "True") {
              var addx = `-------------------------------\n${songName}\n-------------------------------\n`;
            } else {
              var addx = "";
            }
          }
        }

        if (config.hugeLump == "True") {
          var lyricsReal = `${addx}${lyricsBare}`;
          lyricsReal = lyricsReal.replace(/(\r\n|\r|\n)+/g, "$1");
        } else {
          var lyricsReal = `${addx}${lyricsBare}`;
        }

        lyricsReal += '\n\n'; // add line breaks
        
        // FINAL FILE/FOLDER PREP
        var finalFilePath = `output/${nextTextFileName}.txt`;
        // output/
        if (!fs.existsSync(`output`)) fs.mkdirSync("output");
        if(config.filePerSong == "True"){
          // output/artist
          if (config.filePerSongUseArtistFolder == "True" && !fs.existsSync(`output/${artistName}`)) {
            fs.mkdirSync("output/" + artistName);    
          }     
          // output/album or output/artist/album
          if (config.filePerSongUseAlbumFolders == "True"){
            if(config.filePerSongUseArtistFolder == "True" && !fs.existsSync(`output/${artistName}/${albumName}`)) {
              fs.mkdirSync("output/" + artistName + "/" + albumName);          
            }
            if(config.filePerSongUseArtistFolder != "True"){
              fs.mkdirSync("output/" + albumName);              
            }                    
          }        
        }

        // final file/path 
        if(config.filePerSong == "True"){
          if(config.filePerSongUseArtistFolder == "True" && config.filePerSongUseAlbumFolders == "True"){          
            finalFilePath = `output/${artistName}/${albumName}/${nextTextFileName}.txt`; // output/artist/album/lyric.txt
          }else if(config.filePerSongUseArtistFolder == "True" && config.filePerSongUseAlbumFolders != "True"){                      
            finalFilePath = `output/${artistName}/${nextTextFileName}.txt`; // output/artist/lyric.txt
          }else{
            finalFilePath = `output/${albumName}/${nextTextFileName}.txt`; // output/album/lyric.txt
          }          
        }           

        // include genius.com URL in lyrics file?
        if(config.filePerSongAppendGeniusURL == "True") lyricsReal += '\n' + urlx;

        // save/create lyric file 
        if (!fs.existsSync(finalFilePath)) {
          fs.writeFileSync(finalFilePath, lyricsReal);
        } else {
          fs.appendFileSync(finalFilePath, lyricsReal);
        }        
        totalLyricDownloads++;
      })
      .catch(function (error) {        
        errorcount++;
        // count++;
        logDump("skippedsongs", urlx);
        logDump("skippedsongs", `\n`);        
        report(" .. Download failed (Timeout?) for [" + urlx + "]. Will retry. ","WARNING"); // DEBUG + error.message);
        URLbulkErrors.push(urlx);
        // CE 20230125 | Now that there is a retry loop, stop saving "_LyricsMissing_" txt files
        // var missingSongLyricsFileName = '_LyricsMissing_' + urlx.split(".com/")[1];
        // fs.writeFileSync('output/' + missingSongLyricsFileName + '.txt', 'No lyrics found');        
      })
      .then(function () {        
        count++;
        finalcount++;
        if (count - 1 == URLbulk.length) {

          // Retry failed lyrics if necessary | stop after config.timedOutLyricRetryCount retry count reached
          if(URLbulkErrors.length > 0 && lyricRetryCount < config.timedOutLyricRetryCount){            
            lyricRetryCount ++;
            console.log(' .... Retrying [' + URLbulkErrors.length + '] failed urls momentarily (Attempt #' + lyricRetryCount + ').');
            URLbulk = URLbulkErrors;            
            URLbulkErrors = [];
            var retryTimeout = setTimeout(
              function(){
                getLyrics();
              },lyricDownloadRetryDelay);

          }else{
            unresolvedLyricErrorCount += errorcount;
            console.log('\n-----------------------------------------------------\n');
            console.log(' Download(s) Complete! ');
            console.log(' - Artist Search: ' + config.artistList.join(", "));
            console.log(' - Total Songs Found: ' + totalSongsFound);            
            report(' - Total Lyrics Downloaded: ' + totalLyricDownloads);            
            if(unresolvedLyricErrorCount > 0) report(' - Unresolved Lyric Errors: ' + unresolvedLyricErrorCount,'WARNING');                        
            report('\n Lyrics-Downloader | https://github.com/Visual917/Lyrics-Downloader','SUBTLE');
            report(' (Refer to config.js to change your download settings.)','SUBTLE')
            console.log('\n-----------------------------------------------------\n');            
          }                    
        }
      });
  });
}

function logDump(type, arg) {
  if (!fs.existsSync(`logs`)) {
    fs.mkdirSync("logs");
  }
  if (!fs.existsSync(`logs/${type}-${dateTimeTxt}`)) {
    fs.writeFileSync(`logs/${type}-${dateTimeTxt}`, arg);
  } else {
    fs.appendFileSync(`logs/${type}-${dateTimeTxt}`, arg);
  }
}

class CustomError extends Error{
    constructor(msg){
        super(msg)
    }
}

function cleanString(origStr) {
  if(origStr == null){
    return origStr;
  }else{
    var cleanStr = origStr.replace("–","-");
    cleanStr = cleanStr.replace(/[/\\?%*:|"<>]/g, '-');        
    return cleanStr;
  }
}

function report(msg,type){
  if(type == null) type = 'SUCCESS';
  if(type != null) type = type.toUpperCase();

  switch(type){
    case 'WARNING':
      console.log('\x1b[33m%s\x1b[0m', msg);  
      break;
    case 'ERROR':
      console.log('\x1b[31m%s\x1b[0m', msg);  
      break;
    case 'SUBTLE':
      console.log('\x1b[90m%s\x1b[0m', msg);  
      break;
    case 'SUCCESS':
    default:
      console.log('\x1b[32m%s\x1b[0m', msg); 
      break;
  }
}

function getArrayFromCommandLineParameterString(str){  
	var arr = [];
  if(str == null) str = '';
	if(str.indexOf(',',0) > -1){
    arr = str.split(",");
  }else{
    arr.push(str);
  }  	
  return arr;
}