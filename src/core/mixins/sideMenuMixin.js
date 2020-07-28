import { mapState } from 'vuex';
import get from 'lodash/get';
import { CLIENT } from '@data/constants';

export const sideMenuMixin = {
  data () {
    return {
      userFirstname: '',
    };
  },
  computed: {
    ...mapState('main', ['loggedUser']),
    companiLogo () {
      return this.interfaceType === CLIENT
        ? 'https://res.cloudinary.com/alenvi/image/upload/v1546865717/images/business/Compani/compani_texte_rose.png'
        : 'https://res.cloudinary.com/alenvi/image/upload/v1588778194/images/business/Compani/compani_texte_bordeaux.png';
    },
  },
  watch: {
    loggedUser () {
      this.userFirstname = this.setUserFirstname();
    },
  },
  created () {
    this.userFirstname = this.setUserFirstname();
  },
  methods: {
    setUserFirstname () {
      return (get(this.loggedUser, 'identity.firstname') || '').toUpperCase()
    },
    collapsibleOpening () {
      if (this.$refs[this.$route.meta.parent]) {
        this.activeRoutes[this.$route.meta.parent].open = true;
      }
    },
    collapsibleClosing (to, from) {
      if (this.$refs[from.meta.parent] && to.meta.parent !== from.meta.parent) {
        this.activeRoutes[from.meta.parent].open = false;
      }
    },
  },
};
