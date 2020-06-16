const nodemailer = require('nodemailer')
const heml = require('heml')
const templateVerifyEmail = require('./MailTemplate/verifyEmail')

const hemlOpts = {
  validate: 'soft',
  cheerio: {},
  juice: {},
  beautify: {},
  elements: []
}

class Mail {
  constructor() {
    this.transporter = null
    this.send = this.send.bind(this)
  }

  async init() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.zoho.com',
			port: 465,
			secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    })
  }

  send(data) {
    if(!this.transporter) {
      throw 'mail is not initialized'
    }
    return new Promise((resolve, reject) => {
      this.transporter.sendMail(data, (err) => {
        if(err) {
          return reject(err)
        }
        return resolve()
      })
    })
  }

  async sendVerifyEmail({ link, email }) {
    const tmpl = templateVerifyEmail(link)
    const { html } = await heml(tmpl, hemlOpts)
    this.send({
      from: `"Paras Team" <hello@paras.id>`,
      to: email,
      subject: `[Paras] Email Verification`,
      html: html
    })
  }
}

module.exports = Mail