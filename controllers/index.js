const EtherApi = require('../api/index')

const BATCH_COUNT = 5
const REQUIRED_BLOCKS = 25

function numberToFetchReq (number) {
  return EtherApi.getBlockByNumber({ blockNumber: number.toString(16) })
}

function bigIntAbs(bigInt) {
  return bigInt >= 0 ? bigInt : bigInt * -1n
}

function truncateResponse (res) {
  return res.transactions
    .map(tr => ({
      from: tr.from,
      to: tr.to,
      value: bigIntAbs(BigInt(tr.value))
    }))
    .filter(tr => tr.value > 0n)
}

async function getMaxChangedBalance ( req, res ) {
  let minBlockNumber = 0
  let maxBlockNumber = 0

  const blocksMap = new Map()
  let totalBlocksFetched = 0

  while (true) {
    const lastBlockNumber = parseInt(await EtherApi.getLastBlockNumber(), 16)

    if (
      totalBlocksFetched >= REQUIRED_BLOCKS
      && maxBlockNumber === lastBlockNumber
    ) break

    let blocksToFetch = []

    if (!totalBlocksFetched) {
      minBlockNumber = lastBlockNumber
      maxBlockNumber = lastBlockNumber
      blocksToFetch = [lastBlockNumber]
    }

    while (
      maxBlockNumber < lastBlockNumber
      && blocksToFetch.length < BATCH_COUNT
    ) {
      maxBlockNumber += 1
      blocksToFetch.push(maxBlockNumber)
    }

    while (
      blocksToFetch.length < BATCH_COUNT
      && blocksToFetch.length + totalBlocksFetched < REQUIRED_BLOCKS
    ) {
      minBlockNumber -= 1
      blocksToFetch.push(minBlockNumber)
    }

    const responses = await Promise.all(blocksToFetch.map(numberToFetchReq))
    responses.map(truncateResponse).forEach((resp, ind) => blocksMap.set(blocksToFetch[ind], resp))

    totalBlocksFetched += responses.length
  }

  const accountValues = new Map()
  for (let blockNumber = maxBlockNumber; blockNumber > maxBlockNumber - REQUIRED_BLOCKS; blockNumber = blockNumber - 1) {
    blocksMap.get(blockNumber).forEach(tr => {
      accountValues.has(tr.from) ? accountValues.set(tr.from, tr.value + accountValues.get(tr.from)) : accountValues.set(tr.from, tr.value)
      accountValues.has(tr.to) ? accountValues.set(tr.to, tr.value + accountValues.get(tr.to)) : accountValues.set(tr.to, tr.value)
    })
  }

  let result
  for ([key, val] of accountValues.entries()) {
    if (!result || val > result.value) {
      result = {
        account: key,
        value: val,
      }
    }
  }

  if (result) {
    result.value = `0x${result.value.toString(16)}`
  }

  res.json(result)
}

module.exports.getMaxChangedBalance = getMaxChangedBalance;
