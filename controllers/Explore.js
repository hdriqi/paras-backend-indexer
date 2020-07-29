const Fuse = require('fuse.js')

class Explore {
  constructor(state, storage) {
    this.state = state
    this.storage = storage
  }

  async getPost() {
    const embed = [{
      col: 'memento',
      key: 'mementoId',
      targetCol: 'memento',
      targetKey: 'id'
    }, {
      col: 'user',
      key: 'owner',
      targetCol: 'user',
      targetKey: 'id'
    }]

    const minSample = 0
    const maxSample = 10
    const rng = Math.floor(Math.random() * (maxSample - minSample) + minSample)
    const data = await this.storage.db.collection('post').aggregate([{ $sample: { size: maxSample } }])

    const arr = await data.toArray()
    const selected = [arr[rng]]
    const iter = selected.map(x => x)
    const result = []
    for await (const d of iter) {
      if (embed && embed.length > 0) {
        for (const e of embed) {
          d[e.col] = await this.storage.db.collection(e.targetCol).findOne({
            [e.targetKey]: d[e.key]
          })
        }
      }
      result.push(d)
    }
    return result
  }

  async search(q) {
    const userList = await this.storage.get('user', q)
    const mementoList = await this.storage.get('memento', q)
    const combineList = userList.concat(mementoList)

    const options = {
      includeScore: true,
      sortFn: (a, b) => b.score - a.score,
      keys: ['id']
    }

    const fuse = new Fuse(combineList, options)
    const result = fuse.search(q.id__re).slice(0, 10)
    const final = []
    for (const data of result) {
      const postQuery = {
        __limit: 3,
        __sort: '-createdAt'
      }
      if (data.item.imgAvatar) {
        postQuery.owner = data.item.id
      }
      else {
        postQuery.mementoId = data.item.id
      }
      const postList = await this.storage.get('post', postQuery, [{
        col: 'memento',
        key: 'mementoId',
        targetCol: 'memento',
        targetKey: 'id'
      }, {
        col: 'user',
        key: 'owner',
        targetCol: 'user',
        targetKey: 'id'
      }])

      final.push({
        id: data.item.id,
        type: data.item.imgAvatar ? 'user' : 'memento',
        img: data.item.img || data.item.imgAvatar,
        postList: postList
      })
    }

    return final
  }
}

module.exports = Explore