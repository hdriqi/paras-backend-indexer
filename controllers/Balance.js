class Balance {
  constructor(state, storage) {
    this.state = state
    this.storage = storage
  }

  async get(id) {
    const balance = await this.state.account.viewFunction(this.state.contractName, 'balanceOf', {
      tokenOwner: id
    })
    return balance
  }
}

module.exports = Balance