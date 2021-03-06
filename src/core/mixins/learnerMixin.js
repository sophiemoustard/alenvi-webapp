import {
  AUXILIARY,
  HELPER,
  COACH,
  PLANNING_REFERENT,
  AUXILIARY_WITHOUT_COMPANY,
  CLIENT_ADMIN,
  VENDOR_ADMIN,
  TRAINING_ORGANISATION_MANAGER,
  TRAINER,
} from '@data/constants';

export const learnerMixin = {
  methods: {
    getRoleLabel (role) {
      switch (role) {
        case HELPER:
          return 'Aidant';
        case AUXILIARY:
        case PLANNING_REFERENT:
        case AUXILIARY_WITHOUT_COMPANY:
          return 'Auxiliaire';
        case CLIENT_ADMIN:
          return 'Administrateur';
        case VENDOR_ADMIN:
          return 'Administrateur Vendeur';
        case COACH:
          return 'Coach';
        case TRAINING_ORGANISATION_MANAGER:
          return 'Responsable Formation';
        case TRAINER:
          return 'Formateur';
        default:
          return '';
      }
    },
  },
};
