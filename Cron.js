var cron = require('node-cron')

class Cron {
  constructor(state, storage, mail) {
    this.state = state
    this.storage = storage
    this.mail = mail
  }

  async _sendWalletEmail() {
    try {
      const endTime = new Date().getTime()
      const last12H = 24 * 60 * 60 * 1000
      const startTime = endTime - last12H
      const last12HTx = await this.storage.db.collection('transaction').find({
        createdAt: {
          // in nanosecond
          $gte: (startTime * 1000000).toString()
        }
      })
      const mappedTx = {}
      const arr = last12HTx.toArray()
      const iter = (await arr).map(x => x)
      for await (const tx of iter) {
        if (mappedTx[tx.to]) {
          mappedTx[tx.to].push(tx)
        }
        else {
          mappedTx[tx.to] = [tx]
        }
      }
      for await (const [key, value] of Object.entries(mappedTx)) {
        const verification = await this.storage.db.collection('verifications').findOne({
          userId: key
        })
        if (verification.status === 'confirmed') {
          this.mail.sendWalletEmail({
            txList: value,
            email: verification.email
          })
        }
      }
    } catch (err) {
      console.log(err)
    }
  }

  async _sendNotifyEmail() {
    try {
      const endTime = new Date().getTime()
      const last12H = 12 * 60 * 60 * 1000
      const startTime = endTime - last12H
      const last12HNotification = await this.storage.db.collection('notification').find({
        createdAt: {
          $gte: startTime.toString()
        }
      })
      const mappedNotification = {}
      const arr = last12HNotification.toArray()
      const iter = (await arr).map(x => x)
      for await (const notif of iter) {
        if (mappedNotification[notif.userId]) {
          mappedNotification[notif.userId].push(notif)
        }
        else {
          mappedNotification[notif.userId] = [notif]
        }
      }
      for await (const [key, value] of Object.entries(mappedNotification)) {
        const verification = await this.storage.db.collection('verifications').findOne({
          userId: key
        })
        if (verification.status === 'confirmed') {
          this.mail.sendNotificationEmail({
            notifyList: value,
            email: verification.email
          })
        }
      }
    } catch (err) {
      console.log(err)
    }
  }

  async init() {
    cron.schedule('0 9 * * *', async () => {
      await this._sendWalletEmail()
    }, {
      scheduled: true,
      timezone: 'America/Los_Angeles'
    })

    cron.schedule('0 8,20 * * *', async () => {
      await this._sendNotifyEmail()
    }, {
      scheduled: true,
      timezone: 'America/Los_Angeles'
    })
  }
}

module.exports = Cron