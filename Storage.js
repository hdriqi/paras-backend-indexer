const MongoClient = require('mongodb').MongoClient
var qpm = require('query-params-mongo')
var processQuery = qpm()

class Storage {
  constructor() {
    const uri = "mongodb://localhost:27017?retryWrites=true&w=majority"
    this.client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    this.ready = null
  }

  async init() {
    try {
      await this.client.connect()
      this.db = this.client.db('paras-test')
      this.ready = true
      this.kv = this.db.collection('kv')
      this.feeds = this.db.collection('feeds')
      this.verifications = this.db.collection('verifications')
    } catch (err) {
      console.log(err)
    }
  }

  async get(collection, q, embed) {
    var query = processQuery(q)
    const data = await this.db.collection(collection).find(query.filter, {
      projection: {
        _id: 0
      }
    })
      .sort(query.sort)
      .skip(query.skip)
      .limit(query.limit)

    const arr = data.toArray()
    const iter = (await arr).map(x => x)
    const result = []
    for await (const d of iter) {
      if (embed &&  embed.length > 0) {
        for (const e of embed) {
          d[e.col] = await this.db.collection(e.targetCol).findOne({
            [e.targetKey]: d[e.key]
          })
        }
      }
      result.push(d)
    }
    return result
  }
}

module.exports = Storage