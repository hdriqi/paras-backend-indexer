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

  async handleEvent(event) {
    // id, msg, params
    const [collection, type] = event.msg.split('_')
    const collectionCapitalize = collection.charAt(0).toUpperCase() + collection.slice(1)
    const methodName = `get${collectionCapitalize}ById`
    const args = {
      id: event.params
    }
    console.log(event.msg)
    const data = await this.account.viewFunction(this.contractName, methodName, args)
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
    else if (type === 'delete') {
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