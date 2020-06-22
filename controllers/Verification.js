const jwt = require('jsonwebtoken')

class User {
  constructor(state, storage, mail) {
    this.state = state
    this.storage = storage
    this.mail = mail
  }

  async checkRegister(id) {
    const userExist = await this.storage.verifications.findOne({
      userId: id
    })
    // if email already exist
    if (userExist) {
      return userExist
    }
    return null
  }

  register(id, email, fullName, referral) {
    const doc = {
      userId: id,
      email: email,
      fullName: fullName,
      referral: referral,
      status: 'pending'
    }

    return new Promise(async (resolve, reject) => {
      const emailExist = await this.storage.verifications.findOne({
        email: email
      })
      // if email already exist
      if (emailExist) {
        reject('already_registered')
      }
      // else save data
      else {
        doc.createdAt = new Date().getTime()
        doc.updatedAt = new Date().getTime()
        await this.storage.verifications.insertOne(doc)

        // send email
        const token = jwt.sign(doc, process.env.JWT_SECRET)
        const link = `${process.env.FRONTEND_URL}/confirm-email/${token}`
        this.mail.sendVerifyEmail({
          link: link,
          email: email
        })
        resolve(true)
      }
    })
  }

  confirmEmail(token) {
    return new Promise(async (resolve, reject) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        const alreadyConfirmed = await this.storage.verifications.findOne({
          email: decoded.email,
          status: 'confirmed'
        })
        if (alreadyConfirmed) {
          return reject('already_confirmed')
        }
        const newDoc = await this.storage.verifications.findAndUpdate({
          userId: decoded.userId,
          email: decoded.email
        }, (doc) => {
          doc.updatedAt = new Date().getTime()
          doc.status = 'confirmed'
        })
        resolve(newDoc)
      } catch (err) {
        reject(err)
      }
    })
  }
}

module.exports = User