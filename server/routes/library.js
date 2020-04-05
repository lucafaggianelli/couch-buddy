const axios = require('axios')
const ffmpeg = require('fluent-ffmpeg')
const glob = require('glob')
const mime = require('mime-types')
const ptt = require('parse-torrent-title')
const path = require('path')
const sendFile = require('koa-send')

const { Episode, MediaFile, Movie } = require('../models')

const OMDB_KEY = process.env.OMDB_KEY

async function scanLibrary (ctx = {}) {
  // Scan directory to search video files
  const videos = await searchVideoFiles(process.env.MEDIA_BASE_DIR)
  console.log(`Found ${videos.length} video files in ${process.env.MEDIA_BASE_DIR}`)

  for (const fileName of videos) {
    const absolutePath = process.env.MEDIA_BASE_DIR + fileName

    // Parse filename to obtain basic info
    const basicInfo = ptt.parse(path.basename(fileName))

    // If the file has already been indexed, skip it
    const existingFile = await MediaFile.findOne({ where: { fileName } })
    if (existingFile) {
      continue
    }

    const item = { ...basicInfo }

    // Search movie info on OMDb through title
    try {
      const response = await axios.get('http://www.omdbapi.com/', {
        params: {
          t: basicInfo.title,
          apikey: OMDB_KEY
        }
      })

      if (!response.data.Error) {
        // Found info on OMDb, refactor object to match Movie/Episode model
        for (const k in response.data) {
          item[k.toLowerCase()] = response.data[k]
        }

        item.imdbId = item.imdbid
        item.ratingImdb = parseFloat(item.imdbrating)
        item.ratingMetacritic = parseInt(item.metascore)

        const rt = item.ratings.find(x => x.Source === 'Rotten Tomatoes')
        if (rt) {
          item.ratingRottenTomatoes = parseInt(rt.Value)
        }
      } else {
        // Not found on OMDb
        console.warn(response.data.Error, basicInfo.title)
      }
    } catch (e) {
      console.log('OMDb request failed for:', basicInfo.title)
      console.error(e.message)
    }

    const where = {}
    if (item.imdbid) {
      where.imdbid = item.imdbid
    } else {
      where.title = item.title
    }

    const isSeries = !!item.season || !!item.episode || item.type === 'series'
    item.type = isSeries ? 'series' : 'movie'

    const [ movie ] = await Movie.findOrCreate({ where, defaults: item })
    let episode

    if (isSeries) {
      const thumbnail = await takeScreenshot(absolutePath)

      episode = await Episode.create({
        movieId: movie.id,
        thumbnail,
        ...item
      })
    }

    await MediaFile.create({
      fileName,
      mediaId: isSeries ? episode.id : movie.id,
      mediaType: isSeries ? 'episode' : 'movie',
      mimeType: mime.lookup(fileName)
    })
  }

  ctx.status = 204
}

async function listLibrary (ctx) {
  const library = await Movie.findAll({ order: [[ 'title', 'ASC' ]] })

  ctx.body = library
}

async function getLibrary (ctx) {
  const movieId = parseInt(ctx.params.id)
  const movie = await Movie.findByPk(movieId)

  ctx.assert(movie, 404)

  ctx.body = movie
}

async function listEpisodes (ctx) {
  const movieId = parseInt(ctx.params.id)
  ctx.assert(movieId, 404, 'Please provide an ID in the URL')

  const episodes = await Episode.findAll({ where: { movieId } })

  ctx.body = episodes
}

async function getEpisode (ctx) {
  const episodeId = parseInt(ctx.params.id)
  const episode = await Episode.findByPk(episodeId)

  ctx.assert(episode, 404)

  ctx.body = episode
}

async function getEpisodeThumbnail (ctx) {
  const episodeId = parseInt(ctx.params.id)
  const episode = await Episode.findByPk(episodeId)

  ctx.assert(episode, 404)

  await sendFile(ctx, episode.thumbnail, { root: process.env.MEDIA_BASE_DIR })
}

function searchVideoFiles (dir) {
  return new Promise((resolve, reject) => {
    const options = {
      cwd: dir,
      matchBase: true,
      nocase: true,
      nodir: true
    }

    glob('**/*.{mp4,mkv,avi}', options, (err, files) => {
      if (err) {
        reject(err)
      }

      resolve(files)
    })
  })
}

function takeScreenshot (file) {
  const folder = path.dirname(file)
  const folderRelative = path.relative(process.env.MEDIA_BASE_DIR, folder)

  return new Promise((resolve) => {
    ffmpeg(file)
      .on('filenames', (filenames) => {
        resolve(path.join(folderRelative, filenames[0]))
      })
      .screenshots({ count: 1, filename: '%b.png', folder })
  })
}

module.exports = {
  getLibrary,
  listLibrary,
  scanLibrary,

  listEpisodes,
  getEpisode,
  getEpisodeThumbnail,

  takeScreenshot,
  searchVideoFiles
}
