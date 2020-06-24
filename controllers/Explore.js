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
    const data = await this.storage.db.collection('post').aggregate([{ $sample: { size: 1 } }])

    const arr = data.toArray()
    const iter = (await arr).map(x => x)
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
}

module.exports = Explore