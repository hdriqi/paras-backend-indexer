const nearAPI = require('near-api-js')

const config = {
  nodeUrl: 'https://rpc.testnet.near.org',
  deps: {
    keyStore: new nearAPI.keyStores.UnencryptedFileSystemKeyStore()
  }
}

class State {
  constructor(storage) {
    this.data = {}
    this.storage = storage
    this.contractName = null
    this.__init__ = false
  }

  async start() {
    await this.fetchData()
    console.log('done wait 3sec')
    setTimeout(() => {
      this.start()
    }, 3000)
  }

  async init() {
    if (!process.env.CONTRACT_NAME) {
      throw 'CONTRACT_NAME is not defined on env'
    }
    this.contractName = process.env.CONTRACT_NAME
    this.__init__ = true
    this.near = await nearAPI.connect(config)
    this.account = await this.near.account(process.env.CONTRACT_NAME)
    this.start()
  }

  async processEvent(type, collection, data) {
    if (type === 'create') {
      // notify user about new/update comment on their post
      if (collection === 'comment') {
        if (data.postId) {
          console.log('add notification')
          const post = await this.storage.db.collection('post').findOne({
            id: data.postId
          })
          const newNotification = {
            link: `${process.env.FRONTEND_URL}/post/${data.postId}/comment`,
            message: `${data.owner} commented on your post`,
            userId: post.owner,
            createdAt: new Date().getTime().toString()
          }
          await this.storage.db.collection('notification').insertOne(newNotification)

          const splitRegex = /(@\[@.+?\]\(.+?\))/
          const captureRegex = /@\[@(.+)?\]\(.+?\)/
          const trim = data.body.toString().replace(/(\r\n|\r|\n){2,}/g, '$1\n')
          const bodyBlocks = trim.split(splitRegex)
          // do not send notification if mentioned user is:
          // post owner
          // already mentioned
          const mentionedUsers = bodyBlocks.map(block => {
            const match = block.match(captureRegex)
            if (match) {
              return match[1]
            }
            return null
          }).filter(userId => {
            if (userId === post.owner) {
              return null
            }
            return userId
          })
          const distinctUsers = [...new Set(mentionedUsers)]
          // create new notification
          for await (const user of distinctUsers) {
            const newNotification = {
              link: `${process.env.FRONTEND_URL}/post/${data.postId}/comment`,
              message: `${data.owner} mentioned you in a comment`,
              userId: user,
              createdAt: new Date().getTime().toString()
            }
            await this.storage.db.collection('notification').insertOne(newNotification)
          }
        }
      }
    }
  }

  async handleEvent(event) {
    // id, msg, params
    const [collection, type] = event.msg.split('_')
    const collectionCapitalize = collection.charAt(0).toUpperCase() + collection.slice(1)
    const methodName = `get${collectionCapitalize}ById`
    const args = {
      id: event.params
    }
    const data = await this.account.viewFunction(this.contractName, methodName, args)
    console.log(data)
    if (data) {
      this.processEvent(type, collection, data)
      if (type === 'create') {
        await this.storage.db.collection(collection).insertOne(data)
      }
      else if (type === 'update') {
        await this.storage.db.collection(collection).findOneAndUpdate({
          id: event.params
        }, {
          $set: data
        }, {
          upsert: true
        })
      }
    }
    if (type === 'delete') {
      await this.storage.db.collection(collection).deleteOne({
        id: event.params
      })
    }
    await this.storage.kv.findOneAndUpdate({
      key: 'latestEvent',
    }, {
      $set: {
        value: parseInt(event.id)
      }
    }, {
      upsert: true
    })
  }

  async fetchData() {
    try {
      console.log('check new data')
      const latestEvent = await this.storage.kv.findOne({
        key: 'latestEvent'
      })
      const latestLen = await this.account.viewFunction(this.contractName, 'getEventLength')
      const currentLen = latestEvent ? latestEvent.value : 0
      if (latestEvent === null) {
        console.log('fetch new data')
        const newEvents = await this.account.viewFunction(this.contractName, 'getEvents', {
          start: 0
        })
        if (newEvents.length > 0) {
          for await (const event of newEvents) {
            await this.handleEvent(event)
          }
        }
      }
      else if (latestLen - 1 > currentLen) {
        console.log('fetch new data')
        const newEvents = await this.account.viewFunction(this.contractName, 'getEvents', {
          start: currentLen + 1
        })
        if (newEvents.length > 0) {
          for await (const event of newEvents) {
            await this.handleEvent(event)
          }
        }
        if (latestLen - 1 > currentLen + newEvents.length) {
          await this.fetchData()
        }
      }
    } catch (err) {
      console.log(err)
    }
  }

  get({
    collection,
    query = [],
    sort = 'desc',
    skip = 0,
    limit = 5,
    embed = []
  }) {
    return new Promise((resolve) => {
      let result = []
      let postList = this.data[collection]
      if (!postList) {
        resolve([])
      }
      if (sort === 'desc') {
        postList = this.data[collection].sort((a, b) => b.createdAt - a.createdAt)
      }
      else {
        postList = this.data[collection].sort((a, b) => a.createdAt - b.createdAt)
      }
      for (let i = 0; i < postList.length; i++) {
        const post = postList[i]
        if (query.length > 0) {
          const matches = []
          for (let j = 0; j < query.length; j++) {
            const [key, special] = query[j].key.split('_')
            const value = query[j].value.split(',')
            if (special === 'like' && post[key].toLowerCase().indexOf(value[0].toLowerCase()) > -1) {
              matches.push(true)
            }
            else if (value.includes(post[key])) {
              matches.push(true)
            }
          }
          if (matches.length === query.length && matches.every(Boolean)) {
            for (let k = 0; k < embed.length; k++) {
              const { col, key, targetCol, targetKey } = embed[k]
              post[col] = this.data[targetCol].find(d => d[targetKey] === post[key])
            }
            result.push(post)
          }
        }
        else {
          for (let k = 0; k < embed.length; k++) {
            const { col, key, targetCol, targetKey } = embed[k]
            post[col] = this.data[targetCol].find(d => d[targetKey] === post[key])
          }
          result.push(post)
        }
      }
      if (skip) {
        result.splice(0, skip)
      }

      if (limit) {
        result = result.slice(0, limit)
      }
      resolve(result)
    })
  }
}

module.exports = State