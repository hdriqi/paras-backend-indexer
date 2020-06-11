const Base64 = require('js-base64').Base64
const nacl = require('tweetnacl')
const bs58 = require('bs58')
const sha256 = require('js-sha256')
const axios = require('axios')

const _hexToArr = (str) => {
  return new Uint8Array(str.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))
}

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization
  const decodeAuthHeader = Base64.decode(authHeader)
  const [userId, pubKey, signature] = decodeAuthHeader.split('&')
  const pubKeyArr = _hexToArr(pubKey)
  const signatureArr = _hexToArr(signature)
  const hash = new Uint8Array(sha256.sha256.array(userId))
  const verify = nacl.sign.detached.verify(hash, signatureArr, pubKeyArr)
  if (!verify) {
    return res.status(401).json({
      success: 0,
      message: 'unauthorized'
    })
  }
  const b58pubKey = bs58.encode(Buffer.from(pubKey.toUpperCase(), 'hex'))
  const response = await axios.post(`https://rpc.testnet.near.org`, {
    jsonrpc: '2.0',
    id: 'dontcare',
    method: 'query',
    params: {
      request_type: 'view_access_key',
      finality: 'final',
      account_id: userId,
      public_key: `ed25519:${b58pubKey}`
    }
  })

  if (response.data.result && response.data.result.error) {
    return res.status(401).json({
      success: 0,
      message: 'unauthorized'
    })
  }
  req.userId = userId
  next()
}