const nacl = require('tweetnacl')
const sha256 = require('js-sha256')
const axios = require('axios')

class Feed {
  constructor(state, storage) {
    this.state = state
    this.storage = storage
  }

  _hexToArr(str) {
    return new Uint8Array(str.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))
  }

  get(pubKey, signature, id, skip, limit) {
    const pubKeyArr = this._hexToArr(pubKey)
    const signatureArr = this._hexToArr(signature)
    return new Promise(async (resolve, reject) => {
      const hash = new Uint8Array(sha256.sha256.array(id))
      const verify = nacl.sign.detached.verify(hash, signatureArr, pubKeyArr)
      if (verify) {
        const followingList = await this.storage.feeds.find({
          userId: id
        })
        const mementoList = await this.state.get({
          collection: 'memento',
          query: [{
            key: 'owner',
            value: id
          }],
          limit: 100
        })
        mementoList.forEach(memento => {
          followingList.push({
            targetId: memento.id,
            targetType: 'memento'
          })
        });
        followingList.push({
          targetId: id,
          targetType: 'user'
        })
        const idList = followingList.map(following => following.targetId)
        let result = []
        const reversedPost = this.state.data.post.sort((a, b) => b.createdAt - a.createdAt)
        for (let i = 0; i < reversedPost.length; i++) {
          const post = reversedPost[i]
          if (
            (idList.includes(post.owner)) ||
            (idList.includes(post.mementoId))
          ) {
            post.user = this.state.data.user.find(u => u.id === post.owner)
            post.memento = this.state.data.memento.find(m => m.id === post.mementoId)
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
      }
      else {
        reject('unauthorized access')
      }
    })
  }

  getFollowing(pubKey, signature, id) {
    const pubKeyArr = this._hexToArr(pubKey)
    const signatureArr = this._hexToArr(signature)
    return new Promise(async (resolve, reject) => {
      const hash = new Uint8Array(sha256.sha256.array(id))
      const verify = nacl.sign.detached.verify(hash, signatureArr, pubKeyArr)
      if (verify) {
        const followingList = await this.storage.feeds.chain().find({
          userId: id
        }).data({ removeMeta: true })
        resolve(followingList)
      }
      else {
        reject('unauthorized access')
      }
    })
  }

  toggleFollow(pubKey, signature, id, targetId, targetType) {
    const pubKeyArr = this._hexToArr(pubKey)
    const signatureArr = this._hexToArr(signature)
    return new Promise(async (resolve, reject) => {
      const hash = new Uint8Array(sha256.sha256.array(id))
      const verify = nacl.sign.detached.verify(hash, signatureArr, pubKeyArr)
      if (verify) {
        const accessKey = await axios.post(`https://rpc.testnet.near.org`, {
          jsonrpc: '2.0',
          id: 'dontcare',
          method: 'query',
          params: {
            "request_type": "view_access_key_list",
            "finality": "final",
            "account_id": id,
            // c70bf38ece08f2d554f0edcec345e24b16060a3e4b22d753d980d0573ad6bd22
            // request_type: 'view_access_key',
            // finality: 'final',
            // account_id: id,
            // public_key: `ed25519:${pubKey}`
          }
        })
        // console.log(accessKey.data)
        const doc = {
          userId: id,
          targetId: targetId,
          targetType: targetType
        }
        const isFolowing = await this.storage.feeds.findOne(doc)
        // unfollow user
        if (isFolowing) {
          console.log(`unfollow ${targetId}`)
          await this.storage.feeds.findAndRemove(doc)
        }
        // follow user
        else {
          console.log(`follow ${targetId}`)
          doc.createdAt = new Date().getTime()
          await this.storage.feeds.insertOne(doc)
        }
        resolve(doc)
      }
      else {
        reject('unauthorized access')
      }
    })
  }
}

module.exports = Feed