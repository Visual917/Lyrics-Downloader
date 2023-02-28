// The API key from Genius.com. You can generate yours at: https://docs.genius.com
exports.apiKey = "YOUR_GENIUS.COM_CLIENT_ACCESS_TOKEN_HERE";

// The names of the artists. Entering a full query isn't needed as the scraper is performing a search.
// If you only want one artist, put in ["ArtistName"]
exports.artistList = ["Sia","Metallica"];

// How many pages to scrape for each artist. Every page has 20 songs.
// Some pages may have less songs than 20, but other pages may still have more.
exports.pageCount = 10;

// The page to start scraping from. It can be at least 1.
exports.curPage = 1;

// The name of the TXT file. Leave it empty if you want it to be the same as the first artist's name.
exports.fName = "MySongs";

// Put the current date after the file name.
exports.concDate = "True";

// Insert the song name before the lyrics. True or False.
exports.songNameL = "True";

// Remove signs in the lyrics like [Chorus] and [Intro]. This will remove everything between {}, [] and (). True or False.
exports.removeSigns = "True";

// Remove line breaks. Useful when needed. This will put the whole song in a big lump without line breaks. Only line breaks between songs.
exports.removeSpaces = "False";

// Put absolutely everything on a big lump. No line breaks except between sentences.
// Any extra linebreaks are caused by the website.
exports.hugeLump = "False";

// On by default to avoid wasting search/download time lyrics of instrumental songs
exports.excludeInstrumentalLyrics = "True";

// how many times to retry failed lyric downloads. 2-3 usually gets everything unless there's a new/unknown bug lyrics.js can't handle (yet)
exports.timedOutLyricRetryCount = 4;

// Option to have a lyrics text file per song vs multiple/all songs in one file
// NOTE: If this is not True then the related "filePerSong" options below don't do anything
exports.filePerSong = "True";
// settings that only apply if filePerSong=True
exports.filePerSongAppendGeniusURL = "False";       // Appends the original genius lyrics URL at the end of each lyric file
exports.filePerSongUseAlbumFolders = "True";        // /output/MyAlbum/MySong.txt
exports.filePerSongUseArtistFolder = "True";        // /output/MyArtist/MySong.txt or /output/MyArtist/MyAlbum/MySong.txt
exports.filePerSongPrefixArtistName = "False";      // MyArtist-MyTrackNum-MySong.txt
exports.filePerSongPrefixAlbumName = "False";       // MyArtist-MyAlbum-MySong.txt
exports.filePerSongPrefixAlbumWithYear = "False";    // /output/2000 - MyAlbum/MySong.txt (Note: Not always accurate)