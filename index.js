require('dotenv').config()

const nearAPI = require('near-api-js')
const State = require('./State')
const Storage = require('./Storage')
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')

const authenticate = require('./middleware/authenticate')

const Feed = require('./controllers/Feed')
const Transaction = require('./controllers/Transaction')

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
  await state.init()
  await storage.init()

  const feed = await new Feed(state, storage)
  const transaction = await new Transaction(state, storage)

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

  server.get('/explore', async (req, res) => {
    const min = 0
    const max = state.data.post.length
    const rng = Math.floor(Math.random() * (max - min) + min)
    const id = state.data.post[rng].id
    const postList = await state.get({
      collection: 'post',
      query: [{
        key: 'id',
        value: id
      }],
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

  server.get('/balances', async (req, res) => {
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

    const balanceList = await state.get({
      collection: 'pac:b',
      query: query,
      skip: req.query._skip,
      limit: req.query._limit
    })
    return res.json({
      success: 1,
      data: balanceList
    })
  })

  server.get('/transactions', async (req, res) => {
    const txList = await transaction.getById({
      id: req.query.id,
      skip: req.query._skip,
      limit: req.query._limit,
      embed: [{
        col: 'fromUser',
        key: 'from',
        targetCol: 'user',
        targetKey: 'id'
      }, {
        col: 'toUser',
        key: 'to',
        targetCol: 'user',
        targetKey: 'id'
      }]
    })
    return res.json({
      success: 1,
      data: txList
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

  server.get('/comments', async (req, res) => {
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

    const commentList = await state.get({
      collection: 'comment',
      query: query,
      sort: req.query._sort,
      skip: req.query._skip,
      limit: req.query._limit,
      embed: [{
        col: 'post',
        key: 'postId',
        targetCol: 'post',
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
      data: commentList
    })
  })

  server.get('/feeds', authenticate, async (req, res) => {
    const {
      _skip,
      _limit
    } = req.query

    try {
      const result = await feed.get(req.userId, _skip, _limit)
      return res.json({
        success: 1,
        data: result
      })
    } catch (err) {
      return res.json({
        success: 0,
        message: err
      })
    }
  })

  server.get('/follow', authenticate, async (req, res) => {
    try {
      const result = await feed.getFollowing(req.userId, req.query._skip, req.query._limit)
      return res.json({
        success: 1,
        data: result
      })
    } catch (err) {
      return res.json({
        success: 0,
        message: err
      })
    }
  })

  server.post('/follow', authenticate, async (req, res) => {
    const {
      targetId,
      targetType
    } = req.body

    try {
      await feed.toggleFollow(req.userId, targetId, targetType)
      return res.json({
        success: 1,
        data: true
      })
    } catch (err) {
      return res.status(400).json({
        success: 0,
        message: err
      })
    }
  })

  server.listen(PORT, () => {
    console.log(`indexer running on PORT ${PORT}`)
  })

  // const pk = new Uint8Array([199, 11, 243, 142, 206, 8, 242, 213, 84, 240, 237, 206, 195, 69, 226, 75, 22, 6, 10, 62, 75, 34, 215, 83, 217, 128, 208, 87, 58, 214, 189, 34])
  // const signature = new Uint8Array([120, 83, 157, 109, 81, 121, 93, 45, 220, 196, 250, 85, 63, 114, 51, 200, 134, 1, 58, 124, 100, 127, 88, 45, 149, 64, 23, 95, 51, 10, 87, 10, 44, 15, 35, 226, 255, 205, 223, 220, 238, 98, 65, 104, 20, 137, 36, 15, 13, 33, 27, 123, 251, 110, 252, 64, 164, 233, 206, 200, 155, 74, 27, 3])
  // const msg = 'abc'
  // const hash = new Uint8Array(sha256.sha256.array(msg));
  // const x = nacl.sign.detached.verify(hash, signature, pk);
  // console.log(x)
  // const f = await storage.feeds.insertOne({
  //   feedId: '123',
  //   targetId: '456',
  //   targetType: 'memento'
  // })
  // console.log(f)

  // const near = await nearAPI.connect(config)
  // const keyPair = new nearAPI.KeyPairEd25519()
  // keyPair.ve
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