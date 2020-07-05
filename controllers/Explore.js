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
    const rng = Math.round(Math.random() * (maxSample - minSample) + minSample)
    const data = await this.storage.db.collection('post').aggregate([{ $sample: { size: maxSample } }])

    const arr = await data.toArray()
    const selected = [arr[rng]] 
    const iter = selected.map(x => x)
    const result = []
    for await (const d of iter) {
      if (embed &&  embed.length > 0) {
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
      sortFn: (a,b) => b.score - a.score,
      keys: ['id']
    }
    
    const fuse = new Fuse(combineList, options)
    const result = fuse.search(q.id__re)
    const itemList = result.slice(0, 10).map(res => {
      return {
        id: res.item.id,
        type: res.item.imgAvatar ? 'user' : 'memento',
        img: res.item.img || res.item.imgAvatar
      }
    })

    return itemList
  }
}

module.exports = Explore