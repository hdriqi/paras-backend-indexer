class Transaction {
  constructor(state, storage) {
    this.state = state
    this.storage = storage
  }

  getById({
    id,
    skip = 0,
    limit = 5,
    embed = []
  }) {
    const collection = 'pac:tx'
    return new Promise((resolve) => {
      let result = []
      let txList = this.state.data[collection]
      if (!txList) {
        resolve([])
      }
      txList = this.state.data[collection].sort((a, b) => b.id - a.id)
      for (let i = 0; i < txList.length; i++) {
        const tx = txList[i]
        if (tx.from === id || tx.to === id) {
          for (let k = 0; k < embed.length; k++) {
            const { col, key, targetCol, targetKey } = embed[k]
            tx[col] = this.state.data[targetCol].find(d => d[targetKey] === tx[key])
          }
          result.push(tx)
        }
      }
      if (skip) {
        result.splice(0, skip)
      }

      if (limit) {
        result = result.slice(0, limit)
      }
      resolve(result)
    })
  }
}

module.exports = Transaction