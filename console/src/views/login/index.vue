<template>
  <div class="login-main">
    <div class="login-container">
      <el-form ref="loginForm" :model="loginForm" :rules="loginRules" class="login-form" autocomplete="on" label-position="left">

        <div class="title-container">
          <h3 class="title">{{ $t('wolf.loginPromptLoginForm') }}</h3>
        </div>

        <el-form-item prop="username">
          <span class="svg-container">
            <svg-icon icon-class="user" />
          </span>
          <el-input
            ref="username"
            v-model="loginForm.username"
            :placeholder="$t('wolf.loginPromptUsername')"
            name="username"
            type="text"
            tabindex="1"
            autocomplete="on"
          />
        </el-form-item>

        <el-tooltip v-model="capsTooltip" content="Caps lock is On" placement="right" manual>
          <el-form-item prop="password">
            <span class="svg-container">
              <svg-icon icon-class="password" />
            </span>
            <el-input
              :key="passwordType"
              ref="password"
              v-model="loginForm.password"
              :type="passwordType"
              :placeholder="$t('wolf.loginPromptPassword')"
              name="password"
              tabindex="2"
              autocomplete="on"
              @keyup.native="checkCapslock"
              @blur="capsTooltip = false"
              @keyup.enter.native="handleLogin"
            />
            <span class="show-pwd" @click="showPwd">
              <svg-icon :icon-class="passwordType === 'password' ? 'eye' : 'eye-open'" />
            </span>
          </el-form-item>
        </el-tooltip>
        <el-form-item v-if="captchaData.cid" prop="captchaText">
          <div class="captcha">
            <el-input
              v-model="loginForm.captchaText"
              :placeholder="$t('wolf.loginPromptCaptcha')"
              name="captchaText"
              tabindex="3"
              minlength="4"
              maxlength="6"
            />
            <div class="captchaImage" v-html="captchaData.captcha" />
            <div v-if="countdownNum > 0" class="refresh-icon">
              {{ countdownNum }}
            </div>
            <svg-icon v-else icon-class="refresh" class="refresh-icon" @click="loadCaptchaData" />
          </div>
        </el-form-item>

        <el-form-item v-if="showAuthTypeOption" prop="authType">
          <el-radio-group v-model="loginForm.authType" @change="authTypeChange">
            <el-radio label="1">{{ $t('wolf.loginPromptStandardLogin') }}</el-radio>
            <el-radio v-if="loginOptions.ldap.supported" label="2"> {{ loginOptions.ldap.label||'LDAP' }} </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-button :loading="loading" type="primary" style="width:100%;margin-bottom:30px;" @click.native.prevent="handleLogin">{{ $t('wolf.btnLogin') }}</el-button>
      </el-form>

      <el-dialog title="Or connect with" :visible.sync="showDialog">
        Can not be simulated on local, so please combine you own business simulation! ! !
        <br>
        <br>
        <br>
        <social-sign />
      </el-dialog>
    </div>
  </div>
</template>

<script>
import { validUsername } from '@/utils/validate'
import SocialSign from './components/SocialSignin'
import { getLoginOptions, getCaptchaData } from '@/api/user'

export default {
  name: 'Login',
  components: { SocialSign },
  data() {
    const validateUsername = (rule, value, callback) => {
      if (!validUsername(value)) {
        callback(new Error('Please enter the correct user name'))
      } else {
        callback()
      }
    }
    const validatePassword = (rule, value, callback) => {
      if (value.length < 6) {
        callback(new Error('The password can not be less than 6 digits'))
      } else {
        callback()
      }
    }
    const validateCaptcha = (rule, value, callback) => {
      if (!value || value.length < 4) {
        callback(new Error('Please enter the correct captcha'))
      } else {
        callback()
      }
    }
    return {
      loginForm: {
        username: '',
        password: '',
        captchaText: '',
        authType: '1',
      },
      loginOptions: {
        password: {},
        ldap: {},
        consoleLoginWithCaptcha: false,
      },
      captchaData: {
        cid: '',
        captcha: '',
      },
      loginRules: {
        username: [{ required: true, trigger: 'blur', validator: validateUsername }],
        password: [{ required: true, trigger: 'blur', validator: validatePassword }],
        captchaText: [{ required: true, trigger: 'blur', validator: validateCaptcha }],
        authType: [{ required: true }],
      },
      passwordType: 'password',
      capsTooltip: false,
      loading: false,
      showDialog: false,
      countdownNum: 0,
      redirect: undefined,
      otherQuery: {},
    }
  },
  computed: {
    showAuthTypeOption() {
      if (this.loginOptions.ldap && this.loginOptions.ldap.supported) {
        return true
      }
      return false
    },
  },
  watch: {
    $route: {
      handler: function(route) {
        const query = route.query
        if (query) {
          this.redirect = query.redirect
          this.otherQuery = this.getOtherQuery(query)
        }
      },
      immediate: true,
    },
  },
  created() {
    this.ldapOptionLoad()
  },
  mounted() {
    this.loginForm.authType = localStorage.authType === undefined ? '1' : localStorage.authType
    if (this.loginForm.username === '') {
      this.$refs.username.focus()
    } else if (this.loginForm.password === '') {
      this.$refs.password.focus()
    }
  },
  destroyed() {
    // window.removeEventListener('storage', this.afterQRScan)
  },
  methods: {
    countdown(num) {
      this.countdownNum = num
      const timer = setInterval(() => {
        this.countdownNum--
        if (this.countdownNum < 0) {
          clearInterval(timer)
        }
      }, 1000)

      return {
        stop: function() {
          clearInterval(timer)
        },
        getNum: function() {
          return this.countdownNum
        },
      }
    },
    checkCapslock({ shiftKey, key } = {}) {
      if (key && key.length === 1) {
        if (shiftKey && (key >= 'a' && key <= 'z') || !shiftKey && (key >= 'A' && key <= 'Z')) {
          this.capsTooltip = true
        } else {
          this.capsTooltip = false
        }
      }
      if (key === 'CapsLock' && this.capsTooltip === true) {
        this.capsTooltip = false
      }
    },
    showPwd() {
      if (this.passwordType === 'password') {
        this.passwordType = ''
      } else {
        this.passwordType = 'password'
      }
      this.$nextTick(() => {
        this.$refs.password.focus()
      })
    },
    handleLogin() {
      this.$refs.loginForm.validate(valid => {
        if (valid) {
          this.loading = true
          const loginForm = { ...this.loginForm }
          if (this.captchaData.cid) {
            loginForm.cid = this.captchaData.cid
          }
          this.$store.dispatch('user/login', loginForm)
          // login(this.loginForm)
            .then((res) => {
              this.loginForm.captchaText = ''
              this.$router.push({ path: this.redirect || '/', query: this.otherQuery })
              this.loading = false
            })
            .catch((err) => {
              this.loginForm.captchaText = ''
              this.loadCaptchaData()
              this.loading = false
              console.error('login failed! err: ', err)
            })
        } else {
          console.error('error submit!!')
          this.loadCaptchaData()
          return false
        }
      })
    },
    async ldapOptionLoad() {
      const res = await getLoginOptions()
      if (res.ok) {
        this.loginOptions = res.data
        if (!this.loginOptions.ldap.supported) {
          this.loginForm.authType = '1'
        }
        await this.loadCaptchaData()
      }
      // console.log('loginOptions: %s', JSON.stringify(this.loginOptions))
    },
    async loadCaptchaData() {
      this.countdownCounter = this.countdown(10)
      if (this.loginOptions.consoleLoginWithCaptcha) {
        const res = await getCaptchaData()
        if (res.ok) {
          this.captchaData = res.data
        }
      }
    },
    authTypeChange(label) {
      localStorage.setItem('authType', label)
    },
    getOtherQuery(query) {
      return Object.keys(query).reduce((acc, cur) => {
        if (cur !== 'redirect') {
          acc[cur] = query[cur]
        }
        return acc
      }, {})
    },
    // afterQRScan() {
    //   if (e.key === 'x-admin-oauth-code') {
    //     const code = getQueryObject(e.newValue)
    //     const codeMap = {
    //       wechat: 'code',
    //       tencent: 'code',
    //     }
    //     const type = codeMap[this.auth_type]
    //     const codeName = code[type]
    //     if (codeName) {
    //       this.$store.dispatch('LoginByThirdparty', codeName).then(() => {
    //         this.$router.push({ path: this.redirect || '/' })
    //       })
    //     } else {
    //       alert('第三方登录失败')
    //     }
    //   }
    // },
  },
}
</script>

<style lang="scss">
/* 修复input 背景不协调 和光标变色 */
$bg:#283443;
$light_gray:#fff;
$cursor: #fff;

@supports (-webkit-mask: none) and (not (cater-color: $cursor)) {
  .login-container .el-input input {
    color: $cursor;
  }
}

/* reset element-ui css */
.login-container {
  .el-input {
    display: inline-block;
    height: 47px;
    width: 85%;

    input {
      background: transparent;
      border: 0px;
      -webkit-appearance: none;
      border-radius: 0px;
      padding: 12px 5px 12px 15px;
      color: $light_gray;
      height: 47px;
      caret-color: $cursor;

      &:-webkit-autofill {
        box-shadow: 0 0 0px 1000px $bg inset !important;
        -webkit-text-fill-color: $cursor !important;
      }
    }
  }

  .el-form-item {
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.1);
    border-radius: 5px;
    color: #454545;
  }
}
</style>

<style lang="scss" scoped>
$bg:#2d3a4b;
$dark_gray:#889aa4;
$light_gray:#eee;

.login-main {
  width: 100%;
  height: 100%;
  display: flex;
  display: -webkit-flex;
  justify-content: center;
  align-items: center;
  background: #f2f3f7;
}

.login-container {
  // min-height: 100%;
  // width: 100%;
  display: flex;
  background-color: $bg;
  border-radius: 10px;
  box-shadow: 0 1px 4px 0 rgba(0,0,0,0.37);
  overflow: hidden;

  .login-form {
    position: relative;
    width: 520px;
    max-width: 100%;
    padding: 15px 35px 0;
    margin: 0 auto;
    overflow: hidden;

    .captcha {
      display: flex;
      height: 40px;
      -webkit-box-orient: horizontal;
      -webkit-box-direction: normal;
      -ms-flex-direction: row;
      flex-direction: row;

      .captchaImage {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .refresh-icon {
        display: flex;
        width: 50px;
        height: 40px;
        align-items: center;
        justify-content: center;
        background: #060a10;
        border-radius: 5px;
        font-size: 25px;
        color: #fbfbfb;
      }
    }
  }

  .tips {
    font-size: 14px;
    color: #fff;
    margin-bottom: 10px;

    span {
      &:first-of-type {
        margin-right: 16px;
      }
    }
  }

  .svg-container {
    padding: 6px 5px 6px 15px;
    color: $dark_gray;
    vertical-align: middle;
    width: 30px;
    display: inline-block;
  }

  .title-container {
    // position: relative;
    display: flex;
    justify-content: center;
    align-items: center;

    .title {
      font-size: 26px;
      color: $light_gray;
      margin: 10px auto 10px auto;
      text-align: center;
      font-weight: bold;
    }

    .title-gray {
      font-size: 22px;
      color: $light_gray;
      margin: 10px auto 10px auto;
      text-align: center;
    }
  }

  .show-pwd {
    position: absolute;
    right: 10px;
    top: 7px;
    font-size: 16px;
    color: $dark_gray;
    cursor: pointer;
    user-select: none;
  }

  .thirdparty-button {
    position: absolute;
    right: 0;
    bottom: 6px;
  }

  @media only screen and (max-width: 470px) {
    .thirdparty-button {
      display: none;
    }
  }
}
</style>
