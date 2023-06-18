const util = require('../util/util')
const {newCaptcha} = require('../util/captcha-util');

const BasicService = require('./basic-service')


class Captcha extends BasicService {
  constructor(ctx) {
    super(ctx, null)
  }

  async get() {
    this.checkMethod('GET')
    const {cid, data: captchaData} = await newCaptcha();
    const data = {
      "cid": cid,
      "captcha": captchaData,
    }
    this.success(data);
  }

}

module.exports = Captcha

