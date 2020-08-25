import { mapGetters } from 'vuex';
import has from 'lodash/has';
import pickBy from 'lodash/pickBy';
import pick from 'lodash/pick';
import omit from 'lodash/omit';
import get from 'lodash/get';
import Roles from '@api/Roles';
import Users from '@api/Users';
import Email from '@api/Email';
import { NotifyNegative, NotifyPositive, NotifyWarning } from '@components/popup/notify';
import { clear, formatPhone, formatPhoneForPayload } from '@helpers/utils';
import { HELPER } from '@data/constants';

export const helperMixin = {
  data () {
    return {
      openNewHelperModal: false,
      openEditedHelperModal: false,
      newHelper: {
        identity: { lastname: '', firstname: '' },
        local: { email: '' },
        contact: { phone: '' },
      },
      editedHelper: {
        identity: { lastname: '', firstname: '' },
        local: { email: '' },
        contact: { phone: '' },
      },
      helpers: [],
      helpersColumns: [
        { name: 'firstname', label: 'Prénom', align: 'left', field: row => row.identity.firstname },
        { name: 'lastname', label: 'Nom', align: 'left', field: row => row.identity.lastname },
        { name: 'email', label: 'Email', align: 'left', field: row => get(row, 'local.email') || '' },
        {
          name: 'phone',
          label: 'Téléphone',
          align: 'left',
          field: row => get(row, 'contact.phone') || '',
          format: value => formatPhone(value),
        },
        {
          name: 'startDate',
          label: 'Depuis le...',
          field: 'createdAt',
          align: 'left',
          format: value => this.$moment(value).format('DD/MM/YYYY'),
          sort: (a, b) => (this.$moment(a).toDate()) - (this.$moment(b).toDate()),
        },
        { name: 'actions', label: '', align: 'left', field: '_id' },
      ],
      helpersPagination: { rowsPerPage: 0 },
      helpersLoading: false,
    };
  },
  computed: {
    ...mapGetters({ company: 'main/getCompany' }),
    sortedHelpers () {
      return [...this.helpers]
        .sort((u1, u2) => (u1.identity.lastname || '').localeCompare((u2.identity.lastname || '')));
    },
    acceptedByHelper () {
      if (this.lastSubscriptionHistory && this.customer.subscriptionsAccepted) {
        const approvalDate = this.$moment(this.lastSubscriptionHistory.approvalDate).format('DD/MM/YYYY');
        return `le ${approvalDate} par ${this.acceptedBy}`;
      }
    },
  },
  methods: {
    // Refresh
    async getUserHelpers () {
      try {
        this.helpersLoading = true;
        const params = { customers: this.customer._id };
        if (has(this.company, '_id')) params.company = this.company._id;
        this.helpers = await Users.list(params);
      } catch (e) {
        this.helpers = [];
        console.error(e);
      } finally {
        this.helpersLoading = false;
      }
    },
    // Creation
    resetAddHelperForm () {
      this.$v.newHelper.$reset();
      this.newHelper = { ...clear(this.newHelper) };
      this.firstStep = true;
    },
    resetEditedHelperForm () {
      this.$v.editedHelper.$reset();
      this.editedHelper = { ...clear(this.editedHelper) };
      this.openEditedHelperModal = false;
    },
    async formatHelper () {
      const roles = await Roles.list({ name: HELPER });
      if (roles.length === 0) throw new Error('Role not found');

      const payload = {
        local: { email: this.newHelper.local.email },
        customers: [this.customer._id],
        role: roles[0]._id,
        identity: pickBy(this.newHelper.identity),
      };

      let phone = get(this.newHelper, 'contact.phone', null);
      if (phone) {
        phone = formatPhoneForPayload(phone);
        payload.contact = { phone };
        this.newHelper.contact.phone = phone;
      }

      return pickBy(payload);
    },
    async createHelper () {
      try {
        this.loading = true;
        this.$v.newHelper.$touch();
        if (this.$v.newHelper.$error) return NotifyWarning('Champ(s) invalide(s)');

        const payload = await this.formatHelper();
        await Users.create(pickBy(payload));
        NotifyPositive('Aidant créé');
        await this.getUserHelpers();
        this.openNewHelperModal = false;

        await this.sendWelcome();
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la création de l\'aidant.');
      } finally {
        this.loading = false;
      }
    },
    async sendWelcome () {
      try {
        await Email.sendWelcome({ email: this.newHelper.local.email, type: HELPER });
        NotifyPositive('Email envoyé');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de l\'envoi du mail.');
      }
    },
    async nextStep () {
      try {
        this.loading = true;
        this.$v.newHelper.local.email.$touch();
        if (this.$v.newHelper.local.email.$error) return NotifyWarning('Champs invalides');

        const userInfo = await Users.exists({ email: this.newHelper.local.email });
        const { user } = userInfo;

        const sameOrNoCompany = !user.company || user.company === this.company._id;
        if (userInfo.exists && (get(user, 'role.client') || !sameOrNoCompany)) {
          NotifyNegative('Utilisateur déjà existant');
        } else if (userInfo.exists) {
          const roles = await Roles.list({ name: HELPER });
          if (roles.length === 0) throw new Error('Role not found');
          const payload = { role: roles[0]._id, customers: [this.customer._id] };
          if (!user.company) payload.company = this.customer.company;

          await Users.updateById(user._id, payload);
          NotifyPositive('Aidant créé');

          this.getUserHelpers();
          this.openNewHelperModal = false;
        } else {
          this.firstStep = false;
        }
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la création de l\'aidant');
      } finally {
        this.loading = false;
      }
    },
    async editHelper () {
      try {
        this.loading = true;
        this.$v.editedHelper.$touch();
        if (this.$v.editedHelper.$error) return NotifyWarning('Champ(s) invalide(s)');

        if (get(this.editedHelper, 'contact.phone')) {
          this.editedHelper.contact.phone = formatPhoneForPayload(this.editedHelper.contact.phone);
        }
        const payload = { ...omit(this.editedHelper, ['_id']) };
        delete payload.local;
        await Users.updateById(this.editedHelper._id, payload);
        NotifyPositive('Aidant modifié');

        await this.getUserHelpers();
        this.openEditedHelperModal = false;
      } catch (e) {
        NotifyNegative('Erreur lors de la modification de l\'aidant.');
      } finally {
        this.loading = false;
      }
    },
    openEditionModalHelper (helperId) {
      const helper = this.helpers.find(h => h._id === helperId);
      this.editedHelper = {
        ...pick(helper, ['_id', 'local.email', 'identity.firstname', 'identity.lastname']),
        contact: { phone: get(helper, 'contact.phone') || '' },
      };
      this.openEditedHelperModal = true;
    },
    async deleteHelper (helperId) {
      try {
        await Users.deleteById(helperId);
        await this.getUserHelpers();
        NotifyPositive('Aidant supprimé');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la suppression de l\'aidant.');
      }
    },
    validateHelperDeletion (helperId) {
      this.$q.dialog({
        title: 'Confirmation',
        message: 'Es-tu sûr(e) de vouloir supprimer cet aidant ?',
        ok: true,
        cancel: 'Annuler',
      }).onOk(() => this.deleteHelper(helperId))
        .onCancel(() => NotifyPositive('Suppression annulée.'));
    },
  },
};
