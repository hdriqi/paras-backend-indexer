class Feed {
  constructor(state, storage) {
    this.state = state
    this.storage = storage
  }

  async get(id, skip = 0, limit = 5) {
    const followingList = await this.getFollowing(id)
    followingList.push({
      targetId: id,
      targetType: 'user'
    })
    const idList = followingList.map(following => following.targetId)
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
    const data = await this.storage.db.collection('post').find({
      $or: [
        {
          owner: {
            $in: idList
          }
        },
        {
          mementoId: {
            $in: idList
          }
        }
      ]
    }, {
      projection: {
        _id: 0
      }
    })
      .sort({
        createdAt: -1
      })
      .skip(parseInt(skip))
      .limit(parseInt(limit))

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

  async getFollowing(id, skip = 0, limit = 10) {
    const query = {
      userId: id,
      __skip: skip,
      __limit: limit
    }
    const followingList = await this.storage.get('feeds', query, [{
      key: 'targetId',
      col: 'memento',
      targetKey: 'id',
      targetCol: 'memento'
    }, {
      key: 'userId',
      col: 'user',
      targetKey: 'id',
      targetCol: 'user',
    }])

    return followingList
  }

  async unfollow(id, targetId, targetType) {
    const doc = {
      userId: id,
      targetId: targetId,
      targetType: targetType
    }
    console.log(`unfollow ${targetId}`)
    await this.storage.feeds.deleteOne(doc)
    return doc
  }

  async follow(id, targetId, targetType) {
    const doc = {
      userId: id,
      targetId: targetId,
      targetType: targetType
    }
    console.log(`follow ${targetId}`)
    const exist = await this.storage.feeds.findOne(doc)
    if (!exist) {
      doc.createdAt = new Date().getTime()
      await this.storage.feeds.insertOne(doc)
    }
    return doc
  }
}

module.exports = Feed