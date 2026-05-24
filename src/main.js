import { createApp } from 'vue'
import App from './App.vue'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#6D4C41',
          secondary: '#8D6E63',
          accent: '#FFB300',
          background: '#F8F3EA',
          surface: '#FFFDF8'
        }
      }
    }
  }
})

createApp(App).use(vuetify).mount('#app')
