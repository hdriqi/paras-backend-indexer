class Feed {
  constructor(state, storage) {
    this.state = state
    this.storage = storage
  }

  async get(id, skip, limit) {
    const followingList = await this.getFollowing(id)
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
    console.log(result)
    return result
  }

  async getFollowing(id, skip = 0, limit = 10) {
    let followingList = await this.storage.feeds.chain().find({
      userId: id
    }).data({ removeMeta: true })

    console.log(followingList)
    let result = followingList.map(follow => {
      if (follow.targetType === 'memento') {
        follow.memento = this.state.data.memento.find(m => m.id === follow.targetId)
      }
      else if (follow.targetType === 'user') {
        follow.user = this.state.data.user.find(u => u.id === follow.targetId)
      }
      return follow
    })
    if (skip) {
      result.splice(0, skip)
    }

    if (limit) {
      result = result.slice(0, limit)
    }

    return followingList
  }

  async toggleFollow(id, targetId, targetType) {
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
    return doc
  }
}

module.exports = Feed