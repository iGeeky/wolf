const crypto = require('crypto')

class Chksum {
  constructor(magic, length, digest) {
    this.magic = magic
    this.length = length < 1 ? 3 : length
    this.digest = digest || 'base64'
  }

  calcCksum(data) {
    const md5 = crypto.createHash('md5')
    const hash = md5.update(data + this.magic)
    let summary = null
    if (this.digest === 'base64') {
      summary = hash.digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    } else {
      summary = hash.digest('hex')
    }
    // console.log('>>> base64Sum: ', base64Sum)
    const sum = summary.substr(0, this.length)
    return sum
  }

  add(data) {
    return data + this.calcCksum(data)
  }

  check(data) {
    const length = data.length
    if (length <= this.length + 1) {
      return { error: 'ERR_DATA_INVALID' }
    }

    const output = data.substr(0, length - this.length)
    const cksum = data.substr(length - this.length)
    const cksumCalc = this.calcCksum(output)
    if (cksum !== cksumCalc) {
      console.error('invalid data [%s], the ok cksum is :%s', data, cksumCalc)
      return { error: 'ERR_DATA_INVALID' }
    }
    return { output }
  }

  mustCheck(data) {
    const { error, output } = this.check(data)
    if (error) {
      throw new Error(error)
    }
    return output
  }
}

module.exports = Chksum
