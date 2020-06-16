const Loki = require('lokijs')

class Storage {
  constructor() {
    this.db = new Loki('db.json', {
      autosave: true,
      autoload: true,
      autoloadCallback: this._init.bind(this)
    })
    this.ready = null
  }

  _init() {
    this.ready = true
    this.feeds = this.db.getCollection('feeds')
    this.verifications = this.db.getCollection('verifications')
    if (!this.feeds) {
      console.log('create new feeds collection')
      this.feeds = this.db.addCollection('feeds')
    }
    if (!this.verifications) {
      console.log('create new verifications collection')
      this.feeds = this.db.addCollection('verifications')
    }
  }

  init() {
    const self = this
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        if (self.ready) {
          resolve('initialize db')
        }
      }, 100)
      setTimeout(() => {
        if (!self.ready) {
          clearInterval(interval)
          reject('Failed to initialize db')
        }
      }, 5000)
    })
  }
}

module.exports = Storage