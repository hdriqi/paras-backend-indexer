const axios = require('axios')
const base64 = require('base-64')

function parseJSON(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return str;
  }
}

class State {
  constructor() {
    this.data = {}
    this.contractName = null
    this.__init__ = false
  }

  async start() {
    await this.fetchData()
    setTimeout(() => {
      this.start()
    }, 5000)
  }

  async init() {
    if (!process.env.CONTRACT_NAME) {
      throw 'CONTRACT_NAME is not defined on env'
    }
    this.contractName = process.env.CONTRACT_NAME
    this.__init__ = true
    this.start()
  }

  async fetchData() {
    // dev-1592027038343
    const result = await axios.post('https://rpc.testnet.near.org', {
      jsonrpc: '2.0',
      id: 'dontcare',
      method: 'query',
      params: {
        request_type: 'view_state',
        finality: 'final',
        account_id: this.contractName,
        prefix_base64: ''
      }
    })

    console.log(`fetch successfull ${new Date()}`)
    const newData = {}
    result.data.result.values.map(res => {
      const key = base64.decode(res.key)
      const value = parseJSON(base64.decode(res.value))
      const [prefix, id] = key.split('::')
      if (prefix && id) {
        const doc = typeof value !== 'object' ? { value: value } : value
        doc.id = id
        if (newData[prefix]) {
          newData[prefix].push(doc)
        }
        else {
          newData[prefix] = [doc]
        } 
      }
    })
    this.data = newData
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