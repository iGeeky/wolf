import Vue from 'vue'
import VueI18n from 'vue-i18n'
import messages from './langs'
Vue.use(VueI18n)
// load language from localStorage
const i18n = new VueI18n({
  locale: localStorage.lang || 'en', // default language is en
  messages,
})

export default i18n
