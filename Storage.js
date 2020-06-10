const loki = require('lokijs')

class Storage {
  constructor() {
    this.db = new loki('db')
    this.db.relation = this.db.addCollection('relation')
  }
}

module.exports = Storage