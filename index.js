const axios = require('axios')
const nearAPI = require('near-api-js')
const State = require('./State')
const Storage = require('./Storage')
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')

const PORT = 9090
const server = express()

const config = {
  nodeUrl: 'https://rpc.testnet.near.org',
  deps: {
    keyStore: new nearAPI.keyStores.UnencryptedFileSystemKeyStore()
  }
}

const main = async () => {
  const state = new State()
  const storage = new Storage()
  state.start()

  server.use(cors())
  server.use(bodyParser.urlencoded({ extended: true }))
  server.use(bodyParser.json())

  server.get('/', (req, res) => {
    return res.json({
      success: 1
    })
  })

  server.get('/mementos', async (req, res) => {
    const query = []
    Object.keys(req.query).forEach(key => {
      if (key[0] === '_') {
        return
      }
      const value = req.query[key]
      query.push({
        key: key,
        value: value
      })
    })

    const mementoList = await state.get({
      collection: 'memento',
      query: query,
      skip: req.query._skip,
      limit: req.query._limit,
      embed: [{
        col: 'user',
        key: 'owner',
        targetCol: 'user',
        targetKey: 'id'
      }]
    })
    return res.json({
      success: 1,
      data: mementoList
    })
  })

  server.get('/users', async (req, res) => {
    const query = []
    Object.keys(req.query).forEach(key => {
      if (key[0] === '_') {
        return
      }
      const value = req.query[key]
      query.push({
        key: key,
        value: value
      })
    })

    const userList = await state.get({
      collection: 'user',
      query: query,
      skip: req.query._skip,
      limit: req.query._limit
    })
    return res.json({
      success: 1,
      data: userList
    })
  })

  server.get('/posts', async (req, res) => {
    const query = []
    Object.keys(req.query).forEach(key => {
      if (key[0] === '_') {
        return
      }
      const value = req.query[key]
      query.push({
        key: key,
        value: value
      })
    })

    const postList = await state.get({
      collection: 'post',
      query: query,
      skip: req.query._skip,
      limit: req.query._limit,
      embed: [{
        col: 'memento',
        key: 'mementoId',
        targetCol: 'memento',
        targetKey: 'id'
      }, {
        col: 'user',
        key: 'owner',
        targetCol: 'user',
        targetKey: 'id'
      }]
    })
    return res.json({
      success: 1,
      data: postList
    })
  })

  server.get('/feeds', async (req, res) => {
    const query = []
    Object.keys(req.query).forEach(key => {
      if (key[0] === '_') {
        return
      }
      const value = req.query[key]
      query.push({
        key: key,
        value: value
      })
    })

    const feedList = await state.get({
      collection: 'feed',
      query: query,
      skip: req.query._skip,
      limit: req.query._limit
    })
    return res.json({
      success: 1,
      data: feedList
    })
  })

  server.listen(PORT, () => {
    console.log(`indexer running on PORT ${PORT}`)
  })

  // const near = await nearAPI.connect(config)
  // // Needed to access wallet
  // const account = await near.account('paras-dev.testnet');
  // // console.log(account)
  // try {
  //   const x = await account.viewFunction('paras-dev.testnet', 'getPostList', {
  //     query: [],
  //     opts: {
  //       _embed: true,
  //       _sort: 'createdAt',
  //       _order: 'desc',
  //       _skip: 0,
  //       _limit: 5
  //     }
  //   })
  //   // console.log(x)  
  // } catch (err) {
  //   console.log(err)
  // }

  // options.contractName, options.methodName, JSON.parse(options.args || '{}')))
}

main()