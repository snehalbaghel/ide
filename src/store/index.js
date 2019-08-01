/**
 * Created by abhishek on 14/06/17.
 */
'use strict'

import Vue from 'vue'
import Vuex from 'vuex'
import axios from 'axios'
import base64 from 'base-64'
import shajs from 'sha.js'
import VuexPersistence from 'vuex-persist'
import samples from '../assets/js/sample-source'
import VueClipboard from 'vue-clipboard2'
import SocialSharing from 'vue-social-sharing';
import { httpGet, httpPost } from '../utils/api'

import userModule from './user'
import firebaseModule from './firebase'

Vue.use(VueClipboard)
Vue.use(SocialSharing)
Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    code: Object.assign({}, samples),
    sampleCodes: samples,
    language: 'C++',
    languageMode: 'cpp',
    theme: 'vs-dark',
    font: 'Ubuntu Mono',
    fontSize: 16,
    showInOutBox: false,
    showSettings: false,
    customInput: '',
    customInputBuf: '', //input buffer to store customInput when toggled OFF
    output: '',
    fileName: 'download.cpp',
    isChanged: false,
    autoSave: true,
    autoSaveIntervalId: null,
    checkData: '',
    codeId: null,
    codeTitle: ''
  },
  modules: {
    user: userModule,
    firebase: firebaseModule
  },
  mutations: {
    toggleInOutBox(state) {
      state.showInOutBox = !state.showInOutBox
    },
    toogleSettings(state) {
      state.showSettings = !state.showSettings
    },
    changeLanguage(state, val) {
      const languageMode = {
        // 'C': 'c',
        'C++': 'cpp',
        'C++14': 'cpp14',
        'C#': 'csharp',
        'Java7': 'java7',
        'Java8': 'java8',
        'Python2': 'py2',
        // 'Python3': 'python',
        // 'Javascript': 'javascript',
        'Node6': 'nodejs6',
        'Node8': 'nodejs8',
        // 'Ruby': 'ruby',
      }
      const extension = {
        // 'C': '.c',
        'C++': '.cpp',
        'C++14': '.cpp',
        'C#': '.cs',
        'Java7': '.java',
        'Java8': '.java',
        'Python2': '.py',
        // 'Javascript': '.js',
        'Node6': '.js',
        'Node8': '.js',
        // 'Ruby': '.rb'
      }
      state.language = val
      state.languageMode = languageMode[state.language]
      state.fileName = `download${extension[state.language]}`
    },
    updateCode(state, val) {
      state.code[state.language] = val
    },
    setCode(state, val) {
      state.code[state.language] = val
    },
    uploadCode(state, val) {
      state.code[state.language] = val
    },
    updateOutput(state, val) {
      state.output = val
    },
    fileNameChange(state, val) {
      state.fileName = val
    },
    changeCustomInput(state, val) {
      state.customInput = val
    },
    changeTheme(state, val) {
      state.theme = val
    },
    changeFont(state, val) {
      state.font = val
    },
    changeFontSize(state, val) {
      state.fontSize = val
    },
    setCheckData(state, val = '') {
      state.checkData = shajs('sha256').update(val).digest('hex');
    },
    resetEditor(state) {
      state.theme = 'vs-dark'
      state.font = 'Ubuntu Mono'
      state.fontSize = 16
    },
    resetCode(state) {
      state.code[state.language] = samples[state.language];
      state.codeId = null
    },
    setIsChanged(state, val) {
      state.isChanged = val;
    },
    setCodeId(state, val) {
      state.codeId = val
    },
    setCodeTitle(state, val) {
      state.codeTitle = val
    }
  },
  plugins: [
    (new VuexPersistence({
      storage: window.localStorage,
      reducer: function (state) {
        const included = ['user', 'showInOutBox', 'showSettings', 'font', 'fontSize']
        console.log(state)
        return Object.keys(state)
          .filter(key => included.includes(key))
          .reduce((acc, key) => ({[key]: state[key], ...acc}), {})        
      },
      })).plugin
  ],
  actions: {
    runJs(context, {state, code, input}) {
      let jsWorker = new Worker('../../static/jsWorker.js')
      input = JSON.stringify(input)
      jsWorker.postMessage({code, input})
      return new Promise((resolve, reject) => {
        jsWorker.onmessage = function (e) {
          const output = e.data.join('\n')
          context.commit('updateOutput', output)
          if (output.match(/^Error.*$/)) {
            reject({
              result: 'complie_error'
            });
          }
          resolve({
            result: 'success',
            data: {
              testcases: [{
                result: 'success'
              }]
            }
          });
        }
      })
    },

    loadDataFromServer({state, commit, dispatch}) {
      const pasteId = state.route.params.id
      if (state.route.name !== 'saved') {
        return
      }
      return httpGet(`/code/${pasteId}`)
        .then(({data}) => {
          commit('setCodeId', data.id)
          commit('changeLanguage', data.language)
          commit('setCode', data.code)
          commit('changeCustomInput', data.customInput)
          commit('fileNameChange', data.fileName)
          commit('setCheckData', data.code),
          commit('setCodeTitle', data.title)
        })
    },
    saveDataToServer({state, commit, dispatch}) {
      if (state.checkData == shajs('sha256').update(state.code[state.language]).digest('hex'))
        return Promise.resolve({
          data: {
            id: state.codeId
          }
        });
      else {
        return httpPost(`/code`, {
          id: state.codeId || (void 0),
          language: state.language,
          code: state.code[state.language],
          customInput: state.customInput,
          fileName: state.fileName,
          title: state.codeTitle
        }).then(response => {
          const { data } = response
          commit('setCodeId', data.id)
          commit('setCheckData', data.code)
          return response
        })
      }
    },
    runCode({state, commit, dispatch}) {
      let lang = 'cpp'
      switch (state.language) {
        case 'C++14':
          lang = 'cpp14';
          break
        case 'C#':
          lang = 'csharp';
          break
        // case 'Javascript':
          // lang = 'jsv';
          // break
        case 'Java7':
          lang = 'java7';
          break
        case 'Java8':
          lang = 'java8';
          break
        case 'Python2':
          lang = 'py2';
          break
        // case 'Python3':
          // lang = 'py3';
          // break
        case 'Node6':
          lang = 'nodejs6';
          break
        case 'Node8':
          lang = 'nodejs8';
          break
        // case 'Ruby':
        //   lang = 'ruby';
        //   break;
      }

      // if (lang === 'jsv') {
        // return dispatch('runJs', {
          // state: state,
          // code: state.code[state.language],
          // input: state.customInput
        // });
      // }

      return httpPost('/run/run', {
        lang,
        source: base64.encode(state.code[state.language]),
        input: [base64.encode(state.customInput)]
      })
        .then(({data}) => {
          const output = data.status == 'error' ? data.output.stderr : data.output.stdout
          commit('updateOutput', base64.decode(output))
          return data;
        })
    }
  }
})
