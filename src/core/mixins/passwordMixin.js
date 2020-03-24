import { minLength, maxLength } from 'vuelidate/lib/validators'
import { REQUIRED_LABEL } from '@data/constants'
import { validPassword } from '@helpers/vuelidateCustomVal.js'

export const passwordMixin = {
  data () {
    return {
      passwordValidation: {
        validPassword,
        minLength: minLength(8),
        maxLength: maxLength(128),
      },
    }
  },
  computed: {
    passwordError () {
      if (this.$v.user.local.password.required === false) return REQUIRED_LABEL;
      if (!this.$v.user.credentials.password.minLength || !this.$v.user.credentials.password.minLength) {
        return 'Le mot de passe doit contenir au minimum 8 caractères.';
      }
      if (!this.$v.user.credentials.password.validPassword) {
        return 'Le mot de passe doit contenir au moins un chiffre, une majuscule, une minuscule, un caractère spécial(ex: !@#$%^&)'
      }
      return ''
    },
  },
  methods: {
    passwordConfirmError (validationObj) {
      if (!validationObj.required) return REQUIRED_LABEL;
      else if (!validationObj.sameAs) return 'Le mot de passe doit être identique';
      return 'Mot de passe invalide';
    },
  },
}
