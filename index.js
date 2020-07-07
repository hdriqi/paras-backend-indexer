require('dotenv').config()

const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')

const authenticate = require('./middleware/authenticate')

const State = require('./State')
const Storage = require('./Storage')
const Mail = require('./Mail')
const Cron = require('./Cron')

const Feed = require('./controllers/Feed')
const Transaction = require('./controllers/Transaction')
const Verification = require('./controllers/Verification')
const Explore = require('./controllers/Explore')
const Balance = require('./controllers/Balance')

const PORT = 9090
const server = express()

const main = async () => {
  const storage = new Storage()
  const mail = new Mail()
  const state = new State(storage)
  const cron = new Cron(state, storage, mail)
  await storage.init()
  await mail.init()
  await state.init()
  await cron.init()

  const feed = await new Feed(state, storage)
  const transaction = await new Transaction(state, storage)
  const verification = await new Verification(state, storage, mail)
  const explore = await new Explore(state, storage)
  const balance = await new Balance(state, storage)

  server.use(cors())
  server.use(bodyParser.urlencoded({ extended: true }))
  server.use(bodyParser.json())

  server.get('/', (req, res) => {
    return res.json({
      success: 1
    })
  })

  server.get('/mementos', async (req, res) => {
    const mementoList = await storage.get('memento', req.query, [{
      col: 'user',
      key: 'owner',
      targetCol: 'user',
      targetKey: 'id'
    }])
    return res.json({
      success: 1,
      data: mementoList
    })
  })

  server.get('/posts', async (req, res) => {
    const postList = await storage.get('post', req.query, [{
      col: 'memento',
      key: 'mementoId',
      targetCol: 'memento',
      targetKey: 'id'
    }, {
      col: 'user',
      key: 'owner',
      targetCol: 'user',
      targetKey: 'id'
    }])
    return res.json({
      success: 1,
      data: postList
    })
  })

  server.get('/transactions', async (req, res) => {
    const txList = await transaction.getById(req.query.id, req.query.__skip, req.query.__limit)
    return res.json({
      success: 1,
      data: txList
    })
  })

  server.get('/search', async (req, res) => {
    const itemList = await explore.search(req.query)
    return res.json({
      success: 1,
      data: itemList
    })
  })

  server.get('/users', async (req, res) => {
    const userList = await storage.get('user', req.query)
    return res.json({
      success: 1,
      data: userList
    })
  })

  server.get('/explore', async (req, res) => {
    const postList = await explore.getPost()
    return res.json({
      success: 1,
      data: postList
    })
  })

  server.get('/grants', async (req, res) => {
    const grantList = await storage.get('grant', req.query, [{
      col: 'memento',
      key: 'mementoId',
      targetCol: 'memento',
      targetKey: 'id'
    }])
    return res.json({
      success: 1,
      data: grantList
    })
  })

  server.get('/balances/:id', async (req, res) => {
    const accountBalance = await balance.get(req.params.id)
    return res.json({
      success: 1,
      data: accountBalance
    })
  })

  server.get('/comments', async (req, res) => {
    const commentList = await storage.get('comment', req.query, [{
      col: 'user',
      key: 'owner',
      targetCol: 'user',
      targetKey: 'id'
    }])
    return res.json({
      success: 1,
      data: commentList
    })
  })

  server.get('/feeds', authenticate, async (req, res) => {
    const {
      __skip,
      __limit
    } = req.query

    try {
      const result = await feed.get(req.userId, __skip, __limit)
      return res.json({
        success: 1,
        data: result
      })
    } catch (err) {
      console.log(err)
      return res.json({
        success: 0,
        message: err
      })
    }
  })

  server.get('/follow', authenticate, async (req, res) => {
    try {
      const result = await feed.getFollowing(req.userId, req.query.__skip, req.query.__limit)
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
      await feed.follow(req.userId, targetId, targetType)
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

  server.post('/unfollow', authenticate, async (req, res) => {
    const {
      targetId,
      targetType
    } = req.body

    try {
      await feed.unfollow(req.userId, targetId, targetType)
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

  server.get('/register', authenticate, async (req, res) => {
    try {
      const user = await verification.checkRegister(req.userId)
      return res.json({
        success: 1,
        data: user
      })
    } catch (err) {
      console.log(err)
      return res.status(400).json({
        success: 0,
        message: err
      })
    }
  })

  server.post('/register', authenticate, async (req, res) => {
    const {
      email,
      fullName,
      referral,
    } = req.body

    try {
      await verification.register(req.userId, email, fullName, referral)
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

  server.post('/confirm', async (req, res) => {
    const {
      token
    } = req.body

    try {
      await verification.confirmEmail(token)
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
}

main()