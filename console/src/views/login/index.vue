<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Motion from "./utils/motion";
import { useRouter } from "vue-router";
import { message } from "@/utils/message";
import TypeIt from "@/components/ReTypeit";
import { debounce } from "@pureadmin/utils";
import { useNav } from "@/layout/hooks/useNav";
import { useEventListener } from "@vueuse/core";
import type { FormInstance } from "element-plus";
import { useLayout } from "@/layout/hooks/useLayout";
import { useUserStoreHook } from "@/store/modules/user";
import { initRouter, getTopMenu } from "@/router/utils";
import { bg, illustration } from "./utils/static";
import { ref, toRaw, reactive, watch, onMounted } from "vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { useTranslationLang } from "@/layout/hooks/useTranslationLang";
import { useDataThemeChange } from "@/layout/hooks/useDataThemeChange";
import { getLoginOptions, getCaptchaData } from "@/api/user";

import dayIcon from "@/assets/svg/day.svg?component";
import darkIcon from "@/assets/svg/dark.svg?component";
import globalization from "@/assets/svg/globalization.svg?component";
import Lock from "~icons/ri/lock-fill";
import Check from "~icons/ep/check";
import User from "~icons/ri/user-3-fill";
import Keyhole from "~icons/ri/shield-keyhole-line";
import Refresh from "~icons/ep/refresh";

defineOptions({
  name: "Login"
});

const loginDay = ref(7);
const router = useRouter();
const loading = ref(false);
const checked = ref(false);
const disabled = ref(false);
const ruleFormRef = ref<FormInstance>();
const countdownNum = ref(0);

// 登录选项
const loginOptions = reactive({
  ldap: {
    supported: false,
    label: "LDAP"
  },
  consoleLoginWithCaptcha: false
});

// 验证码数据
const captchaData = reactive({
  cid: "",
  captcha: ""
});

const { t } = useI18n();
const { initStorage } = useLayout();
initStorage();
const { dataTheme, themeMode, dataThemeChange } = useDataThemeChange();
dataThemeChange(themeMode.value);
const { title, getDropdownItemStyle, getDropdownItemClass } = useNav();
const { locale, translationCh, translationEn } = useTranslationLang();

// 登录表单
const ruleForm = reactive({
  username: "",
  password: "",
  captchaText: "",
  authType: "1" // 1: 标准登录, 2: LDAP登录
});

// 表单验证规则
const loginRules = {
  username: [
    { required: true, message: "请输入用户名", trigger: "blur" },
    { min: 2, max: 32, message: "长度在 2 到 32 个字符", trigger: "blur" }
  ],
  password: [
    { required: true, message: "请输入密码", trigger: "blur" },
    { min: 6, message: "密码不能少于6位", trigger: "blur" }
  ],
  captchaText: [
    { required: true, message: "请输入验证码", trigger: "blur" },
    { min: 4, max: 6, message: "验证码长度为4-6位", trigger: "blur" }
  ]
};

// 倒计时
const countdown = (num: number) => {
  countdownNum.value = num;
  const timer = setInterval(() => {
    countdownNum.value--;
    if (countdownNum.value < 0) {
      clearInterval(timer);
    }
  }, 1000);
};

// 加载登录选项
const loadLoginOptions = async () => {
  try {
    const res = await getLoginOptions();
    if (res.ok && res.data) {
      loginOptions.ldap = res.data.ldap || { supported: false, label: "LDAP" };
      loginOptions.consoleLoginWithCaptcha =
        res.data.consoleLoginWithCaptcha || false;
      // 从 localStorage 恢复上次选择的登录类型
      const savedAuthType = localStorage.getItem("authType");
      if (savedAuthType && loginOptions.ldap.supported) {
        ruleForm.authType = savedAuthType;
      }
      await loadCaptchaData();
    }
  } catch (e) {
    console.error("Failed to load login options:", e);
  }
};

// 加载验证码
const loadCaptchaData = async () => {
  if (!loginOptions.consoleLoginWithCaptcha) return;
  countdown(10);
  try {
    const res = await getCaptchaData();
    if (res.ok && res.data) {
      captchaData.cid = res.data.cid;
      captchaData.captcha = res.data.captcha;
    }
  } catch (e) {
    console.error("Failed to load captcha:", e);
  }
};

// 登录类型切换
const authTypeChange = (label: string) => {
  localStorage.setItem("authType", label);
};

// 登录处理
const onLogin = async (formEl: FormInstance | undefined) => {
  if (!formEl) return;
  await formEl.validate(valid => {
    if (valid) {
      loading.value = true;
      const loginData: any = {
        username: ruleForm.username,
        password: ruleForm.password,
        authType: ruleForm.authType
      };
      // 添加验证码
      if (captchaData.cid) {
        loginData.cid = captchaData.cid;
        loginData.captchaText = ruleForm.captchaText;
      }

      useUserStoreHook()
        .loginByUsername(loginData)
        .then(res => {
          if (res.ok) {
            // Wolf 使用 ok 字段表示成功
            // 获取后端路由
            return initRouter().then(() => {
              disabled.value = true;
              router
                .push(getTopMenu(true).path)
                .then(() => {
                  message(t("login.pureLoginSuccess"), { type: "success" });
                })
                .finally(() => (disabled.value = false));
            });
          } else {
            ruleForm.captchaText = "";
            loadCaptchaData();
          }
        })
        .catch(() => {
          ruleForm.captchaText = "";
          loadCaptchaData();
        })
        .finally(() => (loading.value = false));
    } else {
      loadCaptchaData();
    }
  });
};

const immediateDebounce: any = debounce(
  formRef => onLogin(formRef),
  1000,
  true
);

useEventListener(document, "keydown", ({ code }) => {
  if (
    ["Enter", "NumpadEnter"].includes(code) &&
    !disabled.value &&
    !loading.value
  )
    immediateDebounce(ruleFormRef.value);
});

watch(checked, bool => {
  useUserStoreHook().SET_ISREMEMBERED(bool);
});
watch(loginDay, value => {
  useUserStoreHook().SET_LOGINDAY(value);
});

onMounted(() => {
  loadLoginOptions();
});
</script>

<template>
  <div class="select-none">
    <img :src="bg" class="wave" />
    <div class="flex-c absolute right-5 top-3">
      <!-- 主题 -->
      <el-switch
        v-model="dataTheme"
        inline-prompt
        :active-icon="dayIcon"
        :inactive-icon="darkIcon"
        @change="dataThemeChange"
      />
      <!-- 国际化 -->
      <el-dropdown trigger="click">
        <globalization
          class="hover:text-primary hover:bg-[transparent]! w-[20px] h-[20px] ml-1.5 cursor-pointer outline-hidden duration-300"
        />
        <template #dropdown>
          <el-dropdown-menu class="translation">
            <el-dropdown-item
              :style="getDropdownItemStyle(locale, 'zh')"
              :class="['dark:text-white!', getDropdownItemClass(locale, 'zh')]"
              @click="translationCh"
            >
              <IconifyIconOffline
                v-show="locale === 'zh'"
                class="check-zh"
                :icon="Check"
              />
              简体中文
            </el-dropdown-item>
            <el-dropdown-item
              :style="getDropdownItemStyle(locale, 'en')"
              :class="['dark:text-white!', getDropdownItemClass(locale, 'en')]"
              @click="translationEn"
            >
              <span v-show="locale === 'en'" class="check-en">
                <IconifyIconOffline :icon="Check" />
              </span>
              English
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
    <div class="login-container">
      <div class="img">
        <component :is="toRaw(illustration)" />
      </div>
      <div class="login-box">
        <div class="login-form">
          <Motion>
            <h2 class="outline-hidden">
              <TypeIt
                :options="{
                  strings: ['Wolf 控制台'],
                  cursor: false,
                  speed: 100
                }"
              />
            </h2>
          </Motion>

          <el-form
            ref="ruleFormRef"
            :model="ruleForm"
            :rules="loginRules"
            size="large"
          >
            <!-- 用户名 -->
            <Motion :delay="100">
              <el-form-item prop="username">
                <el-input
                  v-model="ruleForm.username"
                  clearable
                  placeholder="用户名"
                  :prefix-icon="useRenderIcon(User)"
                />
              </el-form-item>
            </Motion>

            <!-- 密码 -->
            <Motion :delay="150">
              <el-form-item prop="password">
                <el-input
                  v-model="ruleForm.password"
                  clearable
                  show-password
                  placeholder="密码"
                  :prefix-icon="useRenderIcon(Lock)"
                />
              </el-form-item>
            </Motion>

            <!-- 服务端验证码 -->
            <Motion v-if="captchaData.cid" :delay="200">
              <el-form-item prop="captchaText">
                <div class="captcha-container">
                  <el-input
                    v-model="ruleForm.captchaText"
                    clearable
                    placeholder="验证码"
                    :prefix-icon="useRenderIcon(Keyhole)"
                    class="captcha-input"
                  />
                  <div class="captcha-image" v-html="captchaData.captcha" />
                  <div v-if="countdownNum > 0" class="refresh-icon countdown">
                    {{ countdownNum }}
                  </div>
                  <el-button
                    v-else
                    :icon="useRenderIcon(Refresh)"
                    class="refresh-icon"
                    @click="loadCaptchaData"
                  />
                </div>
              </el-form-item>
            </Motion>

            <!-- LDAP 登录选项 -->
            <Motion v-if="loginOptions.ldap.supported" :delay="250">
              <el-form-item>
                <el-radio-group
                  v-model="ruleForm.authType"
                  @change="authTypeChange"
                >
                  <el-radio value="1">标准登录</el-radio>
                  <el-radio value="2">{{
                    loginOptions.ldap.label || "LDAP"
                  }}</el-radio>
                </el-radio-group>
              </el-form-item>
            </Motion>

            <!-- 记住登录 -->
            <Motion :delay="300">
              <el-form-item>
                <div class="w-full h-[20px] flex justify-between items-center">
                  <el-checkbox v-model="checked">
                    <span class="flex">
                      <select
                        v-model="loginDay"
                        :style="{
                          width: loginDay < 10 ? '10px' : '16px',
                          outline: 'none',
                          background: 'none',
                          appearance: 'none',
                          border: 'none'
                        }"
                      >
                        <option value="1">1</option>
                        <option value="7">7</option>
                        <option value="30">30</option>
                      </select>
                      天内免登录
                    </span>
                  </el-checkbox>
                </div>
                <el-button
                  class="w-full mt-4!"
                  size="default"
                  type="primary"
                  :loading="loading"
                  :disabled="disabled"
                  @click="onLogin(ruleFormRef)"
                >
                  登录
                </el-button>
              </el-form-item>
            </Motion>
          </el-form>
        </div>
      </div>
    </div>
    <div
      class="w-full flex-c absolute bottom-3 text-sm text-[rgba(0,0,0,0.6)] dark:text-[rgba(220,220,242,0.8)]"
    >
      Copyright © 2020-present
      <a
        class="hover:text-primary!"
        href="https://github.com/iGeeky/wolf"
        target="_blank"
      >
        &nbsp;Wolf RBAC
      </a>
    </div>
  </div>
</template>

<style scoped>
@import url("@/style/login.css");
</style>

<style lang="scss" scoped>
:deep(.el-input-group__append, .el-input-group__prepend) {
  padding: 0;
}

.translation {
  ::v-deep(.el-dropdown-menu__item) {
    padding: 5px 40px;
  }

  .check-zh {
    position: absolute;
    left: 20px;
  }

  .check-en {
    position: absolute;
    left: 20px;
  }
}

.captcha-container {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 8px;

  .captcha-input {
    flex: 1;
  }

  .captcha-image {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 40px;
    background: #f5f7fa;
    border-radius: 4px;
    overflow: hidden;

    :deep(svg) {
      height: 40px;
    }
  }

  .refresh-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 4px;
    cursor: pointer;

    &.countdown {
      background: #409eff;
      color: white;
      font-size: 16px;
      font-weight: bold;
    }
  }
}
</style>
