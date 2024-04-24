const {sleep} = require("../utils")

const SECOND = 1000
const ETHER_URL = process.env.ETH_URL || 'https://api.etherscan.io/api'

class EtherApi {
  lastApiCall = new Date(0)
  apikey = process.env.ETH_APIKEY
  delay = this.apikey ? 0.2 * SECOND : 5 * SECOND

  async fetch ({ action, ...rest }) {
    if (!action) throw new Error('No specific action')

    const url = new URL(ETHER_URL)
    url.search = new URLSearchParams({
      module: 'proxy',
      action,
      ...rest,
      apikey: this.apikey,
    })

    let resp

    while (true) {
      if (new Date() - this.lastApiCall < this.delay) {
        await sleep(this.delay)
        continue
      }

      resp = await fetch(url).then(o => o.json())
      this.lastApiCall = new Date();

      if (typeof resp.result === 'string' && resp.result.startsWith('Max rate limit')) {
        continue
      }

      break
    }

    if (resp.status != null) {
      throw new Error(resp.message || 'Unknown Error')
    }

    return resp.result
  }

  async getBlockByNumber({ blockNumber }){
    return await this.fetch({ action: 'eth_getBlockByNumber', tag: blockNumber, boolean: 'true' })
  }

  async getLastBlockNumber() {
    return await this.fetch({ action: 'eth_blockNumber' })
  }
}

module.exports = new EtherApi()