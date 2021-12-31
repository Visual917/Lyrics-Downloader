// @ts-nocheck
const cheerio = require("cheerio");
const axios = require("axios").default;
const fs = require("fs");
const config = require("./config");

const today = new Date();
var date =
  today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate();
var time =
  today.getHours() + "." + today.getMinutes() + "." + today.getSeconds();
var dateTime = date + " " + time;
var dateTimeTxt = date + " " + time + ".txt";

var curPage = config.curPage;
var artistID = "";
var URLbulk = [];
var artistNameR = "";
var inited = 0;
var firstArtistName = "";

initializeArtist(inited);

function initializeArtist(index) {
  axios
    .get(getSearchUrl(config.artistList[index]))
    .then(function (response) {
      // handle success
      artistID =
        response["data"]["response"]["hits"][0]["result"]["primary_artist"][
          "id"
        ];
      artistNameR =
        response["data"]["response"]["hits"][0]["result"]["primary_artist"][
          "name"
        ];
      if (index == 0) {
        firstArtistName = artistNameR;
      }
      getSongs();
    })
    .catch(function (error) {
      var arg = error.toString();
      var arg2 = JSON.stringify(error, null, 2);
      logDump("error", arg);
      logDump("dump", arg2);
      console.log("Error fetching songs. Make sure the config is valid.");
      console.log("Error logged at:");
      console.log("logs/error-" + dateTime + ".txt");
      console.log("Full dump logged at:");
      console.log("logs/dump-" + dateTime + ".txt");
    })
    .then(function () {
      // always executed
    });
}

function getSearchUrl(query) {
  return `https://api.genius.com/search?q=${query}&access_token=${config.apiKey}`;
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
      console.log("Page:" + curPage);
      if (response["data"]["response"]["songs"].length > 1) {
        response["data"]["response"]["songs"].forEach((element) => {
          if (
            element["primary_artist"]["id"] == artistID &&
            response["data"]["response"]["songs"].length > 1
          ) {
            console.log("Song: " + element["full_title"]);
            URLbulk.push(element["url"]);
          }
          num++;
        });
        if (config.pageCount > curPage) {
          curPage++;
          getSongs();
        } else {
          if (inited < config.artistList.length - 1) {
            inited++;
            curPage = config.curPage;
            initializeArtist(inited);
          } else {
            console.log("Fetched song count: " + URLbulk.length);
            console.log("Fetching song lyrics...");
            getLyrics();
          }
        }
      } else {
        if (inited < config.artistList.length - 1) {
          inited++;
          curPage = config.curPage;
          initializeArtist(inited);
        } else {
          console.log("Fetched song count: " + URLbulk.length);
          console.log("Fetching song lyrics...");
          getLyrics();
        }
      }
    })
    .catch(function (error) {
      // handle error
      var arg = error.toString();
      var arg2 = JSON.stringify(error, null, 2);
      logDump("error", arg);
      logDump("dump", arg2);
      console.log("Error fetching songs. Make sure the config is valid.");
      console.log("Error logged at:");
      console.log("logs/error-" + dateTime + ".txt");
      console.log("Full dump logged at:");
      console.log("logs/dump-" + dateTime + ".txt");
    })
    .then(function () {
      // always executed
    });
}

var fsFileName = "";

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
        $("[data-lyrics-container=true]").find("br").replaceWith("\n");
        const songNameTemp = $("title").text();
        var songName = songNameTemp.replace(" Lyrics | Genius Lyrics", "");
        songName = songName.replace(" | Genius Lyrics", "");
        console.log(
          `Downloaded Lyrics: (${count}/${URLbulk.length}): ` + songName,
        );
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
        if (config.hugeLump == "True") {
          if (config.songNameL == "True") {
            var addx = `${songName}\n`;
          } else {
            var addx = "";
          }
        } else {
          if (fs.existsSync(`output/${fsFileName}.txt`)) {
            if (config.songNameL == "True") {
              var addx = `\n${songName}\n`;
            } else {
              var addx = `\n`;
            }
          } else {
            if (config.songNameL == "True") {
              var addx = `${songName}\n`;
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
        if (!fs.existsSync(`output`)) {
          fs.mkdirSync("output");
        }
        if (!fs.existsSync(`output/${fsFileName}.txt`)) {
          fs.writeFileSync(`output/${fsFileName}.txt`, lyricsReal);
        } else {
          fs.appendFileSync(`output/${fsFileName}.txt`, lyricsReal);
        }
      })
      .catch(function (error) {
        // handle error
        errorcount++;
        count++;
        console.log(error);
        logDump("skippedsongs", urlx);
        logDump("skippedsongs", `\n`);
        console.log("Non critical error. Skipped " + urlx + ".");
        console.log("Logging skipped songs at:");
        console.log("logs/skippedsongs-" + dateTime + ".txt");
      })
      .then(function () {
        count++;
        finalcount++;
        if (count - 1 == URLbulk.length) {
          console.log(
            `Done. Downloaded ${finalcount} lyrics with ${errorcount} errors.`,
          );
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
