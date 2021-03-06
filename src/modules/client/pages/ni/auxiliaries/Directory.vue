<template>
  <q-page class="client-background" padding>
    <ni-directory-header title="Répertoire auxiliaires" toggle-label="Actifs" :toggle-value="activeUsers" display-toggle
      @update-search="updateSearch" @toggle="activeUsers = !activeUsers" :search="searchStr" />
    <ni-table-list :data="filteredUsers" :columns="columns" :loading="tableLoading" :pagination.sync="pagination"
      @go-to="goToUserProfile" :rows-per-page="[15, 50, 100, 200]">
      <template #body="{ props, col }">
        <q-item v-if="col.name === 'name'">
          <q-item-section avatar>
            <img class="avatar" :src="getAvatar(col.value.picture)">
          </q-item-section>
          <q-item-section>{{ col.value.fullName }}</q-item-section>
        </q-item>
        <template v-else-if="col.name === 'profileErrors'">
          <q-icon v-if="notifications.profiles[props.row.auxiliary._id] && props.row.isActive" name="error"
            color="secondary" size="1rem" />
        </template>
        <template v-else-if="col.name === 'active'">
          <div :class="{ 'dot dot-active': col.value, 'dot dot-error': !col.value }" />
        </template>
        <template v-else>{{ col.value }}</template>
      </template>
    </ni-table-list>
    <q-btn class="fixed fab-custom" no-caps rounded color="primary" icon="add" label="Ajouter une personne"
      @click="auxiliaryCreationModal = true" :disable="tableLoading" />

    <auxiliary-creation-modal v-model="auxiliaryCreationModal" :new-user.sync="newUser"
      :validations="$v.newUser" :company-id="company._id" :loading="loading" :email-error="emailError($v.newUser)"
      :first-step="firstStep" :send-welcome-msg.sync="sendWelcomeMsg" :civility-options="civilityOptions"
      @hide="resetForm" @submit="submit" @go-to-next-step="nextStep" />
  </q-page>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import get from 'lodash/get';
import set from 'lodash/set';
import cloneDeep from 'lodash/cloneDeep';
import orderBy from 'lodash/orderBy';
import escapeRegExp from 'lodash/escapeRegExp';
import Roles from '@api/Roles';
import Sms from '@api/Sms';
import Users from '@api/Users';
import Authentication from '@api/Authentication';
import TableList from '@components/table/TableList';
import DirectoryHeader from '@components/DirectoryHeader';
import { NotifyPositive, NotifyNegative, NotifyWarning } from '@components/popup/notify';
import { DEFAULT_AVATAR, AUXILIARY, AUXILIARY_ROLES, REQUIRED_LABEL, CIVILITY_OPTIONS, HR_SMS } from '@data/constants';
import { formatIdentity, formatPhoneForPayload, removeDiacritics, sortStrings } from '@helpers/utils';
import { formatDate, ascendingSort } from '@helpers/date';
import { userMixin } from '@mixins/userMixin';
import { validationMixin } from '@mixins/validationMixin';
import AuxiliaryCreationModal from 'src/modules/client/components/auxiliary/AuxiliaryCreationModal';
import { userProfileValidation } from 'src/modules/client/helpers/userProfileValidation';

export default {
  metaInfo: { title: 'Répertoire auxiliaires' },
  name: 'Directory',
  components: {
    'ni-directory-header': DirectoryHeader,
    'ni-table-list': TableList,
    'auxiliary-creation-modal': AuxiliaryCreationModal,
  },
  mixins: [validationMixin, userMixin],
  data () {
    return {
      tableLoading: false,
      loading: false,
      auxiliaryCreationModal: false,
      firstStep: true,
      fetchedUser: {},
      sendWelcomeMsg: true,
      civilityOptions: CIVILITY_OPTIONS.filter(opt => opt.value !== 'couple'),
      defaultNewUser: {
        identity: {
          lastname: '',
          firstname: '',
          title: '',
        },
        contact: {
          address: { fullAddress: '' },
          phone: '',
        },
        local: { email: '' },
        sector: '',
        administrative: {
          transportInvoice: { transportType: 'public' },
        },
      },
      newUser: null,
      userList: [],
      searchStr: '',
      activeUsers: true,
      pagination: { sortBy: 'startDate', descending: true, page: 1, rowsPerPage: 15 },
      columns: [
        {
          name: 'name',
          label: 'Nom',
          field: row => row.auxiliary,
          align: 'left',
          sortable: true,
          sort: (a, b) => sortStrings(a.lastname, b.lastname),
          style: 'min-width: 200px; width: 35%',
        },
        {
          name: 'profileErrors',
          label: 'Infos',
          align: 'left',
          sortable: true,
          style: 'min-width: 75px; width: 8%',
        },
        {
          name: 'startDate',
          label: 'Depuis le...',
          field: 'startDate',
          align: 'left',
          sortable: true,
          format: formatDate,
          sort: ascendingSort,
          style: 'min-width: 110px; width: 15%',
        },
        {
          name: 'hiringDate',
          label: 'Embauche',
          field: 'hiringDate',
          align: 'left',
          sortable: true,
          format: formatDate,
          sort: ascendingSort,
          style: 'min-width: 110px; width: 15%',
        },
        {
          name: 'team',
          label: 'Équipe',
          field: 'sector',
          align: 'left',
          sortable: true,
          style: 'min-width: 100px; width: 15%',
        },
        {
          name: 'active',
          label: 'Actif',
          field: 'isActive',
          align: 'center',
          sortable: false,
          style: 'min-width: 30px; width: 4%',
        },
      ],
      REQUIRED_LABEL,
    };
  },
  validations () { return { newUser: this.userValidation }; },
  async created () {
    this.newUser = cloneDeep(this.defaultNewUser);
    await this.getUserList();
  },
  computed: {
    ...mapState('userProfile', ['notifications']),
    ...mapGetters({ company: 'main/getCompany' }),
    activeUserList () {
      if (this.activeUsers) return this.userList.filter(user => user.isActive);
      return this.userList.filter(user => !user.isActive);
    },
    filteredUsers () {
      const formattedString = escapeRegExp(removeDiacritics(this.searchStr));
      return this.activeUserList
        .filter(user => user.auxiliary.noDiacriticsName.match(new RegExp(formattedString, 'i')));
    },
  },
  methods: {
    updateSearch (value) {
      this.searchStr = value;
    },
    getHiringDate (user) {
      if (!user.contracts || user.contracts.length === 0) return null;
      if (user.contracts.length === 1) return user.contracts[0].startDate;
      return orderBy(user.contracts, ['startDate'], ['asc'])[0].startDate;
    },
    formatUser (user) {
      const hiringDate = this.getHiringDate(user);
      const formattedName = formatIdentity(user.identity, 'FL');

      const formattedUser = {
        auxiliary: {
          _id: user._id,
          fullName: formattedName,
          lastname: user.identity.lastname,
          picture: user.picture ? user.picture.link : null,
          noDiacriticsName: removeDiacritics(formattedName),
        },
        startDate: user.createdAt,
        sector: user.sector ? user.sector.name : 'N/A',
        isActive: user.isActive,
        hiringDate,
      };

      if (!user.isActive) return formattedUser;

      const checkProfileErrors = userProfileValidation(user);
      this.$store.dispatch(
        'userProfile/setNotification',
        { type: 'profiles', _id: user._id, exists: !!checkProfileErrors.error }
      );

      return { ...formattedUser, profileErrors: checkProfileErrors.error };
    },
    async getUserList () {
      try {
        this.tableLoading = true;
        const users = await Users.list({ role: AUXILIARY_ROLES, company: this.company._id });
        this.userList = Object.freeze(users.map(this.formatUser)); // for perf
      } catch (e) {
        console.error(e);
      } finally {
        this.tableLoading = false;
      }
    },
    goToUserProfile (row) {
      this.$router.push({ name: 'ni auxiliaries info', params: { auxiliaryId: row.auxiliary._id } });
    },
    resetForm () {
      this.$v.newUser.$reset();
      this.newUser = cloneDeep(this.defaultNewUser);
      this.firstStep = true;
      this.fetchedUser = {};
    },
    async formatUserPayload () {
      const roles = await Roles.list({ name: AUXILIARY });
      if (roles.length === 0) throw new Error('Role not found');

      const payload = {
        ...cloneDeep(this.newUser),
        local: { email: this.newUser.local.email },
        contact: { ...this.newUser.contact, phone: formatPhoneForPayload(get(this.newUser, 'contact.phone')) },
        role: roles[0]._id,
      };
      if (!get(payload, 'contact.address.fullAddress')) delete payload.contact.address;

      return payload;
    },
    async sendSMS (user) {
      try {
        if (!this.company.tradeName) {
          return NotifyNegative('Veuillez renseigner votre nom commercial dans la page de configuration.');
        }

        const passwordToken = await Authentication.createPasswordToken(user._id, { email: user.local.email });
        await Sms.send({
          tag: HR_SMS,
          recipient: `+33${user.contact.phone.substring(1)}`,
          content: `${this.company.name}. Bienvenue ! :)\nPour pouvoir `
            + 'commencer ton enregistrement sur Compani avant ton intégration, crée ton mot de passe en suivant ce '
            + `lien : ${location.protocol}//${location.hostname}${(location.port ? `:${location.port}` : '')}`
            + `/reset-password/${passwordToken.token} :-)\n`
            + 'Par la suite pour te connecter suis ce lien: '
            + `${location.protocol}//${location.hostname}${(location.port ? `:${location.port}` : '')}.`,
        });

        NotifyPositive('SMS bien envoyé.');
      } catch (e) {
        console.error(e);
        if (e.status === 400) return NotifyNegative('Le numéro entré ne recoit pas les SMS.');
        NotifyNegative('Erreur lors de l\'envoi de SMS.');
      }
    },
    fillNewUser (user) {
      const paths = [
        'identity.lastname',
        'identity.firstname',
        'identity.title',
        'contact.adresse.fullAddress',
        'contact.phone',
        'sector',
      ];
      paths.forEach((path) => {
        const value = get(user, path);
        if (value) set(this.newUser, path, value);
      });
      if (!user.company) this.newUser.company = this.company._id;
    },
    async nextStep () {
      try {
        this.$v.newUser.$touch();
        if (this.$v.newUser.local.email.$error) return NotifyWarning('Champ(s) invalide(s).');

        this.loading = true;
        const userExistsInfo = await Users.exists({ email: this.newUser.local.email });

        if (userExistsInfo.exists) {
          const hasPermissionOnUserInfo = !!userExistsInfo.user._id;
          const userHasValidCompany = !get(userExistsInfo, 'user.company') ||
             get(userExistsInfo, 'user.company') === this.company._id;
          const userHasClientRole = !!get(userExistsInfo, 'user.role.client');

          if (hasPermissionOnUserInfo && userHasValidCompany && !userHasClientRole) {
            this.fetchedUser = await Users.getById(userExistsInfo.user._id);
            this.fillNewUser(this.fetchedUser);
          } else {
            const otherCompanyEmail = !userHasValidCompany || !hasPermissionOnUserInfo;
            if (otherCompanyEmail) return NotifyNegative('Email relié à une autre structure.');
            if (userHasClientRole) return NotifyNegative('Email déjà existant.');
          }
        }

        this.firstStep = false;
        this.$v.newUser.$reset();
      } catch (e) {
        NotifyNegative('Erreur lors de la création de la fiche auxiliaire.');
      } finally {
        this.loading = false;
      }
    },
    async submit () {
      let editedUser = {};
      try {
        this.loading = true;
        this.$v.newUser.$touch();
        const isValid = await this.waitForFormValidation(this.$v.newUser);
        if (!isValid) return NotifyWarning('Champ(s) invalide(s)');

        const folderId = get(this.company, 'auxiliariesFolderId');
        if (!folderId) return NotifyNegative('Erreur lors de la création de la fiche auxiliaire.');

        const payload = await this.formatUserPayload();

        if (this.fetchedUser._id) {
          await Users.updateById(this.fetchedUser._id, payload);
          editedUser = { ...this.fetchedUser, contact: { phone: get(payload, 'contact.phone') || '' } };
        } else {
          editedUser = await Users.create(payload);
        }
        await Users.createDriveFolder(editedUser._id);
        await this.getUserList();
        NotifyPositive('Fiche auxiliaire créée');

        this.auxiliaryCreationModal = false;

        if (this.sendWelcomeMsg) await this.sendSMS(editedUser);
      } catch (e) {
        console.error(e);
        if (e.status === 409) return NotifyNegative('Email déjà existant.');
        NotifyNegative('Erreur lors de la création de la fiche auxiliaire.');
      } finally {
        this.loading = false;
      }
    },
    getAvatar (link) {
      return link || DEFAULT_AVATAR;
    },
  },
};
</script>
<style lang="stylus" scoped>
  .dot
    margin: 0px;
</style>
