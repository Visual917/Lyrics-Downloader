# Lyrics Downloader

This is a 100% handwritten **Lyrics Downloader** from Visu. It scrapes **Genius.com** for song lyrics, and very fast. I cannot see any fast alternative with this many features, so I decided building one myself.
I will keep it open-source, but please cite me whenever you fork or contribute to it. 
I am open to any Issues. I'll be willing to update the script accordingly, where possible.
 
# Main Features

 - **Fast**. Download approximately 1000 per minute, according to your internet connection.
 - Download lyrics from multiple artists
 - Format line breaks and get the lyrics delivered on a huge text lump, or properly formatted if you'd like
 - Remove signs like [Chorus] and [Intro] depending on the config
 - Start from any page
 - Brilliant error handling, uninterrupted workflow.
# Planned Features
 - [x] Better error handling
 - [x] Multiple artists
 - [ ] Being able to retry skipped songs after the script is done
# Screenshots
![](https://secret-forest.xyz/githublyrics/ss1.png)
![](https://secret-forest.xyz/githublyrics/ss2.png)
![](https://secret-forest.xyz/githublyrics/ss3.png)
![](https://secret-forest.xyz/githublyrics/ss4.png)
# Installation
 1. Install NodeJS from [here](https://nodejs.org/en/download) if you haven't already. While installing, you need to add NPM to path.
 
![](https://i.stack.imgur.com/SsGIl.png)

 2. Go to the directory of the file.
 3. Edit `config.js` to your liking.
 4. Run Command Prompt or [Windows Terminal](https://www.microsoft.com/en-us/p/windows-terminal/9n0dx20hk701) (recommended) in the directory. (The easiest way is typing CMD on the address bar on the folder.)
 5. Type `npm i` and press enter. This will install all of the dependencies of the script. You only need to do this once.
 6. Type `node lyrics` to launch the program.
# Config.JS
You can change the way Lyrics Downloader handles the downloaded lyrics and tinker with it.

|Setting Key                |Name                          |Description                         |
|----------------|-------------------------------|-----------------------------|
|`apiKey`|API Key            |The API key from Genius.com. You can generate yours at: https://docs.genius.com            |
|`artistList`         |Artist List            |The names of the artists as an array. Entering a full query isn't needed as the scraper is performing a search. If you only want one artist, put in ["ArtistName"] but if you want multiple artists put it in like ["Artist1", [Artist2]]
|`pageCount`|Page Count|How many pages to scrape for each artist. Every page has 20 songs. Note: Some pages may have less songs than 20, but other pages may still have more. Obviously, this has to be a positive value.
|`curPage`|Current Page|The page to start scraping from. It needs to be 1 or higher.
|`fName`|File Name|The name of the TXT file. Leave it empty if you want it to be the same as the first artist's name.
|`concDate`|Concatenate Date|Put the current date after the file name.
|`songNameL`|Insert Song Name|Insert the song name before the lyrics. True or False.
|`removeSigns`|Remove Signs|Remove signs in the lyrics like [Chorus] and [Intro]. This will remove everything between {}, [] and (). True or False.
|`removeSpaces`|Remove Spaces|Remove line breaks. Useful when needed. This will put the whole song in a big lump without line breaks. Only line breaks between songs.
|`hugeLump`|Huge Lump|Put absolutely everything on a big lump. No line breaks except between sentences. Any extra linebreaks are caused by the website.
# Errors?
Errors are dumped carefully. 

 ### Script Crash

The log directory is `logs` and when you get a systematic error, two files will be generated for you.

You will also be notified when there is one and will be able to see the directory on the console.

`dump-2000-00-00 00.00.00.txt` and
`error-2000-00-00 00.00.00.txt`

The error one will return the error strings, in most cases there is none. The dump one will return the full error dump so you can look through it.

 ### Song Error
 
But if all of the system are okay, and the program fails to pull a song webpage from the list instead, you will see the error on the console... But it will just skip the current song and keep downloading the rest of the list. So the process won't be interrupted. You will get an output on the console to notify you the script has failed to fetch one of the songs. 

Failed song URLs will be outputted to the logs directory as well.

`skippedsongs-2000-00-00 00.00.00.txt`
# What is the execution process of the script?  (Roughly)
![](https://mermaid.ink/svg/eyJjb2RlIjoiZ3JhcGggVERcbiAgICBBW1N0YXJ0XSAtLT58Y29uZmlnLmFydGlzdExpc3QuYXJ0aXN0fCBCKFNlYXJjaCBHZW5pdXMuY29tIGZvciB0aGUgYXJ0aXN0KVxuICAgIEIgLS0-IEMoRG93bmxvYWQgYWxsIG9mIHRoZSBzb25ncyBvbiBwYWdlIFggd2hlcmUgdGhlIGFydGlzdCBpcyB0aGUgbWFpbiBhcnRpc3QpXG4gICAgQyAtLT4gWChDaGVjayBpZiBpdCBpcyB0aGUgbGFzdCBwYWdlKSAtLT4gRFtDaGVjayBpZiBpdCBpcyB0aGUgbGFzdC9vbmx5IGFydGlzdF1cbiAgICBEIC0tPiB8Q2hlY2sgZm9yIHRoZSBuZXh0IGFydGlzdCBpZiBpdCBpc24ndHwgQlxuICAgIFggLS0-IHxSZXBlYXQgaWYgaXQgaXNuJ3QgdGhlIGxhc3QgcGFnZXwgQ1xuICAgIEQgLS0-IHxTdGFydCBkb3dubG9hZGluZyBseXJpY3N8IEYoU2NyYXBlIHRoZSB3ZWJwYWdlIG9mIHRoZSBzb25nKSAtLT4gRyhJbXBvcnQgdGhlIGx5cmljcywgcGVyZm9ybSBuZWNlc3NhcnkgY29uZmlnKVxuICAgIEcgLS0-IEgoRXhwb3J0IHRoZSBseXJpY3MgdG8gVFhUKSAtLT4gfFJlcGVhdCB1bnRpbCBhbGwgb2YgdGhlIHNvbmdzIGFyZSBkb25lfCBGIiwibWVybWFpZCI6eyJ0aGVtZSI6ImRhcmsifSwidXBkYXRlRWRpdG9yIjpmYWxzZSwiYXV0b1N5bmMiOnRydWUsInVwZGF0ZURpYWdyYW0iOmZhbHNlfQ)
