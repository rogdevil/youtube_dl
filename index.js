const express = require('express')
const bodyparser = require('body-parser')
const fetch = require("node-fetch").default;
const app = express()
const port = 3000
const contentDisposition = require("content-disposition");
const ytdl = require('ytdl-core');
const { parseSearchResult } = require('./util');
const { resolve } = require('path');
app.use(bodyparser.json())


function getHTML(url, requestOptions = {}) {
    return new Promise((resolve, reject) => {
        fetch(url, requestOptions)
            .then(res => res.text())
            .then(html => resolve(html))
            .catch(e => reject(e));
    });
}

app.get('/', (req, res) => {
    res.send('hello mofo');
})

const searchkeywords = async (keywords, res) => {
    const url = `https://youtube.com/results?q=${encodeURI(keywords.trim())}`;
    const html = await getHTML(url);
    const result = parseSearchResult(html)
    console.log(result);
    res.send(result)
}

app.get('/search/:keywords', async (req, res) => {
    const queryString = req.params
    console.log(queryString.keywords);
    let searches = queryString.keywords;
    await searchkeywords(searches, res);
})



async function getTitle(video_id) {
    const info = await ytdl.getInfo(
      "https://www.youtube.com/watch?v=" + video_id
    );
    return info.player_response.videoDetails.title.replace(/"/g, "");
}


function mediaAvailable(video_id) {
    return new Promise((resolve, reject) => {
      ytdl("https://www.youtube.com/watch?v=" + video_id)
        .on("error", function(e) {
          resolve(false);
        })
        .on("readable", function(e) {
          resolve(true);
        });
    });
}


async function getVideo(req, res) {
    try {
      if (!ytdl.validateID(req.params.video_id)) {
        res.status(404).send("ID is invalid!");
      } else if (!(await mediaAvailable(req.params.video_id))) {
        res
          .status(404)
          .send(
            "That media is not available! Sorry :( Please try something else!"
          );
      } else {
        res.status(200);
        res.setHeader(
          "Content-Disposition",
          contentDisposition((await getTitle(req.params.video_id)) + ".mp4")
        );
        res.removeHeader("transfer-encoding");
        res.setHeader("Content-Type", "video/mp4");
        ytdl("https://www.youtube.com/watch?v=" + req.params.video_id).pipe(res);
      }
    } catch (e) {
      console.log(e);
      res.status(500);
      res.json({ error: "something went wrong" });
    }
  };

app.get('/download/:video_id', async (req, res) => {
    getVideo(req, res)
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})