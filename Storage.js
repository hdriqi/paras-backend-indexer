const MongoClient = require('mongodb').MongoClient

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
      this.feeds = this.db.collection('feeds')
      this.kv = this.db.collection('kv')
      this.verifications = this.db.collection('verifications')
    } catch (err) {
      console.log(err)
    }
  }
}

module.exports = Storage